"use client";

import { useCallback } from "react";
import { getAppListingDeepLink, getPublicListingShareUrl } from "../lib/site-env";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.6rem",
  marginTop: "1rem",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.55rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
};

const secondaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--banco-fg)",
};

type ListingShareActionsProps = {
  listingId: string;
  title: string;
};

export function ListingShareActions({ listingId, title }: ListingShareActionsProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const shareUrl = getPublicListingShareUrl(listingId);
  const deepLink = getAppListingDeepLink(listingId);

  const shareNative = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
  }, [shareUrl, title]);

  return (
    <div style={rowStyle}>
      <button type="button" style={buttonStyle} onClick={() => void shareNative()}>
        {copy.share}
      </button>
      <a href={deepLink} style={secondaryStyle}>
        {copy.openInApp}
      </a>
      <a href={shareUrl} style={{ ...secondaryStyle, textDecoration: "none" }}>
        {copy.publicLink}
      </a>
    </div>
  );
}
