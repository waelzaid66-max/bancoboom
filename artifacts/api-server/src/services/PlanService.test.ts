import { describe, it, expect, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { resolveEffectivePlan, checkListingQuota } from "./PlanService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { plans, subscriptions } from "@workspace/db/schema";

/**
 * PlanService is the gate every listing/ad/lead flow passes through, so its
 * precedence + quota logic is verified directly here (against seeded baseline
 * plans): active subscription wins over the role baseline, and the monthly
 * listing quota is enforced. Needs a SEEDED db (baseline plans must exist).
 */
const uids: string[] = [];
const planIds: string[] = [];

const future = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

afterAll(async () => {
  // Users first (cascades their subscriptions), then the throwaway plans.
  await deleteUsers(...uids);
  for (const id of planIds) await db.delete(plans).where(eq(plans.id, id));
});

describe("PlanService.resolveEffectivePlan — precedence", () => {
  it("falls back to the free role baseline when the user has no subscription", async () => {
    const userId = await createUser({ role: "individual" });
    uids.push(userId);

    const plan = await resolveEffectivePlan(userId, "individual");
    expect(plan.isBaseline).toBe(true);
    expect(plan.audience).toBe("individual");
    expect(plan.monthlyPrice).toBe("0");
  });

  it("prefers the active subscription's plan over the baseline", async () => {
    const userId = await createUser({ role: "individual" });
    uids.push(userId);

    // Any seeded paid (non-baseline) plan represents an upgrade.
    const [paid] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.isBaseline, false), eq(plans.isActive, true)))
      .limit(1);
    expect(paid).toBeTruthy();

    await db.insert(subscriptions).values({
      userId,
      planId: paid.id,
      status: "active",
      expiresAt: future(),
    });

    const plan = await resolveEffectivePlan(userId, "individual");
    expect(plan.id).toBe(paid.id);
    expect(plan.isBaseline).toBe(false);
  });
});

describe("PlanService.checkListingQuota — enforcement", () => {
  it("allows creation when under the plan's monthly quota", async () => {
    const userId = await createUser({ role: "individual" });
    uids.push(userId);
    // Baseline individual plan (seeded) has headroom and the user has 0 listings.
    await expect(
      db.transaction((tx) => checkListingQuota(tx, { userId, role: "individual" })),
    ).resolves.toBeUndefined();
  });

  it("blocks creation once the plan's monthly quota is reached", async () => {
    const userId = await createUser({ role: "individual" });
    uids.push(userId);

    // A throwaway zero-quota plan: 0 listings already meets the 0 limit.
    const planId = randomUUID();
    planIds.push(planId);
    await db.insert(plans).values({
      id: planId,
      slug: uniq("plan"),
      name: "Zero Quota Test",
      audience: "individual",
      isBaseline: false,
      isActive: true,
      listingQuota: 0,
    });
    await db.insert(subscriptions).values({
      userId,
      planId,
      status: "active",
      expiresAt: future(),
    });

    await expect(
      db.transaction((tx) => checkListingQuota(tx, { userId, role: "individual" })),
    ).rejects.toThrow(/listing limit/i);
  });
});
