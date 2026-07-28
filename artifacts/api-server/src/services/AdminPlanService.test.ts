import { describe, it, expect, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import { listPlansAdmin, updatePlanAdmin, createPlanAdmin } from "./AdminPlanService";
import { db, uniq, randomUUID } from "../__tests__/helpers";
import { plans } from "@workspace/db/schema";

/**
 * Admin "control keys" over the plan economy. Proves create/list/update work end
 * to end on a real DB, numeric columns round-trip as numbers, an update only
 * touches provided fields, and a missing id returns null (→ 404 upstream).
 */
const slugs: string[] = [];

afterAll(async () => {
  if (slugs.length) await db.delete(plans).where(inArray(plans.slug, slugs));
});

describe("AdminPlanService — plan control keys", () => {
  it("creates a plan, lists it, and reads numeric columns as numbers", async () => {
    const slug = uniq("plan").toLowerCase();
    slugs.push(slug);

    const created = await createPlanAdmin({
      slug,
      name: "Test Plan",
      audience: "dealer",
      monthlyPrice: 500,
      boostPrice: 50,
      cplWhatsapp: 10,
      listingQuota: 30,
    });
    expect(created.slug).toBe(slug);
    expect(created.monthly_price).toBe(500); // number, not "500"
    expect(created.listing_quota).toBe(30);

    const all = await listPlansAdmin();
    expect(all.find((p) => p.slug === slug)).toBeTruthy();
  });

  it("updates ONLY the provided fields and persists them", async () => {
    const slug = uniq("planedit").toLowerCase();
    slugs.push(slug);
    const created = await createPlanAdmin({
      slug,
      name: "Edit Plan",
      audience: "dealer",
      monthlyPrice: 100,
      boostPrice: 20,
    });

    const updated = await updatePlanAdmin(created.id, { monthlyPrice: 175, isActive: false });
    expect(updated).toBeTruthy();
    expect(updated!.monthly_price).toBe(175);
    expect(updated!.is_active).toBe(false);
    expect(updated!.boost_price).toBe(20); // untouched field preserved

    const persisted = (await listPlansAdmin()).find((p) => p.id === created.id)!;
    expect(persisted.monthly_price).toBe(175);
    expect(persisted.is_active).toBe(false);
  });

  it("returns null when updating a non-existent plan", async () => {
    expect(await updatePlanAdmin(randomUUID(), { monthlyPrice: 1 })).toBeNull();
  });
});
