import { db } from "@workspace/db";
import { users, transactions, invoices } from "@workspace/db/schema";
import { and, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import {
  generateInvoiceNumber,
  insufficientFunds,
  invalidData,
  notFound,
} from "../lib/billing";

/** The transaction handle passed to a `db.transaction(async (tx) => …)` body. */
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LedgerType =
  | "wallet_topup"
  | "boost_charge"
  | "subscription_charge"
  | "lead_charge"
  | "refund"
  | "adjustment";

export type LedgerPaymentMethod =
  | "vodafone_cash"
  | "fawry"
  | "instapay"
  | "bank_transfer"
  | "wallet";

export interface InvoiceLineItem {
  label: string;
  amount: string;
}

export interface ApplyTransactionInput {
  userId: string;
  type: LedgerType;
  /** Direction of the money movement relative to the wallet. */
  direction: "credit" | "debit";
  /** Positive magnitude in EGP (sign is derived from `direction`). */
  amount: number | string;
  paymentMethod?: LedgerPaymentMethod | null;
  /** Polymorphic link to the originating entity. */
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  /** Makes the write replay-safe; a prior row with this key is a no-op. */
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  /** When provided, an invoice row is written atomically in the same tx. */
  invoice?: { lineItems: InvoiceLineItem[] } | null;
}

export interface ApplyTransactionResult {
  transactionId: string;
  /** Wallet balance immediately after this entry, as a string. */
  balanceAfter: string;
  /** The signed amount persisted to the ledger. */
  amount: string;
  /** True when an existing entry matched the idempotency key (no-op replay). */
  replayed: boolean;
}

/**
 * THE wallet money chokepoint. Every balance change in the system flows through
 * here. Must be called INSIDE a caller-owned `db.transaction` so the balance
 * mutation and the ledger insert (and optional invoice) commit atomically.
 *
 * Invariants enforced:
 *  - Single source of truth: `users.wallet_balance`. The ledger mirrors it, so
 *    `wallet_balance == SUM(transactions.amount)` always holds.
 *  - Debits use a guarded atomic UPDATE (`… WHERE balance >= amt`). Zero rows
 *    affected ⇒ insufficient funds ⇒ INVALID_DATA. Never read-modify-write.
 *  - Ledger rows are immutable completed facts; reversals are new rows.
 *
 * Idempotency: when `idempotencyKey` is set, a pre-existing row short-circuits
 * to a replay result. The UNIQUE constraint on `idempotency_key` is the ultimate
 * guard against a concurrent double-apply — in that race the second insert throws
 * SQLSTATE 23505 and aborts its transaction; callers should detect this
 * (`isUniqueViolation`) and treat it as an already-applied success.
 */
export async function applyTransaction(
  tx: DbTx,
  input: ApplyTransactionInput
): Promise<ApplyTransactionResult> {
  const magnitude =
    typeof input.amount === "string" ? Number(input.amount) : input.amount;
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    throw invalidData("Transaction amount must be a positive number");
  }
  const money = magnitude.toFixed(2);

  // Idempotency fast-path: an existing entry means this was already applied.
  if (input.idempotencyKey) {
    const [existing] = await tx
      .select({
        id: transactions.id,
        balanceAfter: transactions.balanceAfter,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(eq(transactions.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      return {
        transactionId: existing.id,
        balanceAfter: existing.balanceAfter,
        amount: existing.amount,
        replayed: true,
      };
    }
  }

  // Mutate the single source of truth.
  let balanceAfter: string;
  if (input.direction === "debit") {
    const rows = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} - ${money}::numeric` })
      .where(
        and(
          eq(users.id, input.userId),
          sql`${users.walletBalance} >= ${money}::numeric`
        )
      )
      .returning({ balance: users.walletBalance });
    // Zero rows ⇒ user missing OR balance below the debit amount.
    if (rows.length === 0) {
      throw insufficientFunds();
    }
    balanceAfter = rows[0].balance;
  } else {
    const rows = await tx
      .update(users)
      .set({ walletBalance: sql`${users.walletBalance} + ${money}::numeric` })
      .where(eq(users.id, input.userId))
      .returning({ balance: users.walletBalance });
    if (rows.length === 0) {
      throw notFound("Wallet owner not found");
    }
    balanceAfter = rows[0].balance;
  }

  const signedAmount = input.direction === "debit" ? `-${money}` : money;

  const [row] = await tx
    .insert(transactions)
    .values({
      userId: input.userId,
      type: input.type,
      amount: signedAmount,
      balanceAfter,
      paymentMethod: input.paymentMethod ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: input.metadata ?? null,
    })
    .returning({ id: transactions.id });

  if (input.invoice) {
    await tx.insert(invoices).values({
      invoiceNumber: generateInvoiceNumber(row.id),
      userId: input.userId,
      transactionId: row.id,
      amount: money,
      status: "paid",
      lineItems: input.invoice.lineItems,
    });
  }

  return {
    transactionId: row.id,
    balanceAfter,
    amount: signedAmount,
    replayed: false,
  };
}

/** Current wallet balance for a user (string EGP). */
export async function getWalletBalance(userId: string): Promise<string> {
  const [row] = await db
    .select({ balance: users.walletBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) throw notFound("User not found");
  return row.balance;
}

export interface TransactionListItem {
  id: string;
  type: string;
  amount: string;
  balance_after: string;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface TransactionPage {
  items: TransactionListItem[];
  cursor?: string;
  hasNext: boolean;
}

const MAX_TX_PAGE = 50;

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

function parseIsoDate(value: string, label: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw invalidData(`Invalid ${label} date`);
  return d;
}

/**
 * Cursor-paginated transaction history for a user, newest first. The cursor is
 * a stable (created_at, id) keyset so concurrent inserts never skip/duplicate.
 */
export async function listTransactions(
  userId: string,
  opts: {
    limit?: number;
    cursor?: string;
    from?: string;
    to?: string;
    type?: LedgerType;
  } = {}
): Promise<TransactionPage> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), MAX_TX_PAGE);
  const decoded = opts.cursor ? decodeCursor(opts.cursor) : null;

  const filters = [eq(transactions.userId, userId)];

  if (opts.from) filters.push(gte(transactions.createdAt, parseIsoDate(opts.from, "from")));
  if (opts.to) filters.push(lte(transactions.createdAt, parseIsoDate(opts.to, "to")));
  if (opts.type) filters.push(eq(transactions.type, opts.type));

  if (decoded) {
    filters.push(
      or(
        lt(transactions.createdAt, new Date(decoded.ms)),
        and(
          eq(transactions.createdAt, new Date(decoded.ms)),
          lt(transactions.id, decoded.id)
        )
      )!
    );
  }

  const where = and(...filters);

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      balanceAfter: transactions.balanceAfter,
      paymentMethod: transactions.paymentMethod,
      referenceType: transactions.referenceType,
      referenceId: transactions.referenceId,
      description: transactions.description,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(where)
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(limit + 1);

  const hasNext = rows.length > limit;
  const page = hasNext ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    items: page.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      balance_after: r.balanceAfter,
      payment_method: r.paymentMethod,
      reference_type: r.referenceType,
      reference_id: r.referenceId,
      description: r.description,
      created_at: (r.createdAt ?? new Date()).toISOString(),
    })),
    cursor: hasNext && last?.createdAt ? encodeCursor(last.createdAt, last.id) : undefined,
    hasNext,
  };
}
