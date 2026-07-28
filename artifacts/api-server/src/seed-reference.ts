/**
 * Reference-dataset seed (STANDALONE).
 *
 * Populates the geographic / real-estate reference tables (reference_developers,
 * reference_places) used only for search / autocomplete / ranking. It creates no
 * listings and touches no live marketplace table, so it is safe to run anytime.
 *
 * Idempotent: developers upsert by slug, places by global_id, so re-running only
 * refreshes names / keywords / blobs and never duplicates. Adding a new country
 * later is a new data module + a line here — no schema change.
 *
 *   pnpm --filter @workspace/api-server run seed:reference
 */
import { db } from "@workspace/db";
import { referenceDevelopers, referencePlaces } from "@workspace/db/schema";
import { EGYPT_DEVELOPERS, EGYPT_TREE, type DevSeed, type PlaceSeed } from "./reference/egypt";
import { MIDDLE_EAST_DEVELOPERS, MIDDLE_EAST_COUNTRIES } from "./reference/middle-east";

/** Lower-cased, whitespace-collapsed blob that the trigram index searches. */
function buildBlob(parts: Array<string | undefined>): string {
  return Array.from(
    new Set(
      parts
        .filter((p): p is string => !!p && p.trim().length > 0)
        .map((p) => p.trim().toLowerCase()),
    ),
  ).join(" ");
}

async function seedDevelopers(list: DevSeed[]): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();
  for (const d of list) {
    const searchBlob = buildBlob([d.en, d.ar, ...(d.aliases ?? []), ...(d.keywords ?? []), d.slug]);
    const [row] = await db
      .insert(referenceDevelopers)
      .values({
        slug: d.slug,
        nameEn: d.en,
        nameAr: d.ar,
        aliases: d.aliases ?? [],
        searchKeywords: d.keywords ?? [],
        searchBlob,
      })
      .onConflictDoUpdate({
        target: referenceDevelopers.slug,
        set: {
          nameEn: d.en,
          nameAr: d.ar,
          aliases: d.aliases ?? [],
          searchKeywords: d.keywords ?? [],
          searchBlob,
          updatedAt: new Date(),
        },
      })
      .returning({ id: referenceDevelopers.id });
    slugToId.set(d.slug, row.id);
  }
  return slugToId;
}

async function upsertPlace(
  node: PlaceSeed,
  parentGlobalId: string | null,
  parentId: string | null,
  isoCountryCode: string,
  devIds: Map<string, string>,
  counters: { count: number },
): Promise<void> {
  const globalId = parentGlobalId ? `${parentGlobalId}.${node.slug}` : node.slug;
  const developerId = node.developer ? devIds.get(node.developer) ?? null : null;
  const searchBlob = buildBlob([
    node.en,
    node.ar,
    ...(node.aliases ?? []),
    ...(node.keywords ?? []),
    node.slug.replace(/-/g, " "),
  ]);

  const [row] = await db
    .insert(referencePlaces)
    .values({
      globalId,
      parentId,
      placeType: node.type,
      isoCountryCode,
      nameEn: node.en,
      nameAr: node.ar,
      slug: node.slug,
      aliases: node.aliases ?? [],
      searchKeywords: node.keywords ?? [],
      searchBlob,
      developerId,
      popularity: node.popularity ?? 0,
      verified: true,
      source: "curated",
      status: "active",
    })
    .onConflictDoUpdate({
      target: referencePlaces.globalId,
      set: {
        parentId,
        placeType: node.type,
        isoCountryCode,
        nameEn: node.en,
        nameAr: node.ar,
        slug: node.slug,
        aliases: node.aliases ?? [],
        searchKeywords: node.keywords ?? [],
        searchBlob,
        developerId,
        popularity: node.popularity ?? 0,
        updatedAt: new Date(),
      },
    })
    .returning({ id: referencePlaces.id });

  counters.count += 1;

  for (const child of node.children ?? []) {
    await upsertPlace(child, globalId, row.id, isoCountryCode, devIds, counters);
  }
}

async function main(): Promise<void> {
  console.log("[seed:reference] seeding reference dataset (Egypt + Middle East)…");
  // One developer map for all countries so a compound in any market links to its
  // developer. Idempotent upsert by slug — safe across regions.
  const devIds = await seedDevelopers([...EGYPT_DEVELOPERS, ...MIDDLE_EAST_DEVELOPERS]);
  console.log(`[seed:reference] developers: ${devIds.size}`);

  const counters = { count: 0 };
  await upsertPlace(EGYPT_TREE, null, null, "EG", devIds, counters);
  for (const { iso, tree } of MIDDLE_EAST_COUNTRIES) {
    await upsertPlace(tree, null, null, iso, devIds, counters);
  }
  console.log(`[seed:reference] places: ${counters.count}`);
  console.log("[seed:reference] done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed:reference] FAILED", err);
    process.exit(1);
  });
