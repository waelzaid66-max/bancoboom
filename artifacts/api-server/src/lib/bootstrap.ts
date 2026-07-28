import { db, ensureSchemaPatches } from "@workspace/db";
import { listings } from "@workspace/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Ensures required PostgreSQL extensions exist. Idempotent and safe to call on
 * every boot. `pg_trgm` powers in-database trigram similarity used by duplicate
 * detection in NormalizationService — without it `similarity()` errors at runtime.
 *
 * NON-FATAL: a failure here (DB briefly unreachable on boot, or the deploy DB
 * role lacking CREATE EXTENSION) must NOT prevent the server from binding its
 * port. Liveness is not DB-readiness — readiness is reported separately by
 * routes/health.ts (/readyz → 503 when the DB is down). Previously a rejection
 * here aborted boot via process.exit(1), so the port never opened and the deploy
 * was killed ("port never opened"). We now log and continue; trigram-based
 * duplicate detection degrades gracefully until the extension/DB is available.
 */
export async function ensureDbExtensions(): Promise<void> {
  try {
    await ensureSchemaPatches();
  } catch (err) {
    logger.error({ err }, "ensureSchemaPatches failed; continuing boot");
  }

  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  } catch (err) {
    logger.error(
      { err },
      "ensureDbExtensions failed; continuing so the server still binds its port",
    );
  }
  await ensureSearchIndexes();
}

/**
 * Auto-seeds the database when it is empty so the marketplace feed is never
 * blank on a fresh environment or after a reset.
 *
 * The check is a single COUNT query — fast and non-blocking. If active listings
 * are found the function returns immediately (no-op). If the table is empty it
 * spawns the full seed as a child process so the event loop stays free and the
 * server continues serving health-checks during the seed run.
 *
 * NON-FATAL: any failure (DB unreachable, tsx missing) is logged and swallowed
 * so a seed error never prevents the server from starting.
 */
export async function ensureSeedData(): Promise<void> {
  try {
    const [row] = await db
      .select({ n: count() })
      .from(listings)
      .where(eq(listings.status, "active"));
    const total = Number(row?.n ?? 0);

    if (total > 0) {
      logger.info({ total }, "ensureSeedData: DB already populated, skipping auto-seed");
      return;
    }

    logger.warn("ensureSeedData: no active listings found — running seed to populate the feed");

    // Use `pnpm run seed` rather than resolving a path to seed.ts so this
    // works identically from the source (tsx) AND the compiled dist/ runtime.
    // `process.cwd()` is the api-server package directory when the server is
    // started via `pnpm --filter @workspace/api-server run dev/start`.
    const { execFile } = await import("node:child_process");

    await new Promise<void>((resolve) => {
      const child = execFile(
        "pnpm",
        ["run", "seed"],
        { cwd: process.cwd(), timeout: 300_000 },
        (err, _stdout, stderr) => {
          if (err) {
            logger.error({ err, stderr }, "ensureSeedData: seed process failed");
          } else {
            logger.info("ensureSeedData: seed complete — feed is now populated");
          }
          resolve();
        },
      );
      child.stdout?.on("data", (d: Buffer) => process.stdout.write(d));
      child.stderr?.on("data", (d: Buffer) => process.stderr.write(d));
    });
  } catch (err) {
    logger.error({ err }, "ensureSeedData: unexpected error; server continues without seeding");
  }
}

/**
 * Large-catalog search acceleration. GIN trigram indexes let the EXISTING
 * `ILIKE '%term%'` predicates on title/description use an index scan instead of
 * a sequential scan — the query text (and therefore result semantics/relevance)
 * is completely unchanged; only the plan gets faster as the catalog grows.
 *
 * Idempotent (IF NOT EXISTS → no-op after first boot) and CONCURRENTLY so a boot
 * on a large live table never blocks writers. Requires pg_trgm (created above);
 * each statement is individually non-fatal for the same liveness reason.
 */
async function ensureSearchIndexes(): Promise<void> {
  const statements = [
    sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_title_trgm ON listings USING gin (title gin_trgm_ops)`,
    sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_description_trgm ON listings USING gin (description gin_trgm_ops)`,
    // Reference dataset (geo/real-estate) fuzzy search: a trigram index on the
    // denormalised search_blob gives partial / typo-tolerant / multilingual
    // suggestions in one index scan, scaling to tens of millions of rows.
    // IF NOT EXISTS makes it a no-op once created; a missing table (before the
    // first `drizzle-kit push`) is caught below and retried on the next boot.
    sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reference_places_blob_trgm ON reference_places USING gin (search_blob gin_trgm_ops)`,
    sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reference_developers_blob_trgm ON reference_developers USING gin (search_blob gin_trgm_ops)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      logger.error({ err }, "ensureSearchIndexes: index creation failed; search stays correct (ILIKE) but unaccelerated");
    }
  }
}
