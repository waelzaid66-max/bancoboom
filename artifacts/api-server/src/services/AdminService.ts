import { db } from "@workspace/db";
import {
  users,
  listings,
  listingMedia,
  interactions,
  leadHistory,
  ads,
  reports,
  auditLog,
  paymentIntents,
} from "@workspace/db/schema";
import { and, count, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { setShadowBan, writeAudit } from "./AbuseService";
import { countOpenReports } from "./ReportService";
import { countOpenTickets } from "./SupportService";
import { getGlobalErrorRate } from "../lib/metrics";
import { decideRoleChange, decideBan } from "../lib/roleGuards";
import { isStaffRole, type StaffRole } from "../lib/permissions";

const EGP = "EGP";

/* ── Users ─────────────────────────────────────────────── */

type UserRole =
  | "individual"
  | "dealer"
  | "company"
  | "enterprise"
  | "financial_institution";

interface AdminCompanyDetails {
  activity_type?: string | null;
  business_name?: string | null;
  trade_name?: string | null;
  owner_name?: string | null;
  city?: string | null;
  documents?: string[];
}

interface AdminUserRow {
  id: string;
  account_number: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  staff_role: StaffRole;
  is_admin: boolean;
  is_verified: boolean;
  is_shadow_banned: boolean;
  wallet_balance: string;
  listing_count: number;
  created_at: string;
  company_details: AdminCompanyDetails | null;
}

function normalizeCompanyDetails(raw: unknown): AdminCompanyDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const documents = Array.isArray(o.documents)
    ? o.documents.filter((d): d is string => typeof d === "string" && d.length > 0)
    : [];
  return {
    activity_type: typeof o.activity_type === "string" ? o.activity_type : null,
    business_name: typeof o.business_name === "string" ? o.business_name : null,
    trade_name: typeof o.trade_name === "string" ? o.trade_name : null,
    owner_name: typeof o.owner_name === "string" ? o.owner_name : null,
    city: typeof o.city === "string" ? o.city : null,
    ...(documents.length > 0 ? { documents } : {}),
  };
}

async function fetchAdminUser(userId: string): Promise<AdminUserRow | null> {
  const [row] = await db
    .select({
      id: users.id,
      accountNumber: users.accountNumber,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      staffRole: users.staffRole,
      isAdmin: users.isAdmin,
      isVerified: users.isVerified,
      isShadowBanned: users.isShadowBanned,
      walletBalance: users.walletBalance,
      companyDetails: users.companyDetails,
      createdAt: users.createdAt,
      listingCount: sql<number>`(select count(*)::int from listings l where l.user_id = ${users.id})`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    account_number: row.accountNumber ?? null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    staff_role: row.staffRole as StaffRole,
    is_admin: row.isAdmin,
    is_verified: !!row.isVerified,
    is_shadow_banned: row.isShadowBanned,
    wallet_balance: row.walletBalance ?? "0",
    listing_count: row.listingCount ?? 0,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    company_details: normalizeCompanyDetails(row.companyDetails),
  };
}

export async function listUsers(params: {
  search?: string;
  role?: UserRole;
  banned?: boolean;
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminUserRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.search) {
    const term = `%${params.search}%`;
    const searchCond = or(
      ilike(users.name, term),
      ilike(users.email, term),
      ilike(users.phone, term),
    );
    if (searchCond) conditions.push(searchCond);
  }
  if (params.role) conditions.push(eq(users.role, params.role));
  if (params.banned !== undefined) conditions.push(eq(users.isShadowBanned, params.banned));
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(users.createdAt, cursorDate));
  }

  const rows = await db
    .select({
      id: users.id,
      accountNumber: users.accountNumber,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      staffRole: users.staffRole,
      isAdmin: users.isAdmin,
      isVerified: users.isVerified,
      isShadowBanned: users.isShadowBanned,
      walletBalance: users.walletBalance,
      companyDetails: users.companyDetails,
      createdAt: users.createdAt,
      listingCount: sql<number>`(select count(*)::int from listings l where l.user_id = ${users.id})`,
    })
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map((row) => ({
      id: row.id,
      account_number: row.accountNumber ?? null,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      staff_role: row.staffRole as StaffRole,
      is_admin: row.isAdmin,
      is_verified: !!row.isVerified,
      is_shadow_banned: row.isShadowBanned,
      wallet_balance: row.walletBalance ?? "0",
      listing_count: row.listingCount ?? 0,
      created_at: (row.createdAt ?? new Date()).toISOString(),
      company_details: normalizeCompanyDetails(row.companyDetails),
    })),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

