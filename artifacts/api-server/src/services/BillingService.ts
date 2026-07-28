import { db } from "@workspace/db";
import { invoices, transactions } from "@workspace/db/schema";
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { invalidData, notFound } from "../lib/billing";

export interface InvoiceLineItem {
  label: string;
  amount: string;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  amount: string;
  status: "paid" | "void";
  transaction_id: string;
  transaction_type: string | null;
  description: string | null;
  line_items: InvoiceLineItem[] | null;
  issued_at: string | null;
  created_at: string | null;
}

export interface InvoicePage {
  items: InvoiceItem[];
  cursor?: string;
  hasNext: boolean;
}

const MAX_INVOICE_PAGE = 50;

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { ms: number; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = raw.indexOf("_");
    if (idx < 0) return null;
    const ms = Number(raw.slice(0, idx));
    const id = raw.slice(idx + 1);
    if (!Number.isFinite(ms) || !id) return null;
    return { ms, id };
  } catch {
    return null;
  }
}

// Line items are stored as untyped jsonb; coerce defensively to the public shape.
function normalizeLineItems(raw: unknown): InvoiceLineItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({ label: String(r.label ?? ""), amount: String(r.amount ?? "0") }));
  return items.length ? items : null;
}

/**
 * Cursor-paginated invoices for a user, newest first. Keyset on (created_at, id)
 * so concurrent inserts never skip or duplicate a row. Each invoice is joined to
 * its ledger transaction to surface the charge `type`.
 */
export async function listInvoices(
  userId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<InvoicePage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), MAX_INVOICE_PAGE);
  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const where = decoded
    ? and(
        eq(invoices.userId, userId),
        or(
          lt(invoices.createdAt, new Date(decoded.ms)),
          and(
            eq(invoices.createdAt, new Date(decoded.ms)),
            lt(invoices.id, decoded.id)
          )
        )
      )
    : eq(invoices.userId, userId);

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      amount: invoices.amount,
      status: invoices.status,
      transactionId: invoices.transactionId,
      transactionType: transactions.type,
      description: transactions.description,
      lineItems: invoices.lineItems,
      issuedAt: invoices.issuedAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(transactions, eq(transactions.id, invoices.transactionId))
    .where(where)
    .orderBy(desc(invoices.createdAt), desc(invoices.id))
    .limit(limit + 1);

  const hasNext = rows.length > limit;
  const page = hasNext ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      id: r.id,
      invoice_number: r.invoiceNumber,
      amount: r.amount,
      status: r.status,
      transaction_id: r.transactionId,
      transaction_type: r.transactionType ?? null,
      description: r.description ?? null,
      line_items: normalizeLineItems(r.lineItems),
      issued_at: r.issuedAt ? r.issuedAt.toISOString() : null,
      created_at: r.createdAt ? r.createdAt.toISOString() : null,
    })),
    cursor:
      hasNext && last?.createdAt ? encodeCursor(last.createdAt, last.id) : undefined,
    hasNext,
  };
}

/**
 * A single invoice the caller owns. The `userId` predicate is the IDOR guard —
 * an invoice belonging to another user reads as not-found.
 */
export async function getInvoice(
  userId: string,
  invoiceId: string
): Promise<InvoiceItem> {
  const [row] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      amount: invoices.amount,
      status: invoices.status,
      transactionId: invoices.transactionId,
      transactionType: transactions.type,
      description: transactions.description,
      lineItems: invoices.lineItems,
      issuedAt: invoices.issuedAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(transactions, eq(transactions.id, invoices.transactionId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1);

  if (!row) throw notFound("Invoice not found");

  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    amount: row.amount,
    status: row.status,
    transaction_id: row.transactionId,
    transaction_type: row.transactionType ?? null,
    description: row.description ?? null,
    line_items: normalizeLineItems(row.lineItems),
    issued_at: row.issuedAt ? row.issuedAt.toISOString() : null,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

export interface BillingReportLine {
  type:
    | "wallet_topup"
    | "boost_charge"
    | "subscription_charge"
    | "lead_charge"
    | "refund"
    | "adjustment";
  total: string;
  count: number;
}

export interface BillingReport {
  month: string;
  currency: "EGP";
  total_charged: string;
  total_topped_up: string;
  transaction_count: number;
  by_type: BillingReportLine[];
}

// Resolve a `YYYY-MM` string (default = current UTC month) to a [start, end)
// half-open UTC range covering that calendar month.
function monthRange(month?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  let year: number;
  let mon: number; // 1-12
  if (month) {
    const [y, m] = month.split("-").map((s) => Number(s));
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      throw invalidData("Invalid report month");
    }
    year = y;
    mon = m;
  } else {
    year = now.getUTCFullYear();
    mon = now.getUTCMonth() + 1;
  }
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  const label = `${year}-${String(mon).padStart(2, "0")}`;
  return { start, end, label };
}

/**
 * Monthly billing summary for a user, computed directly from the immutable
 * ledger (the single source of truth). Amounts are signed in the ledger
 * (credits +, debits −); `total_charged` reports the magnitude of debits and
 * `total_topped_up` the sum of credits.
 */
export async function getBillingReport(
  userId: string,
  opts: { month?: string } = {}
): Promise<BillingReport> {
  const { start, end, label } = monthRange(opts.month);

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`sum(${transactions.amount})`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, start),
        lt(transactions.createdAt, end)
      )
    )
    .groupBy(transactions.type);

  let charged = 0;
  let toppedUp = 0;
  let txCount = 0;
  const byType: BillingReportLine[] = rows.map((r) => {
    const total = Number(r.total ?? 0);
    if (total < 0) charged += -total;
    else toppedUp += total;
    txCount += r.count;
    return {
      type: r.type,
      total: total.toFixed(2),
      count: r.count,
    };
  });

  return {
    month: label,
    currency: "EGP",
    total_charged: charged.toFixed(2),
    total_topped_up: toppedUp.toFixed(2),
    transaction_count: txCount,
    by_type: byType,
  };
}
