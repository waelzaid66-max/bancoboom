import { db } from "@workspace/db";
import { investmentOpportunities, investmentInterests, users } from "@workspace/db/schema";
import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import type { InvestmentSummary, InvestmentDetail } from "../validators/schemas";

type InvestmentType =
  | "factory_sale"
  | "business_sale"
  | "production_line_investment"
  | "franchise"
  | "partnership";
type InvestmentStatus = "draft" | "active" | "under_offer" | "closed";
type FiguresSource = "seller_provided" | "estimate";
type Industry =
  | "food"
  | "beverage"
  | "plastic"
  | "textile"
  | "pharmaceutical"
  | "chemical"
  | "engineering"
  | "other";
type InterestKind = "interest" | "request_details" | "contact";

const BUSINESS_ROLES = ["dealer", "company", "enterprise"];

export interface CreateInvestmentInput {
  investment_type: InvestmentType;
  title: string;
  description?: string;
  industry?: Industry;
  location: string;
  total_value_amount: number;
  currency: string;
  expected_roi_pct?: number | null;
  payback_years?: number | null;
  revenue_range_min?: number | null;
  revenue_range_max?: number | null;
  cost_structure_note?: string | null;
  growth_potential_note?: string | null;
  figures_source: FiguresSource;
  cover_url?: string | null;
}

export interface UpdateInvestmentInput extends Partial<CreateInvestmentInput> {
  status?: InvestmentStatus;
}

export interface SubmitInterestInput {
  kind: InterestKind;
  message?: string;
  contact_phone?: string;
}

// Statuses visible to the public. draft/closed are owner-only.
const PUBLIC_STATUSES = ["active", "under_offer"] as const;

interface InvestmentRow {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_is_verified: boolean | null;
  investment_type: InvestmentType;
  title: string;
  description: string | null;
  industry: string | null;
  location: string;
  total_value_amount: string;
  currency: string;
  expected_roi_pct: string | null;
  payback_years: string | null;
  revenue_range_min: string | null;
  revenue_range_max: string | null;
  figures_source: FiguresSource;
  cover_url: string | null;
  status: InvestmentStatus;
  cost_structure_note: string | null;
  growth_potential_note: string | null;
  is_flagged: boolean | null;
  owner_is_shadow_banned: boolean | null;
  created_at: Date | null;
}

const investmentSelect = {
  id: investmentOpportunities.id,
  owner_id: investmentOpportunities.ownerId,
  owner_name: users.name,
  owner_is_verified: users.isVerified,
  investment_type: investmentOpportunities.investmentType,
  title: investmentOpportunities.title,
  description: investmentOpportunities.description,
  industry: investmentOpportunities.industry,
  location: investmentOpportunities.location,
  total_value_amount: investmentOpportunities.totalValueAmount,
  currency: investmentOpportunities.currency,
  expected_roi_pct: investmentOpportunities.expectedRoiPct,
  payback_years: investmentOpportunities.paybackYears,
  revenue_range_min: investmentOpportunities.revenueRangeMin,
  revenue_range_max: investmentOpportunities.revenueRangeMax,
  figures_source: investmentOpportunities.figuresSource,
  cover_url: investmentOpportunities.coverUrl,
  status: investmentOpportunities.status,
  cost_structure_note: investmentOpportunities.costStructureNote,
  growth_potential_note: investmentOpportunities.growthPotentialNote,
  is_flagged: investmentOpportunities.isFlagged,
  owner_is_shadow_banned: users.isShadowBanned,
  created_at: investmentOpportunities.createdAt,
} as const;

// Abuse-control parity with listings: hide flagged opportunities and any
// shadow-banned owner's surface from public callers.
function investmentPublicConditions() {
  return [
    sql`${investmentOpportunities.isFlagged} IS NOT TRUE`,
    sql`${users.isShadowBanned} IS NOT TRUE`,
  ];
}

function formatMoney(value: string | number, currency: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value} ${currency}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.00$/, "")}M ${currency}`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString()}K ${currency}`;
  return `${n.toLocaleString()} ${currency}`;
}

function toSummary(row: InvestmentRow): InvestmentSummary {
  return {
    id: row.id,
    owner_id: row.owner_id,
    owner_name: row.owner_name ?? null,
    owner_is_verified: !!row.owner_is_verified,
    investment_type: row.investment_type,
    title: row.title,
    description: row.description ?? null,
    industry: row.industry ?? null,
    location: row.location,
    total_value_amount: row.total_value_amount,
    total_value_display: formatMoney(row.total_value_amount, row.currency),
    currency: row.currency,
    expected_roi_pct: row.expected_roi_pct ?? null,
    payback_years: row.payback_years ?? null,
    revenue_range_min: row.revenue_range_min ?? null,
    revenue_range_max: row.revenue_range_max ?? null,
    figures_source: row.figures_source,
    cover_url: row.cover_url ?? null,
    status: row.status,
    created_at: row.created_at ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

async function resolveUserId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });
  return user.id;
}

async function resolveUserIdOpt(clerkId?: string): Promise<string | null> {
  if (!clerkId) return null;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user?.id ?? null;
}