export async function setUserBan(params: {
  targetUserId: string;
  adminUserId: string;
  actorStaffRole: StaffRole;
  banned: boolean;
  reason?: string;
}): Promise<AdminUserRow> {
  const existing = await fetchAdminUser(params.targetUserId);
  if (!existing) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
  }

  // Protect privileged accounts: only an Owner may ban another Owner, never the
  // last one, and nobody may ban themselves. (ban_users authz is enforced
  // upstream by requirePermission.)
  const ownerCount = existing.staff_role === "owner" ? await countOwners() : 0;
  const decision = decideBan({
    actorId: params.adminUserId,
    actorRole: params.actorStaffRole,
    targetId: params.targetUserId,
    targetRole: existing.staff_role,
    banned: params.banned,
    ownerCount,
  });
  if (!decision.allowed) {
    const message =
      decision.reason === "self_ban"
        ? "You cannot ban your own account"
        : decision.reason === "last_owner"
          ? "Cannot ban the last Owner"
          : "Only an Owner can ban another Owner";
    throw Object.assign(new Error(message), { code: "FORBIDDEN" });
  }

  // setShadowBan flips the flag AND writes a shadow_ban audit entry with actor.
  await setShadowBan(
    params.targetUserId,
    params.banned,
    params.reason ?? (params.banned ? "admin shadow-ban" : "admin lifted ban"),
    { actorUserId: params.adminUserId },
  );

  const updated = await fetchAdminUser(params.targetUserId);
  return updated!;
}

/** Live count of accounts currently holding the Owner staff role. */
async function countOwners(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(eq(users.staffRole, "owner"));
  return row?.n ?? 0;
}

/**
 * Advisory lock key serializing ALL staff-role mutations. Held for the duration
 * of the role-change transaction so two concurrent demotions can never both
 * read ownerCount=2 and both commit, leaving zero Owners (TOCTOU). Distinct from
 * the startup-backfill lock.
 */
const STAFF_ROLE_MUTATION_LOCK = 48150006;

/**
 * Assign a staff role to a user. Enforces the integrity guards (no self-change,
 * always keep at least one Owner) and keeps the coarse `isAdmin` flag in
 * lock-step with the role (isAdmin === staffRole !== 'user'). Every change is
 * audited. The CALLER must already be authorized via the `manage_roles`
 * permission gate — only Owners can reach this path.
 *
 * The read (current role + owner count), the guard decision, and the write all
 * run inside ONE transaction holding a session advisory lock, so concurrent
 * role changes are fully serialized and can never race past the last-Owner
 * guard.
 */
