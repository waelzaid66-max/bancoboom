import type { WalletTransactionType } from "@workspace/api-client-react";

export type TxDatePreset = "all" | "7d" | "30d" | "90d";
export type TxTypeFilter = "all" | WalletTransactionType;

/** Query slice for ledger list APIs (wallet transactions). */
export type WalletTxListQuery = {
  from?: string;
  to?: string;
  type?: WalletTransactionType;
};

/** Server-side date window for ledger queries (indexed on user_id + created_at). */
export function txQueryFromPreset(preset: TxDatePreset): Pick<WalletTxListQuery, "from" | "to"> {
  if (preset === "all") return {};
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function txTypeParam(filter: TxTypeFilter): Pick<WalletTxListQuery, "type"> {
  return filter === "all" ? {} : { type: filter };
}
