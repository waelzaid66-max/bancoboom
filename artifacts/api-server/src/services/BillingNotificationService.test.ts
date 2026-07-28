import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, createUser, deleteUsers } from "../__tests__/helpers";
import { notifications, paymentIntents } from "@workspace/db/schema";
import {
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyPaymentIntentFailed,
} from "./BillingNotificationService";
import { markTopupIntentFailed } from "./PaymentIntentService";

const uids: string[] = [];

afterAll(async () => {
  await deleteUsers(...uids);
});

describe("BillingNotificationService", () => {
  it("creates payment_success in-app notification with real ledger data", async () => {
    const uid = await createUser({ walletBalance: "100" });
    uids.push(uid);
    const txId = randomUUID();

    await notifyPaymentSuccess({
      userId: uid,
      kind: "wallet_topup",
      amount: "250.00",
      balanceAfter: "350.00",
      transactionId: txId,
      description: "Wallet top-up via fawry",
    });

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, uid));
    expect(rows.some((r) => r.type === "payment_success")).toBe(true);
    const n = rows.find((r) => r.type === "payment_success");
    expect(n?.data).toMatchObject({
      transaction_id: txId,
      amount: "250.00",
      balance_after: "350.00",
    });
  });

  it("creates payment_failed notification when intent is marked failed", async () => {
    const uid = await createUser();
    uids.push(uid);
    const intentId = randomUUID();
    await db.insert(paymentIntents).values({
      id: intentId,
      userId: uid,
      amount: "99.00",
      method: "fawry",
      purpose: "wallet_topup",
      status: "pending",
    });

    await markTopupIntentFailed(intentId);
    await new Promise((r) => setImmediate(r));

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, uid));
    expect(rows.some((r) => r.type === "payment_failed")).toBe(true);
  });

  it("notifyPaymentFailed attaches intent metadata", async () => {
    const uid = await createUser();
    uids.push(uid);
    const intentId = randomUUID();

    await notifyPaymentFailed({
      userId: uid,
      amount: "50.00",
      method: "vodafone_cash",
      purpose: "wallet_topup",
      intentId,
    });

    const [row] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, uid))
      .limit(1);
    expect(row?.type).toBe("payment_failed");
    expect(row?.data).toMatchObject({ intent_id: intentId, amount: "50.00" });
  });

  it("notifyPaymentIntentFailed is a no-op when intent is not failed", async () => {
    const uid = await createUser();
    uids.push(uid);
    const intentId = randomUUID();
    await db.insert(paymentIntents).values({
      id: intentId,
      userId: uid,
      amount: "10.00",
      method: "fawry",
      purpose: "wallet_topup",
      status: "pending",
    });

    await notifyPaymentIntentFailed(intentId);
    const rows = await db.select().from(notifications).where(eq(notifications.userId, uid));
    expect(rows.length).toBe(0);
  });
});
