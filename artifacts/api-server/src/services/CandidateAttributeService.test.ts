import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  trackCandidateAttributes,
  GRADUATE_MIN_USAGE,
  GRADUATE_MIN_USERS,
} from "./CandidateAttributeService";
import { db, createUser, deleteUsers, uniq } from "../__tests__/helpers";
import { candidateAttributes } from "@workspace/db/schema";

/**
 * Adaptive learning pipeline: free-form custom spec keys are tracked per category;
 * a key used across enough listings BY ENOUGH DISTINCT USERS graduates. Best-effort
 * + never affects publish. Real DB, scoped by unique attr keys.
 */
const uids: string[] = [];
const keys: string[] = [];

async function mkUser(): Promise<string> {
  const id = await createUser();
  uids.push(id);
  return id;
}

async function byKey(k: string) {
  return db
    .select({
      usage_count: candidateAttributes.usageCount,
      user_count: candidateAttributes.userCount,
      status: candidateAttributes.status,
      sample_value: candidateAttributes.sampleValue,
    })
    .from(candidateAttributes)
    .where(eq(candidateAttributes.attrKey, k));
}

afterAll(async () => {
  for (const k of keys) await db.delete(candidateAttributes).where(eq(candidateAttributes.attrKey, k));
  await deleteUsers(...uids);
});

describe("CandidateAttributeService — market-driven learning", () => {
  it("tracks a custom spec as a candidate (usage + distinct user + sample)", async () => {
    const u = await mkUser();
    const key = uniq("powercap").toLowerCase().replace(/[^a-z0-9]/g, "");
    keys.push(key);

    await trackCandidateAttributes({ category: "industrial", userId: u, specs: { [key]: "3 MW" } });

    const [c] = await byKey(key);
    expect(c).toBeTruthy();
    expect(c.usage_count).toBe(1);
    expect(c.user_count).toBe(1);
    expect(c.status).toBe("candidate");
    expect(c.sample_value).toBe("3 MW");
  });

  it("counts DISTINCT users — the same user twice is 1 user, 2 usages", async () => {
    const u = await mkUser();
    const key = uniq("workers").toLowerCase().replace(/[^a-z0-9]/g, "");
    keys.push(key);

    await trackCandidateAttributes({ category: "industrial", userId: u, specs: { [key]: "150" } });
    await trackCandidateAttributes({ category: "industrial", userId: u, specs: { [key]: "160" } });

    const [c] = await byKey(key);
    expect(c.usage_count).toBe(2);
    expect(c.user_count).toBe(1);
  });

  it("collapses key variants (underscore / spacing / case) into ONE candidate", async () => {
    const u1 = await mkUser();
    const u2 = await mkUser();
    const base = uniq("powr").toLowerCase().replace(/[^a-z0-9]/g, "");
    const canonical = `${base} cap`; // normalized form (lower-case, single space)
    keys.push(canonical);

    // Same attribute written three ways across two users.
    await trackCandidateAttributes({ category: "industrial", userId: u1, specs: { [`${base} cap`]: "1" } });
    await trackCandidateAttributes({ category: "industrial", userId: u2, specs: { [`${base}_cap`]: "2" } });
    await trackCandidateAttributes({ category: "industrial", userId: u1, specs: { [`${base.toUpperCase()}   CAP`]: "3" } });

    const rows = await byKey(canonical);
    expect(rows.length).toBe(1); // one merged candidate, not three
    expect(rows[0].usage_count).toBe(3);
    expect(rows[0].user_count).toBe(2); // u1 (twice) + u2
  });

  it("never tracks official/structured keys", async () => {
    const u = await mkUser();
    await trackCandidateAttributes({
      category: "car",
      userId: u,
      specs: { fuel_type: "petrol", mileage: "100000", property_type: "villa" },
    });
    expect((await byKey("fuel_type")).length).toBe(0);
    expect((await byKey("mileage")).length).toBe(0);
    expect((await byKey("property_type")).length).toBe(0);
  });

  it("graduates a key once it reaches enough usage across enough distinct users", async () => {
    const key = uniq("license").toLowerCase().replace(/[^a-z0-9]/g, "");
    keys.push(key);

    const users: string[] = [];
    for (let i = 0; i < GRADUATE_MIN_USERS; i++) users.push(await mkUser());

    // Spread usage across the distinct users until BOTH thresholds are met.
    const rounds = Math.ceil(GRADUATE_MIN_USAGE / GRADUATE_MIN_USERS);
    for (let r = 0; r < rounds; r++) {
      for (const u of users) {
        await trackCandidateAttributes({ category: "industrial", userId: u, specs: { [key]: "permit" } });
      }
    }

    const [c] = await byKey(key);
    expect(c.usage_count).toBeGreaterThanOrEqual(GRADUATE_MIN_USAGE);
    expect(c.user_count).toBe(GRADUATE_MIN_USERS);
    expect(c.status).toBe("graduated");
  });
});
