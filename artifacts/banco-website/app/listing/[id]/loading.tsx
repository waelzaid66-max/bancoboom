"use client";

import { listingUiCopy } from "../../../lib/listing-ui-copy";
import { useSearchLocale } from "../../../lib/use-search-locale";

const skeletonStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: "0 auto",
  padding: "2rem 1.25rem",
};

const blockStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  minHeight: 280,
  opacity: 0.65,
};

export default function ListingLoading() {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);

  return (
    <main style={skeletonStyle} aria-busy="true" aria-label={copy.loadingAria}>
      <div style={blockStyle} />
    </main>
  );
}