export async function setUserRole(params: {
  targetUserId: string;
  actorUserId: string;
  role: StaffRole;
}): Promise<AdminUserRow> {
  if (!isStaffRole(params.role)) {
    throw Object.assign(new Error("Invalid staff role"), { code: "INVALID_DATA" });
  }

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${STAFF_ROLE_MUTATION_LOCK})`);

    const [target] = await tx
      .select({ staffRole: users.staffRole })
      .from(users)
      .where(eq(users.id, params.targetUserId))
      .limit(1);
    if (!target) {
      throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
    }
    const currentRole = (target.staffRole ?? "user") as StaffRole;

    const [ownerRow] = await tx
      .select({ n: count() })
      .from(users)
      .where(eq(users.staffRole, "owner"));
    const ownerCount = ownerRow?.n ?? 0;

    const decision = decideRoleChange({
      actorId: params.actorUserId,
      targetId: params.targetUserId,
      currentRole,
      nextRole: params.role,
      ownerCount,
    });

    if (!decision.allowed) {
      if (decision.reason === "noop") {
        return { changed: false as const, oldRole: currentRole };
      }
      const message =
        decision.reason === "self_change"
          ? "You cannot change your own staff role"
          : "Cannot remove the last Owner — promote another Owner first";
      throw Object.assign(new Error(message), { code: "FORBIDDEN" });
    }

    await tx
      .update(users)
      .set({ staffRole: params.role, isAdmin: params.role !== "user" })
      .where(eq(users.id, params.targetUserId));

    return { changed: true as const, oldRole: currentRole };
  });

  if (outcome.changed) {
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: params.actorUserId,
      subjectUserId: params.targetUserId,
      reason: "set_staff_role",
      metadata: {
        action: "SET_STAFF_ROLE",
        old_value: outcome.oldRole,
        new_value: params.role,
      },
    });
  }

  const updated = await fetchAdminUser(params.targetUserId);
  return updated!;
}

/**
 * Verify / unverify a seller. Audited. Caller must hold `verify_users`.
 */
export async function setUserVerified(params: {
  targetUserId: string;
  actorUserId: string;
  verified: boolean;
}): Promise<AdminUserRow> {
  const existing = await fetchAdminUser(params.targetUserId);
  if (!existing) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
  }

  if (existing.is_verified === params.verified) return existing; // no-op

  await db
    .update(users)
    .set({ isVerified: params.verified })
    .where(eq(users.id, params.targetUserId));

  writeAudit({
    eventType: "admin_action",
    severity: "info",
    actorUserId: params.actorUserId,
    subjectUserId: params.targetUserId,
    reason: "set_verified",
    metadata: {
      action: params.verified ? "VERIFY_USER" : "UNVERIFY_USER",
      old_value: existing.is_verified,
      new_value: params.verified,
    },
  });

  const updated = await fetchAdminUser(params.targetUserId);
  return updated!;
}

/* ── Listings ──────────────────────────────────────────── */

type AdminListingStatus =
  | "active"
  | "sold"
  | "archived"
  | "draft"
  | "pending_approval"
  | "pending_review"
  | "approved"
  | "rejected"
  | "flagged";

interface AdminListingRow {
  id: string;
  title: string;
  price_display: string;
  category: string;
  status: AdminListingStatus;
  is_flagged: boolean;
  seller_id: string | null;
  seller_name: string | null;
  seller_shadow_banned: boolean;
  media_preview: string | null;
  report_count: number;
  view_count: number;
  lead_count: number;
  location: string | null;
  created_at: string;
}

function priceDisplay(raw: string | null): string {
  if (!raw) return `${EGP} 0`;
  const n = Number(raw);
  if (Number.isNaN(n)) return `${EGP} ${raw}`;
  return `${EGP} ${n.toLocaleString("en-US")}`;
}

const listingSelection = {
  id: listings.id,
  title: listings.title,
  basePriceCash: listings.basePriceCash,
  category: listings.category,
  status: listings.status,
  isFlagged: listings.isFlagged,
  location: listings.location,
  createdAt: listings.createdAt,
  sellerId: users.id,
  sellerName: users.name,
  sellerShadowBanned: users.isShadowBanned,
  mediaPreview: sql<string | null>`(select m.url from listing_media m where m.listing_id = ${listings.id} order by m.is_thumbnail desc limit 1)`,
  reportCount: sql<number>`(select count(*)::int from reports r where r.listing_id = ${listings.id})`,
  viewCount: sql<number>`coalesce((select i.views from interactions i where i.listing_id = ${listings.id}), 0)::int`,
  leadCount: sql<number>`(select count(*)::int from lead_history lh where lh.listing_id = ${listings.id})`,
};

function serializeListing(row: {
  id: string;
  title: string;
  basePriceCash: string;
  category: string;
  status: AdminListingStatus | null;
  isFlagged: boolean;
  location: string | null;
  createdAt: Date | null;
  sellerId: string | null;
  sellerName: string | null;
  sellerShadowBanned: boolean | null;
  mediaPreview: string | null;
  reportCount: number;
  viewCount: number;
  leadCount: number;
}): AdminListingRow {
  return {
    id: row.id,
    title: row.title,
    price_display: priceDisplay(row.basePriceCash),
    category: row.category,
    status: row.status ?? "active",
    is_flagged: row.isFlagged,
    seller_id: row.sellerId,
    seller_name: row.sellerName,
    seller_shadow_banned: !!row.sellerShadowBanned,
    media_preview: row.mediaPreview,
    report_count: row.reportCount ?? 0,
    view_count: row.viewCount ?? 0,
    lead_count: row.leadCount ?? 0,
    location: row.location,
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function listListings(params: {
  search?: string;
  status?: AdminListingStatus;
  flagged?: boolean;
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminListingRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.search) conditions.push(ilike(listings.title, `%${params.search}%`));
  if (params.status) conditions.push(eq(listings.status, params.status));
  if (params.flagged !== undefined) conditions.push(eq(listings.isFlagged, params.flagged));
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(listings.createdAt, cursorDate));
  }

  const rows = await db
    .select(listingSelection)
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(listings.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map(serializeListing),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

/**
 * Moderation queue: listings that need a human decision — flagged, pending
 * review/approval, or carrying open reports. Ordered by most reports first.
 */
export async function moderationQueue(params: {
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminListingRow[]; cursor?: string; has_next: boolean }> {
  const needsReview = or(
    eq(listings.isFlagged, true),
    inArray(listings.status, ["pending_review", "pending_approval", "flagged"]),
    sql`exists (select 1 from reports r where r.listing_id = ${listings.id} and r.status in ('open','reviewing'))`,
  );

  const conditions: SQL[] = [];
  if (needsReview) conditions.push(needsReview);
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(listings.createdAt, cursorDate));
  }

  const rows = await db
    .select(listingSelection)
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(listings.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map(serializeListing),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

export async function moderateListing(params: {
  listingId: string;
  adminUserId: string;
  action: "approve" | "reject" | "archive" | "flag" | "unflag";
  reason?: string;
}): Promise<AdminListingRow> {
  const [existing] = await db
    .select({ id: listings.id, isFlagged: listings.isFlagged })
    .from(listings)
    .where(eq(listings.id, params.listingId))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("Listing not found"), { code: "NOT_FOUND" });
  }

  const update: Partial<typeof listings.$inferInsert> = { updatedAt: new Date() };
  switch (params.action) {
    case "approve":
      update.status = "active";
      update.isFlagged = false;
      update.flagReason = null;
      break;
    case "reject":
      update.status = "rejected";
      break;
    case "archive":
      update.status = "archived";
      break;
    case "flag":
      update.isFlagged = true;
      update.status = "flagged";
      update.flagReason = params.reason ?? "admin_flag";
      break;
    case "unflag":
      update.isFlagged = false;
      update.flagReason = null;
      update.status = "active";
      break;
  }

  await db.update(listings).set(update).where(eq(listings.id, params.listingId));

  // Resolving via moderation also closes any open reports on the listing.
  if (params.action === "approve" || params.action === "reject" || params.action === "archive") {
    await db
      .update(reports)
      .set({
        status: "resolved",
        resolvedByUserId: params.adminUserId,
        resolutionNote: `auto-resolved via moderation: ${params.action}`,
        resolvedAt: new Date(),
      })
      .where(and(eq(reports.listingId, params.listingId), inArray(reports.status, ["open", "reviewing"])));
  }

  writeAudit({
    eventType: "admin_action",
    severity: params.action === "reject" || params.action === "flag" ? "warning" : "info",
    actorUserId: params.adminUserId,
    listingId: params.listingId,
    reason: `moderate_${params.action}`,
    metadata: { note: params.reason ?? null },
  });

  const [row] = await db
    .select(listingSelection)
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .where(eq(listings.id, params.listingId))
    .limit(1);

  return serializeListing(row!);
}

/* ── Leads ─────────────────────────────────────────────── */

interface AdminLeadRow {
  id: string;
  listing_id: string;
  listing_title: string;
  action_type: "whatsapp" | "call" | "chat" | "finance_request";
  status: "new" | "contacted" | "closed";
  buyer_name: string | null;
  buyer_phone: string | null;
  created_at: string | null;
}

export async function listLeads(params: {
  action_type?: AdminLeadRow["action_type"];
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminLeadRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.action_type) conditions.push(eq(leadHistory.actionType, params.action_type));
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(leadHistory.createdAt, cursorDate));
  }

  const rows = await db
    .select({
      id: leadHistory.id,
      listingId: leadHistory.listingId,
      listingTitle: listings.title,
      actionType: leadHistory.actionType,
      status: leadHistory.status,
      buyerName: leadHistory.buyerName,
      buyerPhone: leadHistory.buyerPhone,
      createdAt: leadHistory.createdAt,
    })
    .from(leadHistory)
    .leftJoin(listings, eq(leadHistory.listingId, listings.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leadHistory.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      id: r.id,
      listing_id: r.listingId,
      listing_title: r.listingTitle ?? "—",
      action_type: r.actionType,
      status: r.status ?? "new",
      buyer_name: r.buyerName,
      buyer_phone: r.buyerPhone,
      created_at: r.createdAt ? r.createdAt.toISOString() : null,
    })),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

/* ── Ads ───────────────────────────────────────────────── */

interface AdminAdRow {
  id: string;
  listing_id: string;
  listing_title: string | null;
  seller_id: string | null;
  seller_name: string | null;
  ad_type: string;
  is_active: boolean;
  budget_total: string | null;
  budget_spent: string;
  impressions: number;
  billable_impressions: number;
  starts_at: string | null;
  expires_at: string;
  created_at: string | null;
}

export async function listAds(params: {
  cursor?: string;
  limit: number;
}): Promise<{ items: AdminAdRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) conditions.push(lt(ads.createdAt, cursorDate));
  }

  const rows = await db
    .select({
      id: ads.id,
      listingId: ads.listingId,
      listingTitle: listings.title,
      sellerId: ads.sellerId,
      sellerName: users.name,
      adType: ads.adType,
      isActive: ads.isActive,
      budgetTotal: ads.budgetTotal,
      budgetSpent: ads.budgetSpent,
      impressions: ads.impressions,
      billableImpressions: ads.billableImpressions,
      startsAt: ads.startsAt,
      expiresAt: ads.expiresAt,
      createdAt: ads.createdAt,
    })
    .from(ads)
    .leftJoin(listings, eq(ads.listingId, listings.id))
    .leftJoin(users, eq(ads.sellerId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ads.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      id: r.id,
      listing_id: r.listingId,
      listing_title: r.listingTitle,
      seller_id: r.sellerId,
      seller_name: r.sellerName,
      ad_type: r.adType,
      is_active: !!r.isActive,
      budget_total: r.budgetTotal,
      budget_spent: r.budgetSpent ?? "0",
      impressions: r.impressions ?? 0,
      billable_impressions: r.billableImpressions ?? 0,
      starts_at: r.startsAt ? r.startsAt.toISOString() : null,
      expires_at: (r.expiresAt ?? new Date()).toISOString(),
      created_at: r.createdAt ? r.createdAt.toISOString() : null,
    })),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

/* ── Revenue ───────────────────────────────────────────── */

/**
 * Revenue summary. Only ad/boost spend (ads.budgetSpent) is real money today;
 * subscriptions and pay-per-lead are structured channels that read 0 until the
 * billing system (separate task) lands. Honest, not faked.
 */
export async function revenueSummary(): Promise<{
  total_mtd: string;
  total_all_time: string;
  currency: string;
  by_channel: { channel: string; amount: string; note: string | null }[];
  timeseries: { date: string; amount: string }[];
}> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [allTime] = await db
    .select({ total: sql<string>`coalesce(sum(${ads.budgetSpent}), 0)::text` })
    .from(ads);

  const [mtd] = await db
    .select({ total: sql<string>`coalesce(sum(${ads.budgetSpent}), 0)::text` })
    .from(ads)
    .where(sql`${ads.createdAt} >= ${startOfMonth.toISOString()}`);

  // Daily ad spend for the last 30 days (by ad creation date as proxy).
  const series = await db
    .select({
      date: sql<string>`to_char(${ads.createdAt}, 'YYYY-MM-DD')`,
      amount: sql<string>`coalesce(sum(${ads.budgetSpent}), 0)::text`,
    })
    .from(ads)
    .where(sql`${ads.createdAt} >= now() - interval '30 days'`)
    .groupBy(sql`to_char(${ads.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${ads.createdAt}, 'YYYY-MM-DD')`);

  return {
    total_mtd: mtd?.total ?? "0",
    total_all_time: allTime?.total ?? "0",
    currency: EGP,
    by_channel: [
      { channel: "ads_boosts", amount: allTime?.total ?? "0", note: "Ad & boost spend (live)" },
      { channel: "subscriptions", amount: "0", note: "Pending billing system" },
      { channel: "pay_per_lead", amount: "0", note: "Pending billing system" },
    ],
    timeseries: series.map((s) => ({ date: s.date, amount: s.amount })),
  };
}

/* ── Analytics ─────────────────────────────────────────── */

export async function analytics(): Promise<{
  conversion_rate: number;
  total_listings: number;
  active_listings: number;
  sold_listings: number;
  total_leads: number;
  top_categories: { category: string; listing_count: number; lead_count: number }[];
  best_sellers: { user_id: string; name: string; sold_count: number; lead_count: number }[];
  trending_listings: { id: string; title: string; view_count: number; lead_count: number }[];
}> {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${listings.status} = 'active')::int`,
      sold: sql<number>`count(*) filter (where ${listings.status} = 'sold')::int`,
    })
    .from(listings);

  const [leadCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(leadHistory);

  const totalLeads = leadCount?.total ?? 0;
  const totalViewsRow = await db
    .select({ views: sql<number>`coalesce(sum(${interactions.views}), 0)::int` })
    .from(interactions);
  const totalViews = totalViewsRow[0]?.views ?? 0;
  const conversionRate = totalViews > 0 ? Number((totalLeads / totalViews).toFixed(4)) : 0;

  const topCategories = await db
    .select({
      category: listings.category,
      listingCount: sql<number>`count(distinct ${listings.id})::int`,
      leadCount: sql<number>`count(${leadHistory.id})::int`,
    })
    .from(listings)
    .leftJoin(leadHistory, eq(leadHistory.listingId, listings.id))
    .groupBy(listings.category)
    .orderBy(sql`count(distinct ${listings.id}) desc`);

  const bestSellers = await db
    .select({
      userId: users.id,
      name: users.name,
      soldCount: sql<number>`count(*) filter (where ${listings.status} = 'sold')::int`,
      leadCount: sql<number>`(select count(*)::int from lead_history lh where lh.seller_id = ${users.id})`,
    })
    .from(users)
    .innerJoin(listings, eq(listings.userId, users.id))
    .groupBy(users.id, users.name)
    .orderBy(sql`count(*) filter (where ${listings.status} = 'sold') desc`)
    .limit(5);

  const trending = await db
    .select({
      id: listings.id,
      title: listings.title,
      viewCount: sql<number>`coalesce((select i.views from interactions i where i.listing_id = ${listings.id}), 0)::int`,
      leadCount: sql<number>`(select count(*)::int from lead_history lh where lh.listing_id = ${listings.id})`,
    })
    .from(listings)
    .orderBy(sql`coalesce((select i.views from interactions i where i.listing_id = ${listings.id}), 0) desc`)
    .limit(5);

  return {
    conversion_rate: conversionRate,
    total_listings: counts?.total ?? 0,
    active_listings: counts?.active ?? 0,
    sold_listings: counts?.sold ?? 0,
    total_leads: totalLeads,
    top_categories: topCategories.map((c) => ({
      category: c.category,
      listing_count: c.listingCount ?? 0,
      lead_count: c.leadCount ?? 0,
    })),
    best_sellers: bestSellers.map((b) => ({
      user_id: b.userId,
      name: b.name,
      sold_count: b.soldCount ?? 0,
      lead_count: b.leadCount ?? 0,
    })),
    trending_listings: trending.map((t) => ({
      id: t.id,
      title: t.title,
      view_count: t.viewCount ?? 0,
      lead_count: t.leadCount ?? 0,
    })),
  };
}

