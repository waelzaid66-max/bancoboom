import { db } from "@workspace/db";
import { candidateAttributes, candidateAttributeSeen } from "@workspace/db/schema";
import { and, eq, gte, sql, desc } from "drizzle-orm";

/**
 * Adaptive learning — "Market is the Source of Truth".
 *
 * Free-form custom spec keys sellers add (Phase A) are tracked here per category.
 * A key used across enough listings BY ENOUGH DISTINCT USERS graduates from
 * "candidate" → "graduated" (a future official filter / create option). This is
 * the learning cycle from the philosophy: publish first, learn after — tracking
 * is ALWAYS best-effort and never blocks or fails a publish.
 */

// Official taxonomy + internal keys — already structured/searchable, so they are
// NEVER tracked as candidates. Everything else a seller types is a candidate.
const STRUCTURED_KEYS = new Set([
  // car
  "year", "mileage", "condition", "fuel_type", "transmission", "body_type", "engine_cc", "color", "brand", "model",
  // real estate
  "offer_type", "property_type", "area", "rooms", "bathrooms", "finishing", "ownership", "compound", "furnished",
  // industrial / raw materials
  "industry", "capacity", "material", "industrial_type", "origin",
  // internal (not user taxonomy)
  "media_captions", "contact_phones", "whatsapp_enabled", "payment_options", "payment_option",
]);

// Graduation thresholds — enough total usage AND enough distinct users, so one
// seller alone can never promote a key (anti-gaming, faithful to "several users").
export const GRADUATE_MIN_USAGE = 5;
export const GRADUATE_MIN_USERS = 3;

// Canonicalize a custom key so variants collapse to ONE candidate instead of
// fragmenting the learning data into chaos: lower-case + unify underscores AND
// any whitespace run into a single space. So "Power_Capacity", "power  capacity"
// and "power capacity" are all the same attribute. (Synonyms/units/translation
// are a later knowledge-layer concern — see banco-philosophy follow-ups.)
function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function isStructured(normalizedKey: string): boolean {
  return (
    STRUCTURED_KEYS.has(normalizedKey) ||
    STRUCTURED_KEYS.has(normalizedKey.replace(/ /g, "_"))
  );
}

/**
 * Track the free-form custom spec keys of a just-published listing. Best-effort:
 * upserts each candidate (category, key), bumps usageCount, records the distinct
 * user sighting, recomputes userCount, and graduates once thresholds are met.
 * Swallows all errors — the publish has already succeeded.
 */
export async function trackCandidateAttributes(args: {
  category: "car" | "real_estate" | "industrial";
  userId: string;
  specs: Record<string, unknown>;
}): Promise<void> {
  const { category, userId, specs } = args;
  try {
    for (const rawKey of Object.keys(specs)) {
      const attrKey = normalizeKey(rawKey);
      if (!attrKey || isStructured(attrKey)) continue;
      const raw = specs[rawKey];
      const sample =
        typeof raw === "string" || typeof raw === "number"
          ? String(raw).slice(0, 200)
          : null;

      // Upsert the candidate; bump usage + refresh the sample value.
      const [cand] = await db
        .insert(candidateAttributes)
        .values({ category, attrKey, sampleValue: sample, usageCount: 1, userCount: 0 })
        .onConflictDoUpdate({
          target: [candidateAttributes.category, candidateAttributes.attrKey],
          set: {
            usageCount: sql`${candidateAttributes.usageCount} + 1`,
            updatedAt: new Date(),
            ...(sample ? { sampleValue: sample } : {}),
          },
        })
        .returning({ id: candidateAttributes.id });
      if (!cand) continue;

      // Record the distinct-user sighting (no-op if this user used it before).
      const seen = await db
        .insert(candidateAttributeSeen)
        .values({ candidateId: cand.id, userId })
        .onConflictDoNothing({
          target: [candidateAttributeSeen.candidateId, candidateAttributeSeen.userId],
        })
        .returning({ id: candidateAttributeSeen.id });
      if (seen.length > 0) {
        await db
          .update(candidateAttributes)
          .set({ userCount: sql`${candidateAttributes.userCount} + 1`, updatedAt: new Date() })
          .where(eq(candidateAttributes.id, cand.id));
      }

      // Graduate once it has reached enough listings across enough distinct users.
      await db
        .update(candidateAttributes)
        .set({ status: "graduated", updatedAt: new Date() })
        .where(
          and(
            eq(candidateAttributes.id, cand.id),
            eq(candidateAttributes.status, "candidate"),
            gte(candidateAttributes.usageCount, GRADUATE_MIN_USAGE),
            gte(candidateAttributes.userCount, GRADUATE_MIN_USERS),
          ),
        );
    }
  } catch {
    // Best-effort learning — must never affect a publish that already committed.
  }
}

export interface CandidateAttributeDTO {
  category: string;
  attr_key: string;
  sample_value: string | null;
  usage_count: number;
  user_count: number;
  status: string;
}

/**
 * List tracked attributes (most-used first) for review / future promotion. Scoped
 * to a category when provided. Read-only; safe for an admin surface.
 */
export async function listCandidateAttributes(
  category?: "car" | "real_estate" | "industrial",
  limit = 100,
): Promise<CandidateAttributeDTO[]> {
  const rows = await db
    .select({
      category: candidateAttributes.category,
      attr_key: candidateAttributes.attrKey,
      sample_value: candidateAttributes.sampleValue,
      usage_count: candidateAttributes.usageCount,
      user_count: candidateAttributes.userCount,
      status: candidateAttributes.status,
    })
    .from(candidateAttributes)
    .where(category ? eq(candidateAttributes.category, category) : undefined)
    .orderBy(desc(candidateAttributes.usageCount))
    .limit(limit);
  return rows;
}
