/**
 * Durable abuse-detection primitives, backed by PostgreSQL (`rate_events` /
 * `dedup_keys`). Unlike a per-process map, this state survives a restart and is
 * shared across instances — so a crash/redeploy can no longer reset an abuser's
 * rate-limit or dedup budget. The window/dedup semantics are identical to the
 * previous in-memory implementation; only the storage moved.
 *
 * Every counter/store is namespaced (`counter_name` / `store_name`) so the two
 * shared tables can host many independent limiters without their keys colliding.
 */
import { db } from "@workspace/db";
import { rateEvents, dedupKeys } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

/* ── Background prune ──────────────────────────────────────
 * Rows older than the longest registered window/ttl are dead weight (every
 * query already filters by its own window). A single shared sweeper deletes
 * them so the tables stay bounded — the durable replacement for the old
 * in-memory size caps. Retain 2× the longest window for safety.
 */
let maxWindowMs = 0;
let maxTtlMs = 0;
let pruneStarted = false;
const PRUNE_INTERVAL_MS = 10 * 60_000;

function ensurePrune(): void {
  if (pruneStarted) return;
  pruneStarted = true;
  const timer = setInterval(() => {
    void prune();
  }, PRUNE_INTERVAL_MS);
  // Never keep the process alive just to prune.
  timer.unref?.();
}

/** Delete events/dedup rows older than 2× the longest registered window. */
export async function prune(): Promise<void> {
  try {
    if (maxWindowMs > 0) {
      const secs = (maxWindowMs * 2) / 1000;
      await db
        .delete(rateEvents)
        .where(sql`${rateEvents.eventAt} < now() - make_interval(secs => ${secs}::double precision)`);
    }
    if (maxTtlMs > 0) {
      const secs = (maxTtlMs * 2) / 1000;
      await db
        .delete(dedupKeys)
        .where(sql`${dedupKeys.seenAt} < now() - make_interval(secs => ${secs}::double precision)`);
    }
  } catch (err) {
    // Best-effort housekeeping — never throw into the caller.
  }
}

/**
 * A durable sliding-window event counter keyed by an arbitrary string (ip,
 * device, user, session). `hit` records an event and returns the number of
 * events for that key within the last `windowMs` (including the one just
 * recorded — matching the previous in-memory semantics). `count` answers the
 * same question without recording. Both are async (they touch the DB).
 */
export class SlidingWindowCounter {
  constructor(
    private readonly name: string,
    private readonly windowMs: number,
  ) {
    if (windowMs > maxWindowMs) maxWindowMs = windowMs;
    ensurePrune();
  }

  /** Record an event for `key` and return the count within the window. */
  async hit(key: string): Promise<number> {
    await db.insert(rateEvents).values({ counterName: this.name, bucketKey: key });
    return this.count(key);
  }

  /** Count events within the window without recording a new one. */
  async count(key: string): Promise<number> {
    const secs = this.windowMs / 1000;
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(rateEvents)
      .where(
        and(
          eq(rateEvents.counterName, this.name),
          eq(rateEvents.bucketKey, key),
          sql`${rateEvents.eventAt} > now() - make_interval(secs => ${secs}::double precision)`,
        ),
      );
    return Number(row?.c ?? 0);
  }
}

/**
 * A durable last-seen-timestamp store for deduplication ("has this key been
 * seen within the last `ttlMs`?"). The decision is made in a single atomic
 * `INSERT … ON CONFLICT DO UPDATE … WHERE seen_at < cutoff RETURNING`:
 *  - a row is returned  → inserted (new) or refreshed (expired) → NOT a dup
 *  - no row is returned → an unexpired row already existed       → IS a dup
 * This preserves the in-memory semantics (a duplicate does not slide the TTL
 * forward; only a new/expired key records `now()`), and is race-safe under
 * concurrent callers.
 */
export class DedupStore {
  constructor(
    private readonly name: string,
    private readonly ttlMs: number,
  ) {
    if (ttlMs > maxTtlMs) maxTtlMs = ttlMs;
    ensurePrune();
  }

  /**
   * Returns true if `key` was seen within the TTL (i.e. this is a duplicate),
   * otherwise records `key` as seen now and returns false.
   */
  async isDuplicate(key: string): Promise<boolean> {
    const secs = this.ttlMs / 1000;
    const result = await db.execute<{ dedup_key: string }>(sql`
      INSERT INTO dedup_keys (store_name, dedup_key, seen_at)
      VALUES (${this.name}, ${key}, now())
      ON CONFLICT (store_name, dedup_key)
      DO UPDATE SET seen_at = now()
      WHERE dedup_keys.seen_at < now() - make_interval(secs => ${secs}::double precision)
      RETURNING dedup_key
    `);
    const affected = result.rowCount ?? result.rows.length;
    return affected === 0;
  }
}
