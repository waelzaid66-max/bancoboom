import { db } from "@workspace/db";
import {
  invoices,
  notifications,
  paymentIntents,
  plans,
  subscriptions,
  users,
} from "@workspace/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  isEmailChannelEnabled,
  sendBillingFailedEmail,
  sendBillingReceiptEmail,
  sendSubscriptionExpiringEmail,
  type BillingEmailCategory,
  type BillingReceiptKind,
} from "./EmailService";
import { createNotification } from "./NotificationService";

const EXPIRING_HORIZON_DAYS = 3;

export interface BillingReceiptPayload {
  userId: string;
  kind: BillingReceiptKind;
  amount: string;
  balanceAfter: string;
  transactionId: string;
  description?: string | null;
  invoiceNumber?: string | null;
  planName?: string | null;
}

export interface BillingFailedPayload {
  userId: string;
  amount: string;
  method: string;
  purpose: "wallet_topup" | "subscription";
  intentId: string;
}

function receiptLabel(kind: BillingReceiptKind, ar: boolean): string {
  switch (kind) {
    case "wallet_topup":
      return ar ? "شحن المحفظة" : "Wallet top-up";
    case "subscription_charge":
      return ar ? "اشتراك" : "Subscription";
    case "lead_charge":
      return ar ? "رسوم مهتم" : "Lead charge";
  }
}

function receiptBody(
  kind: BillingReceiptKind,
  amount: string,
  ar: boolean,
  planName?: string | null,
): string {
  const label = receiptLabel(kind, ar);
  if (kind === "subscription_charge" && planName) {
    return ar
      ? `تم خصم ${amount} ج.م لاشتراك ${planName}.`
      : `${amount} EGP charged for ${planName}.`;
  }
  return ar
    ? `تم تسجيل ${label} بمبلغ ${amount} ج.م.`
    : `${label} of ${amount} EGP recorded.`;
}

async function resolveUserContact(userId: string) {
  const [row] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

async function resolveInvoiceNumber(transactionId: string): Promise<string | null> {
  const [row] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.transactionId, transactionId))
    .limit(1);
  return row?.invoiceNumber ?? null;
}

/**
 * In-app + email receipt after a successful ledger write (top-up, subscription,
 * lead charge). Best-effort; never blocks the financial transaction.
 */
export async function notifyPaymentSuccess(
  payload: BillingReceiptPayload,
): Promise<void> {
  const invoiceNumber =
    payload.invoiceNumber ??
    (await resolveInvoiceNumber(payload.transactionId));

  const data = {
    transaction_id: payload.transactionId,
    kind: payload.kind,
    amount: payload.amount,
    balance_after: payload.balanceAfter,
    invoice_number: invoiceNumber,
    plan_name: payload.planName ?? null,
  };

  const arBody = receiptBody(payload.kind, payload.amount, true, payload.planName);
  const enBody = receiptBody(payload.kind, payload.amount, false, payload.planName);

  await createNotification({
    userId: payload.userId,
    type: "payment_success",
    title: "تم الدفع بنجاح · Payment successful",
    body: `${arBody} · ${enBody}`,
    data,
  });

  try {
    if (!(await isEmailChannelEnabled(payload.userId, "payment_success"))) return;
    const contact = await resolveUserContact(payload.userId);
    if (!contact?.email) return;

    await sendBillingReceiptEmail({
      to: contact.email,
      name: contact.name,
      kind: payload.kind,
      amount: payload.amount,
      balanceAfter: payload.balanceAfter,
      description: payload.description ?? undefined,
      invoiceNumber,
      planName: payload.planName ?? undefined,
    });
  } catch (err) {
    logger.error({ err, userId: payload.userId }, "Billing receipt email failed");
  }
}

/** Schedule notifyPaymentSuccess off the request/transaction hot path. */
export function schedulePaymentSuccess(payload: BillingReceiptPayload): void {
  setImmediate(() => {
    void notifyPaymentSuccess(payload).catch((err) =>
      logger.error({ err, userId: payload.userId }, "Billing success notification failed"),
    );
  });
}

/**
 * In-app + email when a PSP checkout fails (declined/cancelled webhook).
 */
