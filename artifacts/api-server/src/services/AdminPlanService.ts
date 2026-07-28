import { db } from "@workspace/db";
import { plans } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Admin plan management — the "control keys" over the platform economy
 * (pricing / quotas / cost-per-lead / boost / ranking) from the Admin Control
 * Center instead of DB-only edits. Additive over the existing `plans` table;
 * all reads/writes go through the DTO so numeric columns (stored as strings)
 * present as numbers on the wire.
 */

type Audience =
  | "individual"
  | "dealer"
  | "company"
  | "enterprise"
  | "financial_institution";

export interface PlanDTO {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  audience: string;
  is_baseline: boolean;
  monthly_price: number;
  listing_quota: number | null;
  active_listing_cap: number | null;
  boost_price: number;
  cpl_whatsapp: number;
  cpl_call: number;
  cpl_chat: number;
  cpl_finance_request: number;
  ranking_weight: number;
  features: unknown;
  is_active: boolean;
  sort_order: number;
}

function toDTO(r: typeof plans.$inferSelect): PlanDTO {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    name_ar: r.nameAr ?? null,
    audience: r.audience,
    is_baseline: r.isBaseline,
    monthly_price: Number(r.monthlyPrice),
    listing_quota: r.listingQuota ?? null,
    active_listing_cap: r.activeListingCap ?? null,
    boost_price: Number(r.boostPrice),
    cpl_whatsapp: Number(r.cplWhatsapp),
    cpl_call: Number(r.cplCall),
    cpl_chat: Number(r.cplChat),
    cpl_finance_request: Number(r.cplFinanceRequest),
    ranking_weight: Number(r.rankingWeight),
    features: r.features ?? null,
    is_active: r.isActive,
    sort_order: r.sortOrder ?? 0,
  };
}

export interface PlanWriteInput {
  slug?: string;
  name?: string;
  nameAr?: string | null;
  audience?: Audience;
  isBaseline?: boolean;
  monthlyPrice?: number;
  listingQuota?: number | null;
  activeListingCap?: number | null;
  boostPrice?: number;
  cplWhatsapp?: number;
  cplCall?: number;
  cplChat?: number;
  cplFinanceRequest?: number;
  rankingWeight?: number;
  features?: unknown;
  isActive?: boolean;
  sortOrder?: number;
}

/** Build a partial DB row from the write input — numeric cols → string, only
 *  keys the caller actually provided (so an update never clobbers unset fields). */
function toRow(input: PlanWriteInput): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (input.name !== undefined) r.name = input.name;
  if (input.nameAr !== undefined) r.nameAr = input.nameAr;
  if (input.audience !== undefined) r.audience = input.audience;
  if (input.isBaseline !== undefined) r.isBaseline = input.isBaseline;
  if (input.monthlyPrice !== undefined) r.monthlyPrice = String(input.monthlyPrice);
  if (input.listingQuota !== undefined) r.listingQuota = input.listingQuota;
  if (input.activeListingCap !== undefined) r.activeListingCap = input.activeListingCap;
  if (input.boostPrice !== undefined) r.boostPrice = String(input.boostPrice);
  if (input.cplWhatsapp !== undefined) r.cplWhatsapp = String(input.cplWhatsapp);
  if (input.cplCall !== undefined) r.cplCall = String(input.cplCall);
  if (input.cplChat !== undefined) r.cplChat = String(input.cplChat);
  if (input.cplFinanceRequest !== undefined) r.cplFinanceRequest = String(input.cplFinanceRequest);
  if (input.rankingWeight !== undefined) r.rankingWeight = String(input.rankingWeight);
  if (input.features !== undefined) r.features = input.features;
  if (input.isActive !== undefined) r.isActive = input.isActive;
  if (input.sortOrder !== undefined) r.sortOrder = input.sortOrder;
  return r;
}

/** Every plan (all audiences + statuses) for the admin grid. */
export async function listPlansAdmin(): Promise<PlanDTO[]> {
  const rows = await db.select().from(plans).orderBy(asc(plans.audience), asc(plans.sortOrder));
  return rows.map(toDTO);
}

/** Patch an existing plan. Returns null when the id doesn't exist. */
export async function updatePlanAdmin(id: string, input: PlanWriteInput): Promise<PlanDTO | null> {
  const row = toRow(input);
  if (Object.keys(row).length === 0) {
    const [existing] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    return existing ? toDTO(existing) : null;
  }
  const [updated] = await db.update(plans).set(row).where(eq(plans.id, id)).returning();
  return updated ? toDTO(updated) : null;
}

/** Add a new plan. `slug` + `name` are required (the validator enforces it). */
export async function createPlanAdmin(input: PlanWriteInput & { slug: string; name: string }): Promise<PlanDTO> {
  const row = toRow(input);
  row.slug = input.slug;
  row.name = input.name;
  const [created] = await db.insert(plans).values(row as typeof plans.$inferInsert).returning();
  return toDTO(created);
}
