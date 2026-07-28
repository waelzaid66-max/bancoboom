import { db } from "@workspace/db";
import { importOrders, listings, users } from "@workspace/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import type { ImportOrder, ImportOrderListItem } from "../validators/schemas";

export interface CreateImportOrderInput {
  listing_id?: string;
  origin_country?: string;
  destination_country?: string;
  details?: Record<string, unknown>;
  budget_amount?: number;
  currency?: string;
  note?: string;
}

async function resolveUserId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user)
    throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });
  return user.id;
}

function toDto(row: typeof importOrders.$inferSelect): ImportOrder {
  return {
    id: row.id,
    user_id: row.userId,
    listing_id: row.listingId ?? null,
    stage: row.stage,
    origin_country: row.originCountry ?? null,
    destination_country: row.destinationCountry ?? null,
    details: (row.details as Record<string, unknown> | null) ?? null,
    budget_amount: row.budgetAmount ?? null,
    quote_amount: row.quoteAmount ?? null,
    currency: row.currency ?? null,
    notes: row.notes ?? null,
    created_at: row.createdAt
      ? row.createdAt.toISOString()
      : new Date().toISOString(),
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

// Create a car-import order from the buyer's request. Starts at stage "order"
// and fires a best-effort car_import notification to the buyer.
export async function createImportOrder(
  clerkId: string,
  input: CreateImportOrderInput
): Promise<{ id: string }> {
  const userId = await resolveUserId(clerkId);

  const [created] = await db
    .insert(importOrders)
    .values({
      userId,
      listingId: input.listing_id ?? null,
      originCountry: input.origin_country ?? null,
      destinationCountry: input.destination_country ?? null,
      details: input.details ?? null,
      budgetAmount:
        input.budget_amount != null ? String(input.budget_amount) : null,
      currency: input.currency ?? null,
      notes: input.note ?? null,
    })
    .returning({ id: importOrders.id });

  await createNotification({
    userId,
    type: "car_import",
    title: "Import request received",
    body: "We received your car-import request and started reviewing it.",
  });

  return { id: created.id };
}

// The signed-in buyer's own import orders, newest first (drives the tracking
// screen). Enriched with the listing title when the order references a listing.
export async function listMyImportOrders(
  clerkId: string
): Promise<ImportOrderListItem[]> {
  const userId = await resolveUserId(clerkId);

  const rows = await db
    .select({
      id: importOrders.id,
      stage: importOrders.stage,
      origin_country: importOrders.originCountry,
      destination_country: importOrders.destinationCountry,
      budget_amount: importOrders.budgetAmount,
      currency: importOrders.currency,
      listing_title: listings.title,
      created_at: importOrders.createdAt,
      updated_at: importOrders.updatedAt,
    })
    .from(importOrders)
    .leftJoin(listings, eq(importOrders.listingId, listings.id))
    .where(eq(importOrders.userId, userId))
    .orderBy(desc(importOrders.createdAt));

  return rows.map((r) => ({
    id: r.id,
    stage: r.stage,
    origin_country: r.origin_country ?? null,
    destination_country: r.destination_country ?? null,
    budget_amount: r.budget_amount ?? null,
    currency: r.currency ?? null,
    listing_title: r.listing_title ?? null,
    created_at: r.created_at
      ? r.created_at.toISOString()
      : new Date().toISOString(),
    updated_at: r.updated_at ? r.updated_at.toISOString() : null,
  }));
}

// A single import order owned by the signed-in buyer (IDOR-scoped by userId).
export async function getImportOrder(
  clerkId: string,
  id: string
): Promise<ImportOrder | null> {
  const userId = await resolveUserId(clerkId);
  const [row] = await db
    .select()
    .from(importOrders)
    .where(and(eq(importOrders.id, id), eq(importOrders.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toDto(row);
}
