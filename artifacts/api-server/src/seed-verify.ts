/**
 * seed:verify — confirms the marketplace database is populated.
 *
 * Exits 0 with a summary when the feed has content.
 * Exits 1 with a clear message when the DB is empty so CI / devs know to run seed.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run seed:verify
 */

import { db } from "@workspace/db";
import { listings, users, locations, brands } from "@workspace/db/schema";
import { eq, count, sql } from "drizzle-orm";

async function verify() {
  const [totalRow] = await db
    .select({ n: count() })
    .from(listings)
    .where(eq(listings.status, "active"));

  const total = Number(totalRow?.n ?? 0);

  if (total === 0) {
    console.error("❌ Database is empty — no active listings found.");
    console.error("   Run: pnpm --filter @workspace/api-server run seed");
    process.exit(1);
  }

  // Per-category breakdown.
  const byCategory = await db
    .select({ category: listings.category, n: count() })
    .from(listings)
    .where(eq(listings.status, "active"))
    .groupBy(listings.category);

  const [userRow] = await db.select({ n: count() }).from(users);
  const [locRow] = await db.select({ n: count() }).from(locations);
  const [brandRow] = await db.select({ n: count() }).from(brands);

  console.log("✅ Seed verified — database is populated\n");
  console.log(`   Active listings : ${total}`);
  for (const row of byCategory) {
    const pad = " ".repeat(Math.max(0, 16 - (row.category?.length ?? 0)));
    console.log(`     ${row.category ?? "unknown"}${pad}: ${row.n}`);
  }
  console.log(`   Users           : ${userRow?.n ?? 0}`);
  console.log(`   Locations       : ${locRow?.n ?? 0}`);
  console.log(`   Car brands      : ${brandRow?.n ?? 0}`);

  // Sanity: warn if any category is suspiciously under-populated.
  // Thresholds reflect the verified post-seed counts (see SEED_RUNBOOK.md):
  //   car=25, real_estate=15, industrial=18 (12 main + 6 B2B)
  const EXPECTED: Record<string, number> = { car: 20, real_estate: 10, industrial: 10 };
  let warned = false;
  for (const [cat, min] of Object.entries(EXPECTED)) {
    const row = byCategory.find((r) => r.category === cat);
    if (!row || Number(row.n) < min) {
      console.warn(`\n⚠️  Category "${cat}" has fewer than ${min} active listing(s). Re-run seed.`);
      warned = true;
    }
  }

  // Total active listing floor (52 main + 6 B2B = 58 after a full seed).
  const TOTAL_MIN = 50;
  if (total < TOTAL_MIN) {
    console.warn(`\n⚠️  Only ${total} active listings found (expected ≥${TOTAL_MIN}). Re-run seed.`);
    warned = true;
  }

  if (warned) process.exit(1);
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Verify failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
