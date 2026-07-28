"use client";

import { useGetMyMetrics } from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../lib/hub-config";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "0.75rem",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
};

export function WorkspaceMetricsCards() {
  const pathname = usePathname() ?? "/workspace";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const { data, isLoading, isError, refetch, isFetching } = useGetMyMetrics();

  if (isLoading) {
    return (
      <div data-banco-journey="workspace-metrics">
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </div>
    );
  }
  if (isError || !data?.data) {
    return (
      <div data-banco-journey="workspace-metrics">
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <button
          type="button"
          disabled={isFetching}
          onClick={() => void refetch()}
          style={{
            border: "1px solid var(--banco-border)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--banco-fg)",
            padding: "0.35rem 0.75rem",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  const stats = data.data;

  return (
    <div style={cardGrid} data-banco-journey="workspace-metrics">
      <div style={cardStyle}>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
          {copy.metricsActive}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
          {stats.active_listings}
        </p>
      </div>
      <div style={cardStyle}>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
          {copy.metricsTotal}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
          {stats.total_listings}
        </p>
      </div>
      <div style={cardStyle}>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
          {copy.metricsMemberSince}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "1rem", fontWeight: 600 }}>
          {stats.member_since}
        </p>
      </div>
      {stats.response_rate != null ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
            {copy.metricsResponseRate}
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: 700 }}>
            {Math.round(stats.response_rate * 100)}%
          </p>
        </div>
      ) : null}
      {stats.is_verified ? (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
            {copy.metricsVerified}
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "1rem", fontWeight: 600 }}>✓</p>
        </div>
      ) : null}
    </div>
  );
}