export async function notifyPaymentFailed(payload: BillingFailedPayload): Promise<void> {
  const purposeLabel =
    payload.purpose === "subscription"
      ? { ar: "اشتراك", en: "subscription" }
      : { ar: "شحن المحفظة", en: "wallet top-up" };

  await createNotification({
    userId: payload.userId,
    type: "payment_failed",
    title: "فشل الدفع · Payment failed",
    body: `لم يكتمل ${purposeLabel.ar} (${payload.amount} ج.م عبر ${payload.method}) · The ${purposeLabel.en} payment did not complete.`,
    data: {
      intent_id: payload.intentId,
      amount: payload.amount,
      method: payload.method,
      purpose: payload.purpose,
    },
  });

  try {
    if (!(await isEmailChannelEnabled(payload.userId, "payment_failed"))) return;
    const contact = await resolveUserContact(payload.userId);
    if (!contact?.email) return;

    await sendBillingFailedEmail({
      to: contact.email,
      name: contact.name,
      amount: payload.amount,
      method: payload.method,
      purpose: payload.purpose,
    });
  } catch (err) {
    logger.error({ err, userId: payload.userId }, "Billing failed email failed");
  }
}

export function schedulePaymentFailed(payload: BillingFailedPayload): void {
  setImmediate(() => {
    void notifyPaymentFailed(payload).catch((err) =>
      logger.error({ err, userId: payload.userId }, "Billing failure notification failed"),
    );
  });
}

async function alreadyNotifiedExpiring(
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, "subscription_expiring"),
        gte(notifications.createdAt, weekAgo),
        sql`${notifications.data}->>'subscription_id' = ${subscriptionId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Daily job: warn users whose paid subscription expires within
 * {@link EXPIRING_HORIZON_DAYS} days. Deduped per subscription per week.
 */
export async function notifySubscriptionsExpiringSoon(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + EXPIRING_HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: subscriptions.userId,
      expiresAt: subscriptions.expiresAt,
      planName: plans.name,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        gte(subscriptions.expiresAt, now),
        lte(subscriptions.expiresAt, horizon),
      ),
    );

  let sent = 0;
  for (const row of rows) {
    if (!row.expiresAt) continue;
    if (await alreadyNotifiedExpiring(row.userId, row.subscriptionId)) continue;

    const expiresIso = row.expiresAt.toISOString();
    const daysLeft = Math.max(
      1,
      Math.ceil((row.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    await createNotification({
      userId: row.userId,
      type: "subscription_expiring",
      title: "اشتراكك ينتهي قريباً · Subscription expiring soon",
      body: `اشتراك ${row.planName} ينتهي خلال ${daysLeft} يوم · Your ${row.planName} plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
      data: {
        subscription_id: row.subscriptionId,
        plan_name: row.planName,
        expires_at: expiresIso,
        days_left: daysLeft,
      },
    });

    try {
      const category: BillingEmailCategory = "subscription_expiring";
      if (await isEmailChannelEnabled(row.userId, category)) {
        const contact = await resolveUserContact(row.userId);
        if (contact?.email) {
          await sendSubscriptionExpiringEmail({
            to: contact.email,
            name: contact.name,
            planName: row.planName,
            expiresAt: expiresIso,
            daysLeft,
          });
        }
      }
    } catch (err) {
      logger.error(
        { err, userId: row.userId, subscriptionId: row.subscriptionId },
        "Subscription expiring email failed",
      );
    }

    sent += 1;
  }

  return sent;
}

/** Load intent owner + fields for failure notifications after mark failed. */
export async function notifyPaymentIntentFailed(intentId: string): Promise<void> {
  const [intent] = await db
    .select({
      userId: paymentIntents.userId,
      amount: paymentIntents.amount,
      method: paymentIntents.method,
      purpose: paymentIntents.purpose,
      status: paymentIntents.status,
    })
    .from(paymentIntents)
    .where(eq(paymentIntents.id, intentId))
    .limit(1);

  if (!intent || intent.status !== "failed") return;
  if (intent.purpose !== "wallet_topup" && intent.purpose !== "subscription") return;

  try {
    await notifyPaymentFailed({
      userId: intent.userId,
      amount: intent.amount,
      method: intent.method,
      purpose: intent.purpose,
      intentId,
    });
  } catch (err) {
    logger.error({ err, intentId }, "Payment intent failure notification failed");
  }
}
