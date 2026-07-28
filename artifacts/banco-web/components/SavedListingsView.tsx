"use client";

import Link from "next/link";
import {
  useGetSavedListings,
  useGetListing,
  getGetSavedListingsQueryKey,
} from "@workspace/api-client-react";
import { usePathname } from "next/navigation";
import { localeFromPathname, localizedPath } from "../lib/hub-config";
import { isClerkConfigured, signInPath } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { workspaceUiCopy } from "../lib/workspace-ui-copy";

function SavedListingRow({ id, locale }: { id: string; locale: "ar" | "en" }) {
  const { data, isLoading } = useGetListing(id);
  if (isLoading) return <p style={{ color: "var(--banco-muted)" }}>…</p>;
  const listing = data?.data;
  if (!listing) return null;
  return (
    <Link
      href={localizedPath(`/listing/${listing.id}`, locale)}
      style={{
        display: "block",
        border: "1px solid var(--banco-border)",
        borderRadius: 12,
        padding: "0.85rem",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <strong>{listing.title}</strong>
      <p style={{ margin: "0.35rem 0 0", color: "var(--banco-muted)" }}>
        {listing.price_display} · {listing.location}
      </p>
    </Link>
  );
}

export function SavedListingsView() {
  const pathname = usePathname() ?? "/saved";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const listingCopy = listingUiCopy(locale);
  const clerkOn = isClerkConfigured();
  const { data, isLoading, isError } = useGetSavedListings({
    query: {
      enabled: clerkOn,
      queryKey: getGetSavedListingsQueryKey(),
    },
  });

  if (!clerkOn) {
    return (
      <main
        style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}
        data-banco-journey="saved"
      >
        <h1 style={{ margin: "0 0 1rem" }}>{copy.navSaved}</h1>
        <p style={{ color: "var(--banco-muted)", lineHeight: 1.7 }}>{copy.authDisabled}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href={locale === "en" ? "/en/search" : "/search"} style={{ color: "var(--banco-primary)" }}>
            {listingCopy.backToSearch}
          </Link>
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main
        style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}
        data-banco-journey="saved"
      >
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main
        style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}
        data-banco-journey="saved"
      >
        <h1 style={{ margin: "0 0 1rem" }}>{copy.navSaved}</h1>
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <p style={{ marginTop: "0.75rem", color: "var(--banco-muted)" }}>{copy.signInRequired}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href={signInPath(locale)} style={{ color: "var(--banco-primary)", fontWeight: 700 }}>
            {copy.signInCta}
          </Link>
        </p>
      </main>
    );
  }

  const ids = data?.data ?? [];

  return (
    <main
      style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}
      data-banco-journey="saved"
    >
      <h1 style={{ margin: "0 0 1rem" }}>{copy.navSaved}</h1>
      {ids.length === 0 ? (
        <p style={{ color: "var(--banco-muted)" }}>
          {listingCopy.savedAdd}.{" "}
          <Link href={locale === "en" ? "/en/search" : "/search"} style={{ color: "var(--banco-primary)" }}>
            {listingCopy.backToSearch}
          </Link>
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {ids.map((id) => (
            <SavedListingRow key={id} id={id} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
