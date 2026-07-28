import { db } from "@workspace/db";
import {
  globalSupplyRequests,
  globalSupplyResponses,
  companyProfiles,
  users,
} from "@workspace/db/schema";
import { and, eq, desc, sql, or } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import type {
  GlobalSupplyRequestDTO,
  GlobalSupplyResponseDTO,
  GlobalSupplyDetailDTO,
} from "../validators/schemas";

type Category = "car" | "real_estate" | "industrial";
type Industry =
  | "food"
  | "beverage"
  | "plastic"
  | "textile"
  | "pharmaceutical"
  | "chemical"
  | "engineering"
  | "other";
type Incoterms = "exw" | "fca" | "fob" | "cfr" | "cif" | "dap" | "ddp";
type RequestStatus = "open" | "fulfilled" | "closed" | "cancelled";

export interface CreateGlobalSupplyInput {
  product_text: string;
  category?: Category;
  industry?: Industry;
  quantity?: number | null;
  unit?: string | null;
  destination_country: string;
  budget_max?: number | null;
  currency: string;
  incoterms?: Incoterms | null;
  notes?: string | null;
}

export interface RespondGlobalSupplyInput {
  country_of_origin?: string | null;
  moq?: number | null;
  shipping_time_days?: number | null;
  incoterms?: Incoterms | null;
  delivery_estimate?: string | null;
  price_quote?: number | null;
  currency: string;
  message?: string | null;
}

const BUSINESS_ROLES = ["dealer", "company", "enterprise"];

interface RequestRow {
  id: string;
  buyer_id: string;
  buyer_name: string | null;
  product_text: string;
  category: Category | null;
  industry: string | null;
  quantity: string | null;
  unit: string | null;
  destination_country: string;
  budget_max: string | null;
  currency: string;
  incoterms: string | null;
  notes: string | null;
  status: RequestStatus;
  buyer_is_shadow_banned: boolean | null;
  created_at: Date | null;
}

const requestSelect = {
  id: globalSupplyRequests.id,
  buyer_id: globalSupplyRequests.buyerId,
  buyer_name: users.name,
  product_text: globalSupplyRequests.productText,
  category: globalSupplyRequests.category,
  industry: globalSupplyRequests.industry,
  quantity: globalSupplyRequests.quantity,
  unit: globalSupplyRequests.unit,
  destination_country: globalSupplyRequests.destinationCountry,
  budget_max: globalSupplyRequests.budgetMax,
  currency: globalSupplyRequests.currency,
  incoterms: globalSupplyRequests.incoterms,
  notes: globalSupplyRequests.notes,
  status: globalSupplyRequests.status,
  buyer_is_shadow_banned: users.isShadowBanned,
  created_at: globalSupplyRequests.createdAt,
} as const;