/* ── Fraud signals (from audit_log) ────────────────────── */

interface FraudSignalRow {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  subject_id: string | null;
  count: number;
  created_at: string;
}

const FRAUD_EVENT_TYPES = [
  "blocked_lead",
  "suspicious_click",
  "invalid_impression",
  "flagged_listing",
  "price_outlier",
  "spam_content",
  "rate_limit_exceeded",
  "shadow_ban",
] as const;

const FRAUD_TITLES: Record<string, string> = {
  blocked_lead: "Blocked lead activity",
  suspicious_click: "Suspicious click pattern",
  invalid_impression: "Invalid ad impressions",
  flagged_listing: "Flagged listings",
  price_outlier: "Price outliers",
  spam_content: "Spam content detected",
  rate_limit_exceeded: "Rate limit breaches",
  shadow_ban: "Shadow bans applied",
};

export async function fraudSignals(): Promise<FraudSignalRow[]> {
  const rows = await db
    .select({
      eventType: auditLog.eventType,
      severity: sql<string>`max(${auditLog.severity}::text)`,
      count: sql<number>`count(*)::int`,
      lastAt: sql<string>`max(${auditLog.createdAt})`,
      subjectId: sql<string | null>`(array_agg(${auditLog.subjectUserId}))[1]`,
    })
    .from(auditLog)
    .where(
      and(
        inArray(auditLog.eventType, [...FRAUD_EVENT_TYPES]),
        sql`${auditLog.createdAt} >= now() - interval '30 days'`,
      ),
    )
    .groupBy(auditLog.eventType)
    .orderBy(sql`count(*) desc`);

  return rows.map((r) => {
    const sev = (r.severity as FraudSignalRow["severity"]) ?? "info";
    return {
      id: r.eventType,
      type: r.eventType,
      severity: ["info", "warning", "critical"].includes(sev) ? sev : "info",
      title: FRAUD_TITLES[r.eventType] ?? r.eventType,
      description: `${r.count} ${r.eventType.replace(/_/g, " ")} event(s) in the last 30 days`,
      subject_id: r.subjectId ?? null,
      count: r.count ?? 0,
      created_at: r.lastAt ? new Date(r.lastAt).toISOString() : new Date().toISOString(),
    };
  });
}

