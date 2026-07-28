"use client";

import { usePathname } from "next/navigation";
import {
  confirmTopup,
  createTopup,
  getGetWalletQueryKey,
  getListTransactionsQueryKey,
  listTransactions,
  useGetPromoAdSummary,
  useGetWallet,
  useListTransactions,
  type CreateTopupBodyMethod,
  type WalletTransaction,
  type WalletTransactionType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { localeFromPathname } from "../../lib/hub-config";
import {
  TX_CREDIT,
  WALLET_METHODS,
  WALLET_PAGE_SIZE,
  WALLET_PRESETS,
  fmtMoney,
  formatWalletDate,
} from "../../lib/wallet-ledger";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

type PayState = "idle" | "processing" | "done" | "error" | "pending";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
};

const btnPrimary: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.55rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
};

function txLabel(type: WalletTransactionType, copy: ReturnType<typeof workspaceUiCopy>): string {
  const map: Record<WalletTransactionType, string> = {
    wallet_topup: copy.walletTxWalletTopup,
    boost_charge: copy.walletTxBoostCharge,
    subscription_charge: copy.walletTxSubscriptionCharge,
    lead_charge: copy.walletTxLeadCharge,
    refund: copy.walletTxRefund,
    adjustment: copy.walletTxAdjustment,
  };
  return map[type];
}

function methodLabel(method: CreateTopupBodyMethod, copy: ReturnType<typeof workspaceUiCopy>): string {
  const map: Record<CreateTopupBodyMethod, string> = {
    vodafone_cash: copy.walletMethodVodafone,
    fawry: copy.walletMethodFawry,
    instapay: copy.walletMethodInstapay,
    bank_transfer: copy.walletMethodBank,
  };
  return map[method];
}

