import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "../__tests__/helpers";
import { referencePlaces } from "@workspace/db/schema";
import { suggestPlaces } from "./ReferenceService";

/**
 * Reference autocomplete on a real Postgres: multilingual (Arabic substring),
 * typo tolerance (trigram), country filter, prefix/popularity ranking, and the
 * short-query guard.
 */
const TAG = `refsvc-${Date.now()}`;

async function seed(rows: Array<{ en: string; ar: string; blob: string; country?: string; pop?: number; type?: string }>) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await db.insert(referencePlaces).values({
      globalId: `${TAG}.${i}`,
      placeType: r.type ?? "city",
      isoCountryCode: r.country ?? "EG",
      nameEn: r.en,
      nameAr: r.ar,
      slug: `${TAG}-${i}`,
      searchBlob: r.blob.toLowerCase(),
      popularity: r.pop ?? 0,
      status: "active",
    });
  }
}

afterAll(async () => {
  await db.execute(sql`DELETE FROM reference_places WHERE global_id LIKE ${TAG + ".%"}`);
});

describe("suggestPlaces", () => {
  it("matches Arabic substrings, Latin typos, respects prefix/popularity + country, and guards short input", async () => {
    await seed([
      { en: "New Cairo", ar: "القاهرة الجديدة", blob: "new cairo القاهرة الجديدة نيو كايرو", pop: 90 },
      { en: "New Capital", ar: "العاصمة الإدارية", blob: "new capital العاصمة الادارية nac", pop: 95 },
      { en: "Madinaty", ar: "مدينتي", blob: "madinaty مدينتي madinty", pop: 92 },
      { en: "Dubai Marina", ar: "دبي مارينا", blob: "dubai marina دبي مارينا", country: "AE", pop: 80 },
    ]);

    // Arabic substring
    const ar = await suggestPlaces({ q: "القاهرة" });
    expect(ar.some((p) => p.name_en === "New Cairo")).toBe(true);

    // Latin typo tolerance (trigram): "madinty" → Madinaty
    const typo = await suggestPlaces({ q: "madinty" });
    expect(typo.some((p) => p.name_en === "Madinaty")).toBe(true);

    // Prefix "new c" → both New Cairo and New Capital; New Capital ranks first
    // (higher popularity), proving the ranking.
    const prefix = await suggestPlaces({ q: "new c" });
    const news = prefix.filter((p) => p.name_en.startsWith("New "));
    expect(news.length).toBeGreaterThanOrEqual(2);
    expect(news[0].name_en).toBe("New Capital");

    // Country filter isolates markets.
    const ae = await suggestPlaces({ q: "dubai", country: "AE" });
    expect(ae.every((p) => p.iso_country_code === "AE")).toBe(true);
    expect(await suggestPlaces({ q: "dubai", country: "EG" })).toHaveLength(0);

    // Short-query guard: < 2 chars returns nothing.
    expect(await suggestPlaces({ q: "a" })).toHaveLength(0);
  });
});
