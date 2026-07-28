import { db } from "@workspace/db";
import { rfqs, rfqOffers, users } from "@workspace/db/schema";
import { and, eq, desc, sql, ne } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import type { Rfq, RfqDetail, RfqOffer } from "../validators/schemas";

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
type IndustrialType =
  | "factory"
  | "warehouse"
  | "machine"
  | "production_line"
  | "land"
  | "raw_material";

export interface CreateRfqInput {
  category: Category;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  target_price_max?: number;
  destination_country?: string;
  industry?: Industry;
  industrial_type?: IndustrialType;
  deadline?: string;
}

export interface SubmitOfferInput {
  price_quote: number;
  currency: string;
  lead_time_days?: number;
  moq?: number;
  message?: string;
}

interface RfqRow {
  id: string;
  buyer_id: string;
  buyer_name: string | null;
  category: Category;
  title: string;
  description: string | null;
  quantity: string | null;
  unit: string | null;
  target_price_max: string | null;
  destination_country: string | null;
  industry: string | null;
  industrial_type: string | null;
  status: "open" | "awarded" | "closed" | "cancelled";
  deadline: Date | null;
  offer_count: number;
  created_at: Date | null;
}

const rfqSelect = {
  id: rfqs.id,
  buyer_id: rfqs.buyerId,
  buyer_name: users.name,
  category: rfqs.category,
  title: rfqs.title,
  description: rfqs.description,
  quantity: rfqs.quantity,
  unit: rfqs.unit,
  target_price_max: rfqs.targetPriceMax,
  destination_country: rfqs.destinationCountry,
  industry: rfqs.industry,
  industrial_type: rfqs.industrialType,
  status: rfqs.status,
  deadline: rfqs.deadline,
  offer_count: sql<number>`(SELECT COUNT(*) FROM ${rfqOffers} WHERE ${rfqOffers.rfqId} = ${rfqs.id})`,
  created_at: rfqs.createdAt,
} as const;