export function WalletPanel() {
  const pathname = usePathname() ?? "/workspace/wallet";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const queryClient = useQueryClient();
  const egp = locale === "ar" ? "ج.م" : "EGP";

  const walletQuery = useGetWallet({
    query: { queryKey: getGetWalletQueryKey() },
  });
  const promoQuery = useGetPromoAdSummary();
  const txQuery = useListTransactions(
    { limit: WALLET_PAGE_SIZE },
    { query: { queryKey: getListTransactionsQueryKey({ limit: WALLET_PAGE_SIZE }) } },
  );

  const [extraTxns, setExtraTxns] = useState<WalletTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState(false);
  const [method, setMethod] = useState<CreateTopupBodyMethod>("vodafone_cash");
  const [payState, setPayState] = useState<PayState>("idle");
  const [newBalance, setNewBalance] = useState<string | null>(null);

  const refreshWallet = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    void queryClient.invalidateQueries({
      queryKey: getListTransactionsQueryKey({ limit: WALLET_PAGE_SIZE }),
    });
    setExtraTxns([]);
    setNextCursor(null);
  }, [queryClient]);

  const pollTopup = useCallback(async (intentId: string) => {
    const ATTEMPTS = 12;
    const DELAY_MS = 2500;
    for (let i = 0; i < ATTEMPTS; i++) {
      try {
        const res = await confirmTopup(intentId);
        const status = res.data?.status;
        if (status && status !== "pending") {
          return { status, balance: res.data?.balance ?? null };
        }
      } catch {
        // transient — keep polling
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    return { status: "pending" as const, balance: null };
  }, []);

  const handleTopup = async () => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    try {
      setPayState("processing");
      const res = await createTopup({ amount: amt, method });
      const intent = res.data;
      if (!intent?.intent_id || !intent.checkout_url) {
        throw new Error("no checkout");
      }
      window.open(intent.checkout_url, "_blank", "noopener,noreferrer");
      const polled = await pollTopup(intent.intent_id);
      if (polled.status === "completed") {
        setNewBalance(polled.balance);
        setPayState("done");
        refreshWallet();
      } else if (polled.status === "pending") {
        setPayState("pending");
        refreshWallet();
      } else {
        setPayState("error");
      }
    } catch {
      setPayState("error");
    }
  };

  const loadMore = async () => {
    const cursor =
      nextCursor ?? (extraTxns.length === 0 ? txQuery.data?.meta?.cursor ?? null : null);
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listTransactions({ limit: WALLET_PAGE_SIZE, cursor });
      setExtraTxns((prev) => [...prev, ...(res.data ?? [])]);
      setNextCursor(res.meta?.has_next ? res.meta?.cursor ?? null : null);
    } catch {
      // keep existing rows
    } finally {
      setLoadingMore(false);
    }
  };

  if (walletQuery.isLoading || txQuery.isLoading) {
    return <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>;
  }
  if (walletQuery.isError || txQuery.isError) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
        <p style={{ fontWeight: 700, margin: "0 0 0.35rem" }}>{copy.walletErrorTitle}</p>
        <p style={{ color: "var(--banco-muted)", margin: "0 0 1rem" }}>{copy.walletErrorBody}</p>
        <button type="button" style={btnPrimary} onClick={() => refreshWallet()}>
          {copy.retry}
        </button>
      </div>
    );
  }

  const wallet = walletQuery.data?.data;
  const promo = promoQuery.data?.data ?? null;
  const promoBalance = promo ? Number(promo.balance) : 0;
  const showPromo = !!promo && promo.campaign_enabled;
  const baseRows = txQuery.data?.data ?? [];
  const rows = [...baseRows, ...extraTxns];
  const hasMore =
    nextCursor !== null || (extraTxns.length === 0 && !!txQuery.data?.meta?.has_next);

  return (
    <>
      <h2 style={{ margin: "0 0 0.75rem" }}>{copy.walletTitle}</h2>

      <div
        style={{
          ...cardStyle,
          marginBottom: "0.85rem",
          background: "var(--banco-primary)",
          color: "#fff",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>{copy.walletAvailable}</p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "1.75rem", fontWeight: 700 }}>
          {egp} {fmtMoney(wallet?.balance)}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", opacity: 0.9 }}>{copy.walletBalanceHint}</p>
      </div>

      <button type="button" style={{ ...btnPrimary, width: "100%", marginBottom: "1rem" }} onClick={() => {
        setAmount("");
        setAmountError(false);
        setMethod("vodafone_cash");
        setPayState("idle");
        setNewBalance(null);
        setSheetOpen(true);
      }}>
        + {copy.walletAddFunds}
      </button>

      {showPromo ? (
        <div style={{ ...cardStyle, marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{copy.walletPromoTitle}</p>
          {promoBalance > 0 ? (
            <>
              <p style={{ margin: "0.5rem 0 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--banco-primary)" }}>
                {egp} {fmtMoney(promo?.balance)}
              </p>
              {promo?.expires_at ? (
                <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--banco-muted)" }}>
                  {copy.walletPromoExpires.replace("{date}", formatWalletDate(promo.expires_at, locale))}
                </p>
              ) : null}
            </>
          ) : (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--banco-muted)" }}>
              {copy.walletPromoNone}
            </p>
          )}
          {promo?.campaign_active &&
          (promo?.months_remaining ?? 0) > 0 &&
          Number(promo?.monthly_amount ?? 0) > 0 ? (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--banco-muted)" }}>
              {copy.walletPromoMonthly.replace("{amount}", fmtMoney(promo?.monthly_amount))}
            </p>
          ) : null}
        </div>
      ) : null}

      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>{copy.walletTransactions}</h3>
      {rows.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{copy.walletEmptyTitle}</p>
          <p style={{ margin: "0.35rem 0 0", color: "var(--banco-muted)", fontSize: "0.88rem" }}>
            {copy.walletEmptyHint}
          </p>
        </div>
      ) : (
        <div style={cardStyle}>
          {rows.map((tx, i) => {
            const credit = TX_CREDIT[tx.type];
            const value = Math.abs(parseFloat(tx.amount) || 0);
            const sign = credit === true ? "+" : credit === false ? "−" : "";
            const amountColor =
              credit === true ? "var(--banco-primary)" : credit === false ? "var(--banco-fg)" : "var(--banco-muted)";
            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "0.75rem 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--banco-border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                    {tx.description?.trim() ? tx.description : txLabel(tx.type, copy)}
                  </p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--banco-muted)" }}>
                    {formatWalletDate(tx.created_at, locale)}
                  </p>
                </div>
                <span style={{ fontWeight: 700, color: amountColor, whiteSpace: "nowrap" }}>
                  {sign}
                  {egp} {fmtMoney(value)}
                </span>
              </div>
            );
          })}
          {hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              style={{
                width: "100%",
                border: "none",
                borderTop: "1px solid var(--banco-border)",
                background: "transparent",
                color: "var(--banco-primary)",
                padding: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loadingMore ? copy.loading : copy.walletLoadMore}
            </button>
          ) : null}
        </div>
      )}

      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => payState !== "processing" && setSheetOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "var(--banco-bg)",
              borderRadius: "12px 12px 0 0",
              padding: "1.25rem 1.25rem 1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {payState === "done" ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{copy.walletDoneTitle}</p>
                {newBalance !== null ? (
                  <p style={{ color: "var(--banco-muted)", margin: "0.5rem 0 1rem" }}>
                    {copy.walletDoneBody.replace("{balance}", `${egp} ${fmtMoney(newBalance)}`)}
                  </p>
                ) : null}
                <button type="button" style={{ ...btnPrimary, width: "100%" }} onClick={() => setSheetOpen(false)}>
                  {copy.walletDone}
                </button>
              </div>
            ) : payState === "pending" ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{copy.walletAwaitingTitle}</p>
                <p style={{ color: "var(--banco-muted)", margin: "0.5rem 0 1rem", lineHeight: 1.6 }}>
                  {copy.walletAwaitingBody}
                </p>
                <button type="button" style={{ ...btnPrimary, width: "100%" }} onClick={() => setSheetOpen(false)}>
                  {copy.walletDone}
                </button>
              </div>
            ) : (
              <>
                <p style={{ margin: "0 0 1rem", fontWeight: 700, fontSize: "1.1rem" }}>{copy.walletAddFunds}</p>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--banco-muted)" }}>
                  {copy.walletAmountLabel}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                      setAmountError(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "0.35rem",
                      padding: "0.6rem 0.75rem",
                      border: `1px solid ${amountError ? "var(--banco-primary)" : "var(--banco-border)"}`,
                      borderRadius: 8,
                      background: "var(--banco-card)",
                      color: "var(--banco-fg)",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
                  {WALLET_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAmount(String(p));
                        setAmountError(false);
                      }}
                      style={{
                        border: "1px solid var(--banco-border)",
                        borderRadius: 8,
                        background: "transparent",
                        padding: "0.4rem 0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {fmtMoney(p)}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "1rem 0 0.35rem", fontSize: "0.85rem", color: "var(--banco-muted)" }}>
                  {copy.walletMethodLabel}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {WALLET_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      style={{
                        border: `1px solid ${method === m ? "var(--banco-primary)" : "var(--banco-border)"}`,
                        borderRadius: 8,
                        background: method === m ? "rgba(232,0,45,0.08)" : "transparent",
                        padding: "0.45rem 0.75rem",
                        cursor: "pointer",
                        fontWeight: method === m ? 700 : 500,
                        color: method === m ? "var(--banco-primary)" : "var(--banco-fg)",
                      }}
                    >
                      {methodLabel(m, copy)}
                    </button>
                  ))}
                </div>
                {amountError ? (
                  <p style={{ margin: "0.65rem 0 0", color: "var(--banco-primary)", fontSize: "0.85rem" }}>
                    {copy.walletEnterAmount}
                  </p>
                ) : null}
                {payState === "error" ? (
                  <p style={{ margin: "0.65rem 0 0", color: "var(--banco-primary)", fontSize: "0.85rem" }}>
                    {copy.walletTopupFailed}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={payState === "processing"}
                  onClick={() => void handleTopup()}
                  style={{ ...btnPrimary, width: "100%", marginTop: "1rem" }}
                >
                  {payState === "processing"
                    ? copy.loading
                    : Number(amount) > 0
                      ? copy.walletPay.replace("{amount}", `${egp} ${fmtMoney(Number(amount))}`)
                      : copy.walletAddFunds}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
