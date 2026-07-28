/**
 * Production seed for car MODELS (2026) — real popular models per brand.
 *
 * Enriches the existing `models` table in place. For each brand (resolved by
 * slug from `brands`), it upserts every model by
 * slug = slugify("<brandName>-<modelName>") — matching the current seed
 * convention — so models already present are kept and the rest are added, with
 * ZERO duplication and no API/business-logic change. Pure cars data; no section
 * mixing.
 *
 *   pnpm --filter @workspace/api-server run seed:car-models
 * (Run AFTER seed:car-brands so the brands exist.)
 */
import { db } from "@workspace/db";
import { brands, models } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "./lib/fuzzy";
import { CAR_MODELS } from "./reference/car-models";

async function main(): Promise<void> {
  console.log("[seed:car-models] upserting car models…");
  let upserted = 0;
  let skippedBrands = 0;

  for (const [brandSlug, list] of Object.entries(CAR_MODELS)) {
    const [brand] = await db
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(eq(brands.slug, brandSlug))
      .limit(1);
    if (!brand) {
      // Brand not seeded yet — skip rather than invent one (run seed:car-brands first).
      console.warn(`[seed:car-models] brand '${brandSlug}' not found; skipping ${list.length} models`);
      skippedBrands += 1;
      continue;
    }
    for (const [name, body] of list) {
      const slug = slugify(`${brand.name}-${name}`);
      await db
        .insert(models)
        .values({ brandId: brand.id, name, slug, bodyType: body })
        .onConflictDoUpdate({
          target: models.slug,
          set: { brandId: brand.id, name, bodyType: body },
        });
      upserted += 1;
    }
  }
  console.log(`[seed:car-models] upserted ${upserted} models across ${Object.keys(CAR_MODELS).length - skippedBrands} brands.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed:car-models] FAILED", err);
    process.exit(1);
  });