/** Public, paginated browse of investment opportunities (active/under_offer). */
export async function listInvestments(
  filters: { investment_type?: InvestmentType; industry?: Industry; location?: string; status?: InvestmentStatus },
  cursor?: string,
  limit = 20,
): Promise<{ items: InvestmentSummary[]; cursor?: string; has_next: boolean }> {
  const conditions = [
    inArray(investmentOpportunities.status, [...PUBLIC_STATUSES]),
    ...investmentPublicConditions(),
  ];
  if (filters.investment_type)
    conditions.push(eq(investmentOpportunities.investmentType, filters.investment_type));
  if (filters.industry) conditions.push(eq(investmentOpportunities.industry, filters.industry));
  if (filters.status && (PUBLIC_STATUSES as readonly string[]).includes(filters.status))
    conditions.push(eq(investmentOpportunities.status, filters.status));
  if (filters.location)
    conditions.push(sql`${investmentOpportunities.location} ILIKE ${"%" + filters.location + "%"}`);
  if (cursor) conditions.push(sql`${investmentOpportunities.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select(investmentSelect)
    .from(investmentOpportunities)
    .leftJoin(users, eq(investmentOpportunities.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(investmentOpportunities.createdAt))
    .limit(limit + 1);

  return paginate(rows as InvestmentRow[], limit);
}

/** Owner's own opportunities across every status (drafts included). */
export async function listMyInvestments(
  clerkId: string,
  cursor?: string,
  limit = 20,
): Promise<{ items: InvestmentSummary[]; cursor?: string; has_next: boolean }> {
  const ownerId = await resolveUserId(clerkId);
  const conditions = [eq(investmentOpportunities.ownerId, ownerId)];
  if (cursor) conditions.push(sql`${investmentOpportunities.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select(investmentSelect)
    .from(investmentOpportunities)
    .leftJoin(users, eq(investmentOpportunities.ownerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(investmentOpportunities.createdAt))
    .limit(limit + 1);

  return paginate(rows as InvestmentRow[], limit);
}

function paginate(rows: InvestmentRow[], limit: number) {
  const hasNext = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor =
    hasNext && pageRows.length > 0
      ? pageRows[pageRows.length - 1].created_at?.toISOString()
      : undefined;
  return { items: pageRows.map(toSummary), cursor: nextCursor, has_next: hasNext };
}

export async function getInvestmentDetail(
  id: string,
  viewerClerkId?: string,
): Promise<InvestmentDetail | null> {
  const [row] = await db
    .select(investmentSelect)
    .from(investmentOpportunities)
    .leftJoin(users, eq(investmentOpportunities.ownerId, users.id))
    .where(eq(investmentOpportunities.id, id))
    .limit(1);

  if (!row) return null;

  const viewerUserId = await resolveUserIdOpt(viewerClerkId);
  const viewerIsOwner = viewerUserId != null && viewerUserId === row.owner_id;

  // Non-owners only see public-status opportunities, and never flagged ones or
  // those from shadow-banned owners (abuse-control parity with listings).
  if (!viewerIsOwner) {
    if (!(PUBLIC_STATUSES as readonly string[]).includes(row.status)) return null;
    if (row.is_flagged === true || row.owner_is_shadow_banned === true) return null;
  }

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(investmentInterests)
    .where(eq(investmentInterests.investmentId, id));

  let viewerHasInterest = false;
  if (viewerUserId) {
    const [mine] = await db
      .select({ id: investmentInterests.id })
      .from(investmentInterests)
      .where(
        and(
          eq(investmentInterests.investmentId, id),
          eq(investmentInterests.userId, viewerUserId),
        ),
      )
      .limit(1);
    viewerHasInterest = !!mine;
  }

  return {
    ...toSummary(row as InvestmentRow),
    cost_structure_note: row.cost_structure_note ?? null,
    growth_potential_note: row.growth_potential_note ?? null,
    interest_count: Number(countRow?.count ?? 0),
    viewer_has_interest: viewerHasInterest,
    viewer_is_owner: viewerIsOwner,
  };
}

export async function createInvestment(
  clerkId: string,
  input: CreateInvestmentInput,
): Promise<{ id: string }> {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });
  if (!BUSINESS_ROLES.includes(user.role)) {
    throw Object.assign(
      new Error("Only business accounts can post investment opportunities"),
      { code: "FORBIDDEN" },
    );
  }
  const ownerId = user.id;

  const [created] = await db
    .insert(investmentOpportunities)
    .values({
      ownerId,
      investmentType: input.investment_type,
      title: input.title,
      description: input.description ?? null,
      industry: input.industry ?? null,
      location: input.location,
      totalValueAmount: String(input.total_value_amount),
      currency: input.currency,
      expectedRoiPct: input.expected_roi_pct != null ? String(input.expected_roi_pct) : null,
      paybackYears: input.payback_years != null ? String(input.payback_years) : null,
      revenueRangeMin: input.revenue_range_min != null ? String(input.revenue_range_min) : null,
      revenueRangeMax: input.revenue_range_max != null ? String(input.revenue_range_max) : null,
      costStructureNote: input.cost_structure_note ?? null,
      growthPotentialNote: input.growth_potential_note ?? null,
      figuresSource: input.figures_source,
      coverUrl: input.cover_url ?? null,
    })
    .returning({ id: investmentOpportunities.id });

  return { id: created.id };
}

export async function updateInvestment(
  clerkId: string,
  id: string,
  updates: UpdateInvestmentInput,
): Promise<{ id: string; updated: boolean }> {
  const ownerId = await resolveUserId(clerkId);

  const [existing] = await db
    .select({ id: investmentOpportunities.id, ownerId: investmentOpportunities.ownerId })
    .from(investmentOpportunities)
    .where(eq(investmentOpportunities.id, id))
    .limit(1);
  if (!existing) throw Object.assign(new Error("Investment not found"), { code: "NOT_FOUND" });
  if (existing.ownerId !== ownerId) {
    throw Object.assign(new Error("Only the owner can edit this opportunity"), { code: "FORBIDDEN" });
  }

  const patch: Partial<typeof investmentOpportunities.$inferInsert> = {};
  if (updates.investment_type !== undefined) patch.investmentType = updates.investment_type;
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.industry !== undefined) patch.industry = updates.industry;
  if (updates.location !== undefined) patch.location = updates.location;
  if (updates.total_value_amount !== undefined)
    patch.totalValueAmount = String(updates.total_value_amount);
  if (updates.currency !== undefined) patch.currency = updates.currency;
  if (updates.expected_roi_pct !== undefined)
    patch.expectedRoiPct = updates.expected_roi_pct === null ? null : String(updates.expected_roi_pct);
  if (updates.payback_years !== undefined)
    patch.paybackYears = updates.payback_years === null ? null : String(updates.payback_years);
  if (updates.revenue_range_min !== undefined)
    patch.revenueRangeMin = updates.revenue_range_min === null ? null : String(updates.revenue_range_min);
  if (updates.revenue_range_max !== undefined)
    patch.revenueRangeMax = updates.revenue_range_max === null ? null : String(updates.revenue_range_max);
  if (updates.cost_structure_note !== undefined) patch.costStructureNote = updates.cost_structure_note;
  if (updates.growth_potential_note !== undefined)
    patch.growthPotentialNote = updates.growth_potential_note;
  if (updates.figures_source !== undefined) patch.figuresSource = updates.figures_source;
  if (updates.cover_url !== undefined) patch.coverUrl = updates.cover_url;
  if (updates.status !== undefined) patch.status = updates.status;
  patch.updatedAt = new Date();

  await db.update(investmentOpportunities).set(patch).where(eq(investmentOpportunities.id, id));

  return { id, updated: true };
}

