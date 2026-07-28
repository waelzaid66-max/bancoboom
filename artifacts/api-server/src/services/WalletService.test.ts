import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { applyTransaction, getWalletBalance } from "./WalletService";
import { db, createUser, deleteUsers, uniq } from "../__tests__/helpers";
import { transactions, invoices } from "@workspace/db/schema";

const uids: string[] = [];
async function user(walletBalance = "0"): Promise<string> {
  const id = await createUser({ walletBalance });
  uids.push(id);
  return id;
}

describe("applyTransaction (the money chokepoint)", () => {
  it("credits the wallet and mirrors the balance", async () => {
    const uid = await user("0");
    const r = await db.transaction((tx) =>
      applyTransaction(tx, { userId: uid, type: "wallet_topup", direction: "credit", amount: 500 }),
    );
    expect(r.replayed).toBe(false);
    expect(r.amount).toBe("500.00");
    expect(Number(r.balanceAfter)).toBe(500);
    expect(Number(await getWalletBalance(uid))).toBe(500);
  });

  it("debits the wallet with a signed ledger amount", async () => {
    const uid = await user("1000");
    const r = await db.transaction((tx) =>
      applyTransaction(tx, { userId: uid, type: "boost_charge", direction: "debit", amount: 300 }),
    );
    expect(r.amount).toBe("-300.00");
    expect(Number(r.balanceAfter)).toBe(700);
    expect(Number(await getWalletBalance(uid))).toBe(700);
  });

  it("rejects a debit beyond the balance and leaves the balance untouched", async () => {
    const uid = await user("100");
    await expect(
      db.transaction((tx) =>
        applyTransaction(tx, { userId: uid, type: "boost_charge", direction: "debit", amount: 500 }),
      ),
    ).rejects.toThrow();
    expect(Number(await getWalletBalance(uid))).toBe(100);
  });

  it("is replay-safe via the idempotency key (applies exactly once)", async () => {
    const uid = await user("0");
    const key = uniq("idem");
    const first = await db.transaction((tx) =>
      applyTransaction(tx, { userId: uid, type: "wallet_topup", direction: "credit", amount: 200, idempotencyKey: key }),
    );
    const second = await db.transaction((tx) =>
      applyTransaction(tx, { userId: uid, type: "wallet_topup", direction: "credit", amount: 200, idempotencyKey: key }),
    );
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.transactionId).toBe(first.transactionId);
    expect(Number(await getWalletBalance(uid))).toBe(200); // not 400
  });

  it("rolls back the balance and ledger when the surrounding transaction aborts", async () => {
    const uid = await user("0");
    await expect(
      db.transaction(async (tx) => {
        await applyTransaction(tx, { userId: uid, type: "wallet_topup", direction: "credit", amount: 500 });
        throw new Error("boom"); // abort AFTER the credit + ledger insert
      }),
    ).rejects.toThrow("boom");
    expect(Number(await getWalletBalance(uid))).toBe(0); // credit rolled back
    const rows = await db.select().from(transactions).where(eq(transactions.userId, uid));
    expect(rows).toHaveLength(0); // no orphan ledger row
  });

  it("writes the optional invoice atomically in the same transaction", async () => {
    const uid = await user("0");
    const r = await db.transaction((tx) =>
      applyTransaction(tx, {
        userId: uid,
        type: "wallet_topup",
        direction: "credit",
        amount: 1000,
        invoice: { lineItems: [{ label: "Top-up", amount: "1000.00" }] },
      }),
    );
    const inv = await db.select().from(invoices).where(eq(invoices.transactionId, r.transactionId));
    expect(inv).toHaveLength(1);
    expect(inv[0].status).toBe("paid");
    expect(Number(inv[0].amount)).toBe(1000);
  });
});

afterAll(async () => {
  if (uids.length) {
    await db.delete(invoices).where(inArray(invoices.userId, uids));
    await db.delete(transactions).where(inArray(transactions.userId, uids));
    await deleteUsers(...uids);
  }
});
