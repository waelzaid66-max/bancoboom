/**
 * Reference dataset read API — place suggestions for search / autocomplete.
 *
 * Queries the standalone `reference_places` set (geo + real-estate) with a
 * multilingual, typo-tolerant match on the denormalised `search_blob`:
 *   - substring ILIKE  → Arabic / any-script partial names ("التجمع", "زايد")
 *   - trigram `%`      → Latin typo tolerance ("madinty" → Madinaty)
 * Prefix hits and popularity rank first. Read-only; touches no live table.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export interface PlaceSuggestion {
  id: string;
  global_id: string;
  place_type: string;
  name_en: string;
  name_ar: string | null;
  iso_country_code: string | null;
  popularity: number;
}

const MAX_LIMIT = 20;

export async function suggestPlaces(opts: {
  q: string;
  country?: string | null;
  limit?: number;
}): Promise<PlaceSuggestion[]> {
  const q = (opts.q ?? "").trim().toLowerCase();
  if (q.length < 2) return [];
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), MAX_LIMIT);
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const country = opts.country?.trim().toUpperCase() || null;

  // Trigram `%` needs pg_trgm (ensured at boot). ILIKE covers Arabic substrings
  // where trigram is weak. Prefix match is boosted, then popularity, then
  // similarity — so "new c…" surfaces New Cairo/New Capital by relevance.
  const rows = await db.execute(sql`
    SELECT id, global_id, place_type, name_en, name_ar, iso_country_code, popularity
    FROM reference_places
    WHERE status = 'active'
      AND (search_blob ILIKE ${like} OR search_blob % ${q})
      ${country ? sql`AND iso_country_code = ${country}` : sql``}
    ORDER BY
      (search_blob ILIKE ${prefix}) DESC,
      popularity DESC,
      similarity(search_blob, ${q}) DESC,
      name_en ASC
    LIMIT ${limit}
  `);

  return (rows.rows ?? []).map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id),
      global_id: String(r.global_id),
      place_type: String(r.place_type),
      name_en: String(r.name_en),
      name_ar: r.name_ar == null ? null : String(r.name_ar),
      iso_country_code: r.iso_country_code == null ? null : String(r.iso_country_code),
      popularity: Number(r.popularity ?? 0),
    };
  });
}