/**
 * Submit (or update) the viewer's standing interest in an opportunity. One row
 * per (investment, user); re-submitting updates the kind/message. The owner is
 * notified best-effort. Owners cannot register interest in their own listing.
 */
export async function submitInterest(
  clerkId: string,
  investmentId: string,
  input: SubmitInterestInput,
): Promise<{ id: string; submitted: boolean }> {
  const userId = await resolveUserId(clerkId);

  const [inv] = await db
    .select({
      id: investmentOpportunities.id,
      ownerId: investmentOpportunities.ownerId,
      status: investmentOpportunities.status,
      title: investmentOpportunities.title,
      isFlagged: investmentOpportunities.isFlagged,
      ownerShadowBanned: users.isShadowBanned,
    })
    .from(investmentOpportunities)
    .leftJoin(users, eq(investmentOpportunities.ownerId, users.id))
    .where(eq(investmentOpportunities.id, investmentId))
    .limit(1);
  if (!inv) throw Object.assign(new Error("Investment not found"), { code: "NOT_FOUND" });
  if (inv.ownerId === userId) {
    throw Object.assign(new Error("You cannot register interest in your own opportunity"), {
      code: "FORBIDDEN",
    });
  }
  // A flagged opportunity or a shadow-banned owner is invisible to outsiders.
  if (inv.isFlagged === true || inv.ownerShadowBanned === true) {
    throw Object.assign(new Error("Investment not found"), { code: "NOT_FOUND" });
  }
  if (!(PUBLIC_STATUSES as readonly string[]).includes(inv.status)) {
    throw Object.assign(new Error("This opportunity is not open for interest"), { code: "CONFLICT" });
  }

  const [interest] = await db
    .insert(investmentInterests)
    .values({
      investmentId,
      userId,
      kind: input.kind,
      message: input.message ?? null,
      contactPhone: input.contact_phone ?? null,
    })
    .onConflictDoUpdate({
      target: [investmentInterests.investmentId, investmentInterests.userId],
      set: {
        kind: input.kind,
        message: input.message ?? null,
        contactPhone: input.contact_phone ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: investmentInterests.id });

  void createNotification({
    userId: inv.ownerId,
    type: "investment",
    title: "اهتمام استثماري جديد · New investment interest",
    body: `هناك مهتم بفرصة «${inv.title}» · Someone is interested in your opportunity`,
    data: { investment_id: investmentId, kind: input.kind },
  });

  return { id: interest.id, submitted: true };
}