function toRfqDto(row: RfqRow): Rfq {
  return {
    id: row.id,
    buyer_id: row.buyer_id,
    buyer_name: row.buyer_name ?? null,
    category: row.category,
    title: row.title,
    description: row.description ?? null,
    quantity: row.quantity ?? null,
    unit: row.unit ?? null,
    target_price_max: row.target_price_max ?? null,
    destination_country: row.destination_country ?? null,
    industry: row.industry ?? null,
    industrial_type: row.industrial_type ?? null,
    status: row.status,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    offer_count: Number(row.offer_count ?? 0),
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

export async function createRfq(clerkId: string, input: CreateRfqInput): Promise<{ id: string }> {
  const buyerId = await resolveUserId(clerkId);

  const [created] = await db
    .insert(rfqs)
    .values({
      buyerId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      quantity: input.quantity != null ? String(input.quantity) : null,
      unit: input.unit ?? null,
      targetPriceMax: input.target_price_max != null ? String(input.target_price_max) : null,
      destinationCountry: input.destination_country ?? null,
      industry: input.industry ?? null,
      industrialType: input.industrial_type ?? null,
      deadline: input.deadline ? new Date(input.deadline) : null,
    })
    .returning({ id: rfqs.id });

  return { id: created.id };
}

export async function listOpenRfqs(
  filters: { category?: Category; industry?: Industry; industrial_type?: IndustrialType },
  cursor?: string,
  limit = 20
): Promise<{ items: Rfq[]; cursor?: string; has_next: boolean }> {
  const conditions = [eq(rfqs.status, "open")];
  if (filters.category) conditions.push(eq(rfqs.category, filters.category));
  if (filters.industry) conditions.push(eq(rfqs.industry, filters.industry));
  if (filters.industrial_type) conditions.push(eq(rfqs.industrialType, filters.industrial_type));
  if (cursor) conditions.push(sql`${rfqs.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select(rfqSelect)
    .from(rfqs)
    .leftJoin(users, eq(rfqs.buyerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(rfqs.createdAt))
    .limit(limit + 1);

  return paginate(rows, limit);
}

export async function listMyRfqs(
  clerkId: string,
  cursor?: string,
  limit = 20
): Promise<{ items: Rfq[]; cursor?: string; has_next: boolean }> {
  const buyerId = await resolveUserId(clerkId);

  const conditions = [eq(rfqs.buyerId, buyerId)];
  if (cursor) conditions.push(sql`${rfqs.createdAt} < ${new Date(cursor)}`);

  const rows = await db
    .select(rfqSelect)
    .from(rfqs)
    .leftJoin(users, eq(rfqs.buyerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(rfqs.createdAt))
    .limit(limit + 1);

  return paginate(rows, limit);
}

function paginate(rows: RfqRow[], limit: number) {
  const hasNext = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor =
    hasNext && pageRows.length > 0
      ? pageRows[pageRows.length - 1].created_at?.toISOString()
      : undefined;
  return { items: pageRows.map(toRfqDto), cursor: nextCursor, has_next: hasNext };
}

/**
 * RFQ detail with authz-gated offer visibility:
 *   - the BUYER (owner) sees ALL offers;
 *   - a SUPPLIER sees ONLY their own offer;
 *   - everyone else sees NO offers (just the public RFQ meta + offer_count).
 */
export async function getRfqDetail(
  rfqId: string,
  viewerClerkId?: string
): Promise<RfqDetail | null> {
  const [row] = await db
    .select(rfqSelect)
    .from(rfqs)
    .leftJoin(users, eq(rfqs.buyerId, users.id))
    .where(eq(rfqs.id, rfqId))
    .limit(1);

  if (!row) return null;

  let viewerUserId: string | null = null;
  if (viewerClerkId) {
    const [viewer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, viewerClerkId))
      .limit(1);
    viewerUserId = viewer?.id ?? null;
  }

  const viewerIsBuyer = viewerUserId != null && viewerUserId === row.buyer_id;

  let offers: RfqOffer[] = [];
  if (viewerIsBuyer) {
    offers = await fetchOffers(rfqId, viewerUserId);
  } else if (viewerUserId) {
    offers = await fetchOffers(rfqId, viewerUserId, viewerUserId);
  }

  return {
    ...toRfqDto(row),
    offers,
    viewer_is_buyer: viewerIsBuyer,
  };
}

async function fetchOffers(
  rfqId: string,
  viewerUserId: string | null,
  onlySupplierId?: string
): Promise<RfqOffer[]> {
  const conditions = [eq(rfqOffers.rfqId, rfqId)];
  if (onlySupplierId) conditions.push(eq(rfqOffers.supplierId, onlySupplierId));

  const rows = await db
    .select({
      id: rfqOffers.id,
      rfq_id: rfqOffers.rfqId,
      supplier_id: rfqOffers.supplierId,
      supplier_name: users.name,
      supplier_is_verified: users.isVerified,
      price_quote: rfqOffers.priceQuote,
      currency: rfqOffers.currency,
      lead_time_days: rfqOffers.leadTimeDays,
      moq: rfqOffers.moq,
      message: rfqOffers.message,
      status: rfqOffers.status,
      created_at: rfqOffers.createdAt,
    })
    .from(rfqOffers)
    .leftJoin(users, eq(rfqOffers.supplierId, users.id))
    .where(and(...conditions))
    .orderBy(desc(rfqOffers.createdAt));

  return rows.map((o) => ({
    id: o.id,
    rfq_id: o.rfq_id,
    supplier_id: o.supplier_id,
    supplier_name: o.supplier_name ?? null,
    supplier_is_verified: !!o.supplier_is_verified,
    price_quote: o.price_quote,
    currency: o.currency,
    lead_time_days: o.lead_time_days ?? null,
    moq: o.moq ?? null,
    message: o.message ?? null,
    status: o.status,
    is_mine: viewerUserId != null && o.supplier_id === viewerUserId,
    created_at: o.created_at ? o.created_at.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Submit (or update) a supplier's standing offer on an open RFQ. One offer per
 * (rfq, supplier) — re-submitting updates the existing row and resets it to
 * pending. The buyer is notified best-effort.
 */
export async function submitOffer(
  clerkId: string,
  rfqId: string,
  input: SubmitOfferInput
): Promise<{ id: string; submitted: boolean }> {
  const supplierId = await resolveUserId(clerkId);

  const [rfq] = await db
    .select({ id: rfqs.id, buyerId: rfqs.buyerId, status: rfqs.status, title: rfqs.title })
    .from(rfqs)
    .where(eq(rfqs.id, rfqId))
    .limit(1);
  if (!rfq) throw Object.assign(new Error("RFQ not found"), { code: "NOT_FOUND" });
  if (rfq.buyerId === supplierId) {
    throw Object.assign(new Error("You cannot offer on your own RFQ"), { code: "FORBIDDEN" });
  }
  if (rfq.status !== "open") {
    throw Object.assign(new Error("This RFQ is no longer open"), { code: "CONFLICT" });
  }

  const [offer] = await db
    .insert(rfqOffers)
    .values({
      rfqId,
      supplierId,
      priceQuote: String(input.price_quote),
      currency: input.currency,
      leadTimeDays: input.lead_time_days ?? null,
      moq: input.moq != null ? String(input.moq) : null,
      message: input.message ?? null,
    })
    .onConflictDoUpdate({
      target: [rfqOffers.rfqId, rfqOffers.supplierId],
      set: {
        priceQuote: String(input.price_quote),
        currency: input.currency,
        leadTimeDays: input.lead_time_days ?? null,
        moq: input.moq != null ? String(input.moq) : null,
        message: input.message ?? null,
        status: "pending",
        updatedAt: new Date(),
      },
    })
    .returning({ id: rfqOffers.id });

  void createNotification({
    userId: rfq.buyerId,
    type: "rfq",
    title: "عرض جديد على طلبك · New RFQ offer",
    body: `وصلك عرض جديد على «${rfq.title}» · You received a new offer`,
    data: { rfq_id: rfqId, offer_id: offer.id },
  });

  return { id: offer.id, submitted: true };
}

/**
 * Buyer-only: award an offer. In a single transaction the chosen offer is
 * accepted, every competing offer is rejected, and the RFQ is marked awarded.
 * The winning supplier is notified best-effort.
 */
export async function acceptOffer(
  clerkId: string,
  rfqId: string,
  offerId: string
): Promise<{ rfq_id: string; offer_id: string; awarded: boolean }> {
  const buyerId = await resolveUserId(clerkId);

  const [rfq] = await db
    .select({ id: rfqs.id, buyerId: rfqs.buyerId, status: rfqs.status, title: rfqs.title })
    .from(rfqs)
    .where(eq(rfqs.id, rfqId))
    .limit(1);
  if (!rfq) throw Object.assign(new Error("RFQ not found"), { code: "NOT_FOUND" });
  if (rfq.buyerId !== buyerId) {
    throw Object.assign(new Error("Only the RFQ owner can award an offer"), { code: "FORBIDDEN" });
  }
  if (rfq.status !== "open") {
    throw Object.assign(new Error("This RFQ is no longer open"), { code: "CONFLICT" });
  }

  const [offer] = await db
    .select({ id: rfqOffers.id, supplierId: rfqOffers.supplierId })
    .from(rfqOffers)
    .where(and(eq(rfqOffers.id, offerId), eq(rfqOffers.rfqId, rfqId)))
    .limit(1);
  if (!offer) throw Object.assign(new Error("Offer not found"), { code: "NOT_FOUND" });

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(rfqOffers)
      .set({ status: "accepted", updatedAt: now })
      .where(eq(rfqOffers.id, offerId));
    await tx
      .update(rfqOffers)
      .set({ status: "rejected", updatedAt: now })
      .where(and(eq(rfqOffers.rfqId, rfqId), ne(rfqOffers.id, offerId)));
    await tx
      .update(rfqs)
      .set({ status: "awarded", updatedAt: now })
      .where(eq(rfqs.id, rfqId));
  });

  void createNotification({
    userId: offer.supplierId,
    type: "rfq",
    title: "قُبل عرضك · Offer accepted",
    body: `قُبل عرضك على «${rfq.title}» · Your offer was accepted`,
    data: { rfq_id: rfqId, offer_id: offerId },
  });

  return { rfq_id: rfqId, offer_id: offerId, awarded: true };
}
