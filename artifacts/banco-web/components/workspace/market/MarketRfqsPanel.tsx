"use client";

import { getListRfqsQueryKey, useListRfqs } from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../../lib/hub-config";
import { workspaceUiCopy } from "../../../lib/workspace-ui-copy";
import { MarketTabs } from "./MarketTabs";
import { RfqCreateForm } from "./RfqCreateForm";

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

export function MarketRfqsPanel() {
  const pathname = usePathname() ?? "/workspace/b2b/rfqs";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const dateLocale = locale === "en" ? "en-GB" : "ar-EG";
  const params = { limit: 20 } as const;
  const query = useListRfqs(params, {
    query: { queryKey: getListRfqsQueryKey(params) },
  });

  const rows = query.data?.data ?? [];

  return (
    <div data-banco-journey="market-rfqs">
      <h2 style={{ margin: "0 0 0.5rem" }}>{copy.marketRfqsTitle}</h2>
      <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)", lineHeight: 1.7 }}>
        {copy.marketCopyBody}
      </p>
      <MarketTabs />

      <RfqCreateForm onCreated={() => void query.refetch()} />

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
        <p style={{ color: "var(--banco-muted)" }}>{copy.marketRfqsEmpty}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.createTitleLabel}</th>
                <th style={thStyle}>{copy.createCategory}</th>
                <th style={thStyle}>{copy.marketRfqsOffers}</th>
                <th style={thStyle}>{copy.marketRfqsDeadline}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rfq) => (
                <tr key={rfq.id}>
                  <td style={tdStyle}>
                    <strong>{rfq.title}</strong>
                    {rfq.destination_country ? (
                      <>
                        <br />
                        <span style={{ color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                          {rfq.destination_country}
                          {rfq.quantity ? ` · ${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ""}` : ""}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{rfq.category}</td>
                  <td style={tdStyle}>{rfq.offer_count}</td>
                  <td style={tdStyle}>
                    {rfq.deadline
                      ? new Date(rfq.deadline).toLocaleDateString(dateLocale)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
