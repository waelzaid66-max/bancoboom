"use client";

import {
  getGetDealerStatsQueryKey,
  getGetMarketTrendsQueryKey,
  useGetDealerStats,
  useGetMarketTrends,
} from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../../lib/hub-config";
import { workspaceUiCopy } from "../../../lib/workspace-ui-copy";
import { MarketTabs } from "./MarketTabs";

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "0.75rem",
};

const card: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.9rem",
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

export function MarketDashboardPanel() {
  const pathname = usePathname() ?? "/workspace/b2b";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);

  const statsQuery = useGetDealerStats({
    query: { queryKey: getGetDealerStatsQueryKey() },
  });
  const trendsQuery = useGetMarketTrends(
    { category: "industrial", metric: "listing_volume" },
    {
      query: {
        queryKey: getGetMarketTrendsQueryKey({
          category: "industrial",
          metric: "listing_volume",
        }),
      },
    },
  );

  const stats = statsQuery.data?.data;
  const trends = trendsQuery.data?.data?.trends ?? [];

  return (
    <div data-banco-journey="market-overview">
      <h2 style={{ margin: "0 0 0.5rem" }}>{copy.marketCopyTitle}</h2>
      <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)", lineHeight: 1.7 }}>
        {copy.marketCopyBody}
      </p>
      <MarketTabs />

      {statsQuery.isLoading ? (
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      ) : statsQuery.isError || !stats ? (
        <div>
          <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
          <button type="button" style={retryBtn} onClick={() => void statsQuery.refetch()}>
            {copy.retry}
          </button>
        </div>
      ) : (
        <div style={grid}>
          <div style={card}>
            <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.82rem" }}>
              {copy.marketStatsActive}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
              {stats.active_listings ?? 0}
            </p>
          </div>
          <div style={card}>
            <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.82rem" }}>
              {copy.marketStatsLeadsToday}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
              {stats.leads_today ?? 0}
            </p>
          </div>
          <div style={card}>
            <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.82rem" }}>
              {copy.marketStatsViews}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
              {stats.total_views ?? 0}
            </p>
          </div>
          <div style={card}>
            <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.82rem" }}>
              {copy.marketStatsConversion}
            </p>
            <p style={{ margin: "0.35rem 0 0", fontSize: "1.4rem", fontWeight: 700 }}>
              {stats.conversion_rate ?? "—"}
            </p>
          </div>
        </div>
      )}

      <section style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.65rem", fontSize: "1.05rem" }}>{copy.marketTrendsTitle}</h3>
        {trendsQuery.isLoading ? (
          <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
        ) : trendsQuery.isError ? (
          <div>
            <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
            <button type="button" style={retryBtn} onClick={() => void trendsQuery.refetch()}>
              {copy.retry}
            </button>
          </div>
        ) : trends.length === 0 ? (
          <p style={{ color: "var(--banco-muted)" }}>{copy.marketTrendsEmpty}</p>
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: "1.1rem", lineHeight: 1.7 }}>
            {trends.slice(0, 6).map((trend) => (
              <li key={`${trend.segment}-${trend.metric}`}>
                <strong>{trend.segment_label}</strong>
                {" — "}
                {trend.change_display}
                {trend.current_value_display ? ` · ${trend.current_value_display}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