/* ── Alerts (derived operational signals) ──────────────── */

interface AlertRow {
  id: string;
  type: "lead_drop" | "error_spike" | "fraud_spike" | "payment_failure";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  value: string | null;
  created_at: string;
}

export async function alerts(): Promise<AlertRow[]> {
  const out: AlertRow[] = [];
  const now = new Date().toISOString();

  const errorRate = getGlobalErrorRate();
  if (errorRate > 0.05) {
    out.push({
      id: "error_spike",
      type: "error_spike",
      severity: errorRate > 0.15 ? "critical" : "warning",
      title: "Elevated server error rate",
      description: `Server error rate is ${(errorRate * 100).toFixed(1)}% across requests`,
      value: `${(errorRate * 100).toFixed(1)}%`,
      created_at: now,
    });
  }

  const [critical] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(and(eq(auditLog.severity, "critical"), sql`${auditLog.createdAt} >= now() - interval '24 hours'`));
  if ((critical?.c ?? 0) > 0) {
    out.push({
      id: "fraud_spike",
      type: "fraud_spike",
      severity: "critical",
      title: "Critical abuse events in last 24h",
      description: `${critical!.c} critical abuse/fraud event(s) recorded in the past 24 hours`,
      value: String(critical!.c),
      created_at: now,
    });
  }

  const [leadsToday] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(leadHistory)
    .where(sql`${leadHistory.createdAt} >= now() - interval '24 hours'`);
  if ((leadsToday?.c ?? 0) === 0) {
    out.push({
      id: "lead_drop",
      type: "lead_drop",
      severity: "warning",
      title: "No leads in the last 24h",
      description: "No buyer leads were captured in the past 24 hours",
      value: "0",
      created_at: now,
    });
  }

  const [failedPayments] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(paymentIntents)
    .where(
      and(
        eq(paymentIntents.status, "failed"),
        sql`${paymentIntents.createdAt} >= now() - interval '24 hours'`,
      ),
    );
  if ((failedPayments?.c ?? 0) > 0) {
    out.push({
      id: "payment_failure",
      type: "payment_failure",
      severity: (failedPayments?.c ?? 0) > 5 ? "critical" : "warning",
      title: "Payment failures in last 24h",
      description: `${failedPayments!.c} hosted checkout payment(s) failed in the past 24 hours`,
      value: String(failedPayments!.c),
      created_at: now,
    });
  }

  return out;
}

