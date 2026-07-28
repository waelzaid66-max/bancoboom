import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, createUser, deleteUsers } from "../__tests__/helpers";
import { paymentIntents } from "@workspace/db/schema";
import {
  settleTopupIntent,
  markTopupIntentFailed,
  getIntentMeta,
} from "./PaymentIntentService";
import { getWalletBalance } from "./WalletService";

// Settlement is config-free (it credits the wallet from a stored intent), so
// this suite never touches the payment_provider_config row. Signature
// verification — which DOES read the resolved config — lives in
// PaymentConfigService.test.ts so only one suite owns the singleton config row.

const uids: string[] = [];
async function pendingTopup(amount: string): Promise<string> {
  const uid = await createUser({ walletBalance: "0" });
  uids.push(uid);
  const intentId = randomUUID();
  await db.insert(paymentIntents).values({
    id: intentId,
    userId: uid,
    amount,
    method: "fawry",
    purpose: "wallet_topup",
    status: "pending",
    providerRef: "intention_test",
  });
  return intentId;
}

afterAll(async () => {
  await deleteUsers(...uids);
});

describe("settleTopupIntent (webhook-driven settlement)", () => {
  it("credits the wallet and completes the intent exactly once", async () => {
    const intentId = await pendingTopup("750.00");
    const meta = await getIntentMeta(intentId);
    expect(meta?.purpose).toBe("wallet_topup");

    await settleTopupIntent(intentId, { providerTxnId: "txn_1" });

    const [row] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, intentId));
    expect(row.status).toBe("completed");
    expect(Number(await getWalletBalance(row.userId))).toBe(750);

    // Replay must be a no-op (idempotent webhook delivery).
    await settleTopupIntent(intentId, { providerTxnId: "txn_1" });
    expect(Number(await getWalletBalance(row.userId))).toBe(750);
  });

  it("does not credit when the intent is marked failed", async () => {
    const intentId = await pendingTopup("400.00");
    await markTopupIntentFailed(intentId);

    const [row] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.id, intentId));
    expect(row.status).toBe("failed");
    expect(Number(await getWalletBalance(row.userId))).toBe(0);

    // A failed intent can no longer be settled.
    await expect(settleTopupIntent(intentId)).rejects.toThrow();
    expect(Number(await getWalletBalance(row.userId))).toBe(0);
  });
});
