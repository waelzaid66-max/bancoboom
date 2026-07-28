import type { CreateTopupBodyMethod, WalletTransactionType } from "@workspace/api-client-react";
import type { SiteLocale } from "./hub-config";

export const WALLET_PAGE_SIZE = 50;
export const WALLET_PRESETS = [100, 250, 500, 1000] as const;

export const WALLET_METHODS: CreateTopupBodyMethod[] = [
  "vodafone_cash",
  "fawry",
  "instapay",
  "bank_transfer",
];

/** Direction per ledger entry type — mirrors mobile wallet.tsx TX_META. */
export const TX_CREDIT: Record<WalletTransactionType, boolean | null> = {
  wallet_topup: true,
  refund: true,
  boost_charge: false,
  subscription_charge: false,
  lead_charge: false,
  adjustment: null,
};

export function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatWalletDate(iso: string, locale: SiteLocale): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
