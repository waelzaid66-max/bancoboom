"use client";

import { getListGlobalSupplyQueryKey, useListGlobalSupply } from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../../lib/hub-config";
import { workspaceUiCopy } from "../../../lib/workspace-ui-copy";
import { MarketTabs } from "./MarketTabs";

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const thStyle: React.CSSProperties = {
  textAlign: "start",
  padding: "0.65rem 0.5rem",
  borderBottom: "1px solid var(--banco-border)",
  color: "var(--banco-muted)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "0.65rem 0.5rem",
  borderBottom: "1px solid var(--banco-border)",
  verticalAlign: "top",
};

const retryBtn: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.35rem 0.75rem",
  cursor: "pointer",
  fontSize: "0.85rem",
  marginTop: "0.75rem",
};

export function MarketSupplyPanel() {
  const pathname = usePathname() ?? "/workspace/b2b/supply";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const params = { limit: 20, status: "open" as const };
  const query = useListGlobalSupply(params, {
    query: { queryKey: getListGlobalSupplyQueryKey(params) },
  });

  const rows = query.data?.data ?? [];

  return (
    <div data-banco-journey="market-supply">
      <h2 style={{ margin: "0 0 0.5rem" }}>{copy.marketSupplyTitle}</h2>
      <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)", lineHeight: 1.7 }}>
        {copy.marketCopyBody}
      </p>
      <MarketTabs />

      {query.isLoading ? (
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      ) : query.isError ? (
        <div>
          <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
          <button type="button" style={retryBtn} onClick={() => void query.refetch()}>
            {copy.retry}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--banco-muted)" }}>{copy.marketSupplyEmpty}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.createTitleLabel}</th>
                <th style={thStyle}>{copy.createLocation}</th>
                <th style={thStyle}>{copy.createPrice}</th>
                <th style={thStyle}>{copy.marketSupplyResponses}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <strong>{item.product_text}</strong>
                    {item.quantity ? (
                      <>
                        <br />
                        <span style={{ color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{item.destination_country}</td>
                  <td style={tdStyle}>
                    {item.budget_max
                      ? `${item.budget_max} ${item.currency ?? ""}`.trim()
                      : "—"}
                  </td>
                  <td style={tdStyle}>{item.response_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
