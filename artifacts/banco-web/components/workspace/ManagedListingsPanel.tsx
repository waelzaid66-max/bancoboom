"use client";

import Link from "next/link";
import {
  getGetListingQueryKey,
  getGetMyManagedListingsQueryKey,
  getGetMyMetricsQueryKey,
  useBumpListing,
  useDeleteListing,
  useGetMyManagedListings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { localeFromPathname } from "../../lib/hub-config";
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
  verticalAlign: "top",
};

const actionBtn: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.25rem 0.5rem",
  marginInlineEnd: "0.35rem",
  cursor: "pointer",
  fontSize: "0.8rem",
};

export function ManagedListingsPanel() {
  const pathname = usePathname() ?? "/workspace/listings";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace" : "/workspace";
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const listParams = { limit: 50 };
  const { data, isLoading, isError, refetch, isFetching } = useGetMyManagedListings(listParams);
  const deleteListing = useDeleteListing();
  const bumpListing = useBumpListing();

  const invalidate = (listingId?: string) => {
    void queryClient.invalidateQueries({
      queryKey: getGetMyManagedListingsQueryKey(listParams),
    });
    void queryClient.invalidateQueries({ queryKey: getGetMyMetricsQueryKey() });
    if (listingId) {
      void queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(listingId) });
    }
  };

  if (isLoading) {
    return (
      <div data-banco-journey="workspace-listings">
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div data-banco-journey="workspace-listings">
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <button
          type="button"
          style={{ ...actionBtn, marginTop: "0.75rem" }}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <div data-banco-journey="workspace-listings">
        <p style={{ color: "var(--banco-muted)" }}>{copy.listingsEmpty}</p>
        <Link href={`${prefix}/listings/new`} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
          {copy.listingsNew}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }} data-banco-journey="workspace-listings">
      {actionError ? (
        <p style={{ color: "var(--banco-primary)", marginTop: 0 }}>{actionError}</p>
      ) : null}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>{copy.createTitleLabel}</th>
            <th style={thStyle}>{copy.listingsStatus}</th>
            <th style={thStyle}>{copy.listingsViews}</th>
            <th style={thStyle}>{copy.listingsLeads}</th>
            <th style={thStyle} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = row.id ?? "";
            const rowBusy = pendingId === id;
            return (
              <tr key={id}>
                <td style={tdStyle}>
                  <strong>{row.title}</strong>
                  <br />
                  <span style={{ color: "var(--banco-muted)", fontSize: "0.85rem" }}>
                    {row.price_display} · {row.location}
                  </span>
                </td>
                <td style={tdStyle}>{row.status}</td>
                <td style={tdStyle}>{row.views ?? 0}</td>
                <td style={tdStyle}>{row.leads ?? 0}</td>
                <td style={tdStyle}>
                  {id ? (
                    <>
                      <Link
                        href={`${prefix}/listings/${id}/edit`}
                        style={{ ...actionBtn, textDecoration: "none", display: "inline-block" }}
                      >
                        {copy.listingsEdit}
                      </Link>
                      <button
                        type="button"
                        style={actionBtn}
                        disabled={rowBusy}
                        onClick={() => {
                          setActionError(null);
                          setPendingId(id);
                          bumpListing.mutate(
                            { id },
                            {
                              onSuccess: () => invalidate(id),
                              onError: () => setActionError(copy.errorGeneric),
                              onSettled: () => setPendingId(null),
                            },
                          );
                        }}
                      >
                        {copy.listingsBump}
                      </button>
                      <button
                        type="button"
                        style={actionBtn}
                        disabled={rowBusy}
                        onClick={() => {
                          if (!window.confirm(copy.confirmDelete)) return;
                          setActionError(null);
                          setPendingId(id);
                          deleteListing.mutate(
                            { id },
                            {
                              onSuccess: () => invalidate(id),
                              onError: () => setActionError(copy.errorGeneric),
                              onSettled: () => setPendingId(null),
                            },
                          );
                        }}
                      >
                        {copy.listingsDelete}
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
