/**
 * Backfill the price-observation ledger from EXISTING real listings, so market
 * insights and deal ratings have real history from day one instead of starting
 * empty. Every point comes from a real listing at its real price and time — no
 * fabrication. Idempotent (upsert by listing+source), safe to re-run.
 *
 *   pnpm --filter @workspace/api-server run backfill:observations
 */
import { db } from "@workspace/db";
import { listings, listingAttributes } from "@workspace/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { recordPriceObservation } from "./services/MarketInsightsService";

async function main(): Promise<void> {
  console.log("[backfill:observations] scanning existing listings…");
  const rows = await db
    .select({
      id: listings.id,
      category: listings.category,
      price: listings.basePriceCash,
      location: listings.location,
      isRequest: listings.isRequest,
      status: listings.status,
      createdAt: listings.createdAt,
      specs: listingAttributes.specs,
    })
    .from(listings)
    .leftJoin(listingAttributes, eq(listingAttributes.listingId, listings.id))
    .where(
      and(
        eq(listings.isRequest, false),
        // Real market signals only: live inventory + confirmed sales.
        inArray(listings.status, ["active", "sold"]),
      ),
    );

  let recorded = 0;
  for (const r of rows) {
    const price = Number(r.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    await recordPriceObservation({
      listingId: r.id,
      category: r.category as "car" | "real_estate" | "industrial",
      priceCash: price,
      specs: (r.specs as Record<string, unknown>) ?? {},
      location: r.location,
      source: "backfill",
      observedAt: r.createdAt ?? undefined,
    });
    recorded += 1;
  }
  console.log(`[backfill:observations] recorded ${recorded} observations from ${rows.length} listings.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill:observations] FAILED", err);
    process.exit(1);
  });
