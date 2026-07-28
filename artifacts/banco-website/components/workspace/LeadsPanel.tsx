"use client";

import Link from "next/link";
import { useGetDealerLeads } from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname, localizedPath } from "../../lib/hub-config";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

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

export function LeadsPanel() {
  const pathname = usePathname() ?? "/workspace/leads";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace" : "/workspace";
  const { data, isLoading, isError, refetch, isFetching } = useGetDealerLeads({ limit: 50 });

  if (isLoading) {
    return (
      <div data-banco-journey="workspace-leads">
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div data-banco-journey="workspace-leads">
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <button type="button" style={retryBtn} disabled={isFetching} onClick={() => void refetch()}>
          {copy.retry}
        </button>
      </div>
    );
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div data-banco-journey="workspace-leads">
        <p style={{ color: "var(--banco-muted)", marginTop: 0 }}>{copy.leadsEmpty}</p>
        <p style={{ color: "var(--banco-muted)", lineHeight: 1.7 }}>{copy.leadsEmptyHint}</p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link href={`${prefix}/listings/new`} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.listingsNew}
          </Link>
          {" · "}
          <Link href={`${prefix}/listings`} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.navListings}
          </Link>
        </p>
      </div>
    );
  }

  const dateLocale = locale === "en" ? "en-GB" : "ar-EG";

  return (
    <div style={{ overflowX: "auto" }} data-banco-journey="workspace-leads">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{copy.createTitleLabel}</th>
            <th style={thStyle}>{copy.leadsBuyer}</th>
            <th style={thStyle}>{copy.leadsAction}</th>
            <th style={thStyle}>{copy.leadsDate}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lead) => (
            <tr key={lead.id}>
              <td style={tdStyle}>
                {lead.listing_id ? (
                  <Link
                    href={localizedPath(`/listing/${lead.listing_id}`, locale)}
                    style={{ color: "var(--banco-primary)", fontWeight: 600, textDecoration: "none" }}
                  >
                    {lead.listing_title}
                  </Link>
                ) : (
                  lead.listing_title
                )}
              </td>
              <td style={tdStyle}>
                {lead.buyer_name ?? "—"}
                {lead.buyer_phone ? (
                  <>
                    <br />
                    <span style={{ color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                      {lead.buyer_phone}
                    </span>
                  </>
                ) : null}
              </td>
              <td style={tdStyle}>{lead.action_type}</td>
              <td style={tdStyle}>
                {lead.created_at
                  ? new Date(lead.created_at).toLocaleString(dateLocale)
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