function toRequestDto(row: RequestRow, responseCount: number): GlobalSupplyRequestDTO {
  return {
    id: row.id,
    buyer_id: row.buyer_id,
    buyer_name: row.buyer_name ?? null,
    product_text: row.product_text,
    category: row.category ?? null,
    industry: row.industry ?? null,
    quantity: row.quantity ?? null,
    unit: row.unit ?? null,
    destination_country: row.destination_country,
    budget_max: row.budget_max ?? null,
    currency: row.currency,
    incoterms: row.incoterms ?? null,
    notes: row.notes ?? null,
    status: row.status,
    response_count: responseCount,
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

const responseCountSql = sql<number>`(SELECT COUNT(*) FROM ${globalSupplyResponses} WHERE ${globalSupplyResponses.requestId} = ${globalSupplyRequests.id})`;

/** Public board of open sourcing requests suppliers can respond to. */
export async function listGlobalRequests(
  filters: { status?: RequestStatus; industry?: Industry; destination_country?: string },
  cursor?: string,
  limit = 20,
): Promise<{ items: GlobalSupplyRequestDTO[]; cursor?: string; has_next: boolean }> {
  const conditions = [
    eq(globalSupplyRequests.status, filters.status ?? "open"),
    // Never surface requests from shadow-banned buyers on the public board.
    sql`${users.isShadowBanned} IS NOT TRUE`,
  ];
  if (filters.industry) conditions.push(eq(globalSupplyRequests.industry, filters.industry));
  if (filters.destination_country)
    conditions.push(
      sql`${globalSupplyRequests.destinationCountry} ILIKE ${"%" + filters.destination_country + "%"}`,
    );
  if (cursor) conditions.push(sql`${globalSupplyRequests.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select({ ...requestSelect, response_count: responseCountSql })
    .from(globalSupplyRequests)
    .leftJoin(users, eq(globalSupplyRequests.buyerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(globalSupplyRequests.createdAt))
    .limit(limit + 1);

  return paginate(rows, limit);
}

/** Buyer's own sourcing requests across every status. */
export async function listMyGlobalRequests(
  clerkId: string,
  cursor?: string,
  limit = 20,
): Promise<{ items: GlobalSupplyRequestDTO[]; cursor?: string; has_next: boolean }> {
  const buyerId = await resolveUserId(clerkId);
  const conditions = [eq(globalSupplyRequests.buyerId, buyerId)];
  if (cursor) conditions.push(sql`${globalSupplyRequests.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select({ ...requestSelect, response_count: responseCountSql })
    .from(globalSupplyRequests)
    .leftJoin(users, eq(globalSupplyRequests.buyerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(globalSupplyRequests.createdAt))
    .limit(limit + 1);

  return paginate(rows, limit);
}

function paginate(
  rows: (RequestRow & { response_count: number })[],
  limit: number,
) {
  const hasNext = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor =
    hasNext && pageRows.length > 0
      ? pageRows[pageRows.length - 1].created_at?.toISOString()
      : undefined;
  return {
    items: pageRows.map((r) => toRequestDto(r, Number(r.response_count ?? 0))),
    cursor: nextCursor,
    has_next: hasNext,
  };
}

/**
 * Request detail. Response visibility mirrors the RFQ engine:
 *   - the BUYER (owner) sees ALL responses;
 *   - a SUPPLIER sees ONLY their own response;
 *   - the public sees NONE (just the request + response_count).
 * `supplier_matches` are ranked directory companies — never fabricated scores.
 */
export async function getGlobalRequestDetail(
  id: string,
  viewerClerkId?: string,
): Promise<GlobalSupplyDetailDTO | null> {
  const [row] = await db
    .select(requestSelect)
    .from(globalSupplyRequests)
    .leftJoin(users, eq(globalSupplyRequests.buyerId, users.id))
    .where(eq(globalSupplyRequests.id, id))
    .limit(1);
  if (!row) return null;

  const viewerUserId = await resolveUserIdOpt(viewerClerkId);
  const viewerIsBuyer = viewerUserId != null && viewerUserId === row.buyer_id;

  // Hide a shadow-banned buyer's request from everyone except the buyer.
  if (!viewerIsBuyer && row.buyer_is_shadow_banned === true) return null;

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(globalSupplyResponses)
    .where(eq(globalSupplyResponses.requestId, id));

  let responses: GlobalSupplyResponseDTO[] = [];
  if (viewerIsBuyer) {
    responses = await fetchResponses(id, viewerUserId);
  } else if (viewerUserId) {
    responses = await fetchResponses(id, viewerUserId, viewerUserId);
  }

  const supplierMatches = await computeSupplierMatches({
    industry: row.industry,
    destinationCountry: row.destination_country,
  });

  return {
    ...toRequestDto(row, Number(countRow?.count ?? 0)),
    responses,
    supplier_matches: supplierMatches,
    viewer_is_buyer: viewerIsBuyer,
  };
}

async function fetchResponses(
  requestId: string,
  viewerUserId: string | null,
  onlySupplierId?: string,
): Promise<GlobalSupplyResponseDTO[]> {
  const conditions = [eq(globalSupplyResponses.requestId, requestId)];
  if (onlySupplierId) conditions.push(eq(globalSupplyResponses.supplierId, onlySupplierId));

  const rows = await db
    .select({
      id: globalSupplyResponses.id,
      request_id: globalSupplyResponses.requestId,
      supplier_id: globalSupplyResponses.supplierId,
      supplier_name: users.name,
      supplier_is_verified: users.isVerified,
      country_of_origin: globalSupplyResponses.countryOfOrigin,
      moq: globalSupplyResponses.moq,
      shipping_time_days: globalSupplyResponses.shippingTimeDays,
      incoterms: globalSupplyResponses.incoterms,
      delivery_estimate: globalSupplyResponses.deliveryEstimate,
      price_quote: globalSupplyResponses.priceQuote,
      currency: globalSupplyResponses.currency,
      message: globalSupplyResponses.message,
      status: globalSupplyResponses.status,
      created_at: globalSupplyResponses.createdAt,
    })
    .from(globalSupplyResponses)
    .leftJoin(users, eq(globalSupplyResponses.supplierId, users.id))
    .where(and(...conditions))
    .orderBy(desc(globalSupplyResponses.createdAt));

  return rows.map((r) => ({
    id: r.id,
    request_id: r.request_id,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier_name ?? null,
    supplier_is_verified: !!r.supplier_is_verified,
    country_of_origin: r.country_of_origin ?? null,
    moq: r.moq ?? null,
    shipping_time_days: r.shipping_time_days ?? null,
    incoterms: r.incoterms ?? null,
    delivery_estimate: r.delivery_estimate ?? null,
    price_quote: r.price_quote ?? null,
    currency: r.currency,
    message: r.message ?? null,
    status: r.status,
    is_mine: viewerUserId != null && r.supplier_id === viewerUserId,
    created_at: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Rank real directory companies for a request: industry match and/or "exports
 * to destination country". Returns at most 10. match_reason is an explanation,
 * never an invented numeric score.
 */
async function computeSupplierMatches(req: {
  industry: string | null;
  destinationCountry: string;
}): Promise<GlobalSupplyDetailDTO["supplier_matches"]> {
  const exportsMatch = sql`${companyProfiles.countriesExportTo}::text ILIKE ${"%" + req.destinationCountry + "%"}`;
  const industryMatch = req.industry
    ? eq(companyProfiles.industry, req.industry as Industry)
    : sql`FALSE`;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      is_verified: users.isVerified,
      role: users.role,
      industry: companyProfiles.industry,
      hq_country: companyProfiles.hqCountry,
      logo_url: companyProfiles.logoUrl,
      exports_match: sql<boolean>`${exportsMatch}`,
      industry_match: sql<boolean>`${industryMatch}`,
    })
    .from(companyProfiles)
    .leftJoin(users, eq(companyProfiles.userId, users.id))
    .where(
      and(
        sql`${users.isShadowBanned} IS NOT TRUE`,
        or(exportsMatch, industryMatch),
      ),
    )
    .limit(25);

  const ranked = rows
    .filter((r) => r.id && BUSINESS_ROLES.includes(r.role ?? ""))
    .map((r) => {
      const reasons: string[] = [];
      if (r.industry_match) reasons.push("Industry match");
      if (r.exports_match) reasons.push(`Exports to ${req.destinationCountry}`);
      const score = (r.industry_match ? 2 : 0) + (r.exports_match ? 1 : 0);
      return {
        id: r.id as string,
        name: r.name ?? "Unknown",
        is_verified: !!r.is_verified,
        industry: r.industry ?? null,
        hq_country: r.hq_country ?? null,
        logo_url: r.logo_url ?? null,
        match_reason: reasons.join(" · "),
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
    .map(({ _score, ...rest }) => rest);

  return ranked;
}

export async function createGlobalRequest(
  clerkId: string,
  input: CreateGlobalSupplyInput,
): Promise<{ id: string }> {
  const buyerId = await resolveUserId(clerkId);

  const [created] = await db
    .insert(globalSupplyRequests)
    .values({
      buyerId,
      productText: input.product_text,
      category: input.category ?? null,
      industry: input.industry ?? null,
      quantity: input.quantity != null ? String(input.quantity) : null,
      unit: input.unit ?? null,
      destinationCountry: input.destination_country,
      budgetMax: input.budget_max != null ? String(input.budget_max) : null,
      currency: input.currency,
      incoterms: input.incoterms ?? null,
      notes: input.notes ?? null,
    })
    .returning({ id: globalSupplyRequests.id });

  return { id: created.id };
}

/**
 * Submit (or update) a supplier's standing response to a request. One row per
 * (request, supplier); re-submitting updates it. The buyer is notified
 * best-effort. Suppliers cannot respond to their own request.
 */
export async function respondToRequest(
  clerkId: string,
  requestId: string,
  input: RespondGlobalSupplyInput,
): Promise<{ id: string; submitted: boolean }> {
  const supplierId = await resolveUserId(clerkId);

  const [req] = await db
    .select({
      id: globalSupplyRequests.id,
      buyerId: globalSupplyRequests.buyerId,
      status: globalSupplyRequests.status,
      productText: globalSupplyRequests.productText,
      buyerIsShadowBanned: users.isShadowBanned,
    })
    .from(globalSupplyRequests)
    .innerJoin(users, eq(globalSupplyRequests.buyerId, users.id))
    .where(eq(globalSupplyRequests.id, requestId))
    .limit(1);
  if (!req) throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
  // A shadow-banned buyer's request is suppressed for everyone but the buyer; the
  // responder is by definition not the buyer (self-response blocked below), so an
  // outsider must not be able to act on it via a direct ID. Mirror detail semantics.
  if (req.buyerIsShadowBanned === true) {
    throw Object.assign(new Error("Request not found"), { code: "NOT_FOUND" });
  }
  if (req.buyerId === supplierId) {
    throw Object.assign(new Error("You cannot respond to your own request"), { code: "FORBIDDEN" });
  }
  if (req.status !== "open") {
    throw Object.assign(new Error("This request is no longer open"), { code: "CONFLICT" });
  }

  const [response] = await db
    .insert(globalSupplyResponses)
    .values({
      requestId,
      supplierId,
      countryOfOrigin: input.country_of_origin ?? null,
      moq: input.moq != null ? String(input.moq) : null,
      shippingTimeDays: input.shipping_time_days ?? null,
      incoterms: input.incoterms ?? null,
      deliveryEstimate: input.delivery_estimate ?? null,
      priceQuote: input.price_quote != null ? String(input.price_quote) : null,
      currency: input.currency,
      message: input.message ?? null,
    })
    .onConflictDoUpdate({
      target: [globalSupplyResponses.requestId, globalSupplyResponses.supplierId],
      set: {
        countryOfOrigin: input.country_of_origin ?? null,
        moq: input.moq != null ? String(input.moq) : null,
        shippingTimeDays: input.shipping_time_days ?? null,
        incoterms: input.incoterms ?? null,
        deliveryEstimate: input.delivery_estimate ?? null,
        priceQuote: input.price_quote != null ? String(input.price_quote) : null,
        currency: input.currency,
        message: input.message ?? null,
        status: "pending",
        updatedAt: new Date(),
      },
    })
    .returning({ id: globalSupplyResponses.id });

  void createNotification({
    userId: req.buyerId,
    type: "global_supply",
    title: "رد مورّد جديد · New supply response",
    body: `ردّ مورّد على طلبك «${req.productText}» · A supplier responded to your request`,
    data: { request_id: requestId, response_id: response.id },
  });

  return { id: response.id, submitted: true };
}
