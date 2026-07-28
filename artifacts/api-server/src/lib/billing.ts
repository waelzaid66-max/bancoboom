/**
 * Shared billing primitives: money formatting, typed coded errors, Postgres
 * unique-violation detection, and deterministic invoice numbering.
 *
 * Money crosses the API as strings and is stored as Postgres `numeric`. All
 * amounts handled here are EGP with 2-decimal precision.
 */

export type CodedError = Error & { code: string };

export function codedError(message: string, code: string): CodedError {
  return Object.assign(new Error(message), { code });
}

export const invalidData = (message: string): CodedError =>
  codedError(message, "INVALID_DATA");
export const notFound = (message: string): CodedError =>
  codedError(message, "NOT_FOUND");
export const unauthorized = (message: string): CodedError =>
  codedError(message, "UNAUTHORIZED");

/**
 * Insufficient wallet balance → surfaced as 400 INVALID_DATA. Carries an
 * `insufficient` marker so callers (e.g. CPL billing) can distinguish a "can't
 * afford" outcome from other validation errors WITHOUT aborting their
 * transaction.
 */
export const insufficientFunds = (
  message = "Insufficient wallet balance"
): CodedError =>
  Object.assign(codedError(message, "INVALID_DATA"), { insufficient: true });

/** True when an error is specifically an insufficient-funds failure. */
export function isInsufficientFunds(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { insufficient?: boolean }).insufficient === true
  );
}

/**
 * Normalize a monetary value to a fixed 2-decimal string. Throws INVALID_DATA
 * for non-finite input so bad amounts never reach the ledger.
 */
export function toMoney(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) {
    throw invalidData("Invalid monetary amount");
  }
  return n.toFixed(2);
}

/** Detect a Postgres unique-constraint violation (SQLSTATE 23505). */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}

/**
 * Deterministic, human-readable invoice number derived from a transaction id.
 * The invoice_number column is UNIQUE, so this is the authoritative guard; the
 * 12-hex suffix makes same-day collisions astronomically unlikely.
 */
export function generateInvoiceNumber(transactionId: string): string {
  const d = new Date();
  const ymd =
    `${d.getUTCFullYear()}` +
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(d.getUTCDate()).padStart(2, "0")}`;
  const suffix = transactionId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `INV-${ymd}-${suffix}`;
}
