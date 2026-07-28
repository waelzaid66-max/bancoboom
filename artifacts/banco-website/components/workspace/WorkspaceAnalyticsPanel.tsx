"use client";

import {
  getGetDealerAnalyticsQueryKey,
  getGetMyManagedListingsQueryKey,
  useGetDealerAnalytics,
  useGetMyManagedListings,
} from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../lib/hub-config";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
  marginTop: "1rem",
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
};

export function WorkspaceAnalyticsPanel() {
  const pathname = usePathname() ?? "/workspace/analytics";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);

  const analyticsQuery = useGetDealerAnalytics({
    query: { queryKey: getGetDealerAnalyticsQueryKey() },
  });
  const listingsQuery = useGetMyManagedListings(
    { limit: 200, sort: "views", order: "desc" },
    { query: { queryKey: getGetMyManagedListingsQueryKey({ limit: 200, sort: "views", order: "desc" }) } },
  );

  const loading = analyticsQuery.isLoading || listingsQuery.isLoading;
  const listings = listingsQuery.data?.data ?? [];
  const stats = analyticsQuery.data?.data;

  const totalViews =
    stats?.total_views ?? listings.reduce((sum, row) => sum + (row.views ?? 0), 0);
  const totalLeads =
    stats?.leads_today ?? listings.reduce((sum, row) => sum + (row.leads ?? 0), 0);
  const conversion =
    stats?.conversion_rate ??
    (totalViews > 0 ? `${((totalLeads / totalViews) * 100).toFixed(1)}%` : "0.0%");

  return (
    <div>
      <h2 style={{ margin: "0 0 0.35rem" }}>{copy.analyticsTitle}</h2>
      <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)" }}>{copy.analyticsSubtitle}</p>

      {loading ? (
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                {copy.analyticsTotalViews}
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.75rem", fontWeight: 700 }}>
                {totalViews.toLocaleString(locale === "en" ? "en-US" : "ar-EG")}
              </p>
            </div>
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                {copy.analyticsTotalLeads}
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.75rem", fontWeight: 700 }}>
                {totalLeads.toLocaleString(locale === "en" ? "en-US" : "ar-EG")}
              </p>
            </div>
            <div style={cardStyle}>
              <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                {copy.analyticsConversion}
              </p>
              <p style={{ margin: "0.35rem 0 0", fontSize: "1.75rem", fontWeight: 700, color: "var(--banco-primary)" }}>
                {typeof conversion === "string" && conversion.endsWith("%") ? conversion : `${conversion}%`}
              </p>
            </div>
          </div>

          {listings.length === 0 ? (
            <p style={{ marginTop: "1rem", color: "var(--banco-muted)" }}>{copy.analyticsEmpty}</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{copy.analyticsListing}</th>
                  <th style={thStyle}>{copy.analyticsViews}</th>
                  <th style={thStyle}>{copy.analyticsLeads}</th>
                  <th style={thStyle}>{copy.analyticsConvRate}</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((row) => {
                  const views = row.views ?? 0;
                  const leads = row.leads ?? 0;
                  const conv = views > 0 ? `${((leads / views) * 100).toFixed(1)}%` : "0.0%";
                  return (
                    <tr key={row.id}>
                      <td style={tdStyle}>{row.title ?? row.id}</td>
                      <td style={tdStyle}>{views.toLocaleString(locale === "en" ? "en-US" : "ar-EG")}</td>
                      <td style={tdStyle}>{leads.toLocaleString(locale === "en" ? "en-US" : "ar-EG")}</td>
                      <td style={tdStyle}>{conv}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