/* ── Overview ──────────────────────────────────────────── */

export async function overview(): Promise<{
  total_users: number;
  total_listings: number;
  active_listings: number;
  total_leads: number;
  open_reports: number;
  moderation_queue_count: number;
  open_tickets: number;
  revenue_mtd: string;
  active_alerts: number;
  fraud_signals: number;
  error_rate: number;
}> {
  const [userCount] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
  const [listingCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${listings.status} = 'active')::int`,
    })
    .from(listings);
  const [leadCount] = await db.select({ c: sql<number>`count(*)::int` }).from(leadHistory);
  const [queueCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      or(
        eq(listings.isFlagged, true),
        inArray(listings.status, ["pending_review", "pending_approval", "flagged"]),
        sql`exists (select 1 from reports r where r.listing_id = ${listings.id} and r.status in ('open','reviewing'))`,
      )!,
    );

  const [openReports, openTickets, rev, alertList, fraud] = await Promise.all([
    countOpenReports(),
    countOpenTickets(),
    revenueSummary(),
    alerts(),
    fraudSignals(),
  ]);

  return {
    total_users: userCount?.c ?? 0,
    total_listings: listingCounts?.total ?? 0,
    active_listings: listingCounts?.active ?? 0,
    total_leads: leadCount?.c ?? 0,
    open_reports: openReports,
    moderation_queue_count: queueCount?.c ?? 0,
    open_tickets: openTickets,
    revenue_mtd: rev.total_mtd,
    active_alerts: alertList.length,
    fraud_signals: fraud.reduce((sum, f) => sum + f.count, 0),
    error_rate: getGlobalErrorRate(),
  };
}
