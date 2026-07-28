"use client";

import Link from "next/link";
import { listingUiCopy } from "../../../lib/listing-ui-copy";
import { searchUiCopy } from "../../../lib/search-ui-copy";
import { useSearchLocale } from "../../../lib/use-search-locale";

const mainStyle: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "3rem 1.25rem",
  textAlign: "center",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--banco-muted)",
  lineHeight: 1.7,
};

const gridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
  marginTop: "1.25rem",
};

const pillStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 999,
  padding: "0.35rem 0.85rem",
  fontSize: "0.85rem",
  textDecoration: "none",
  color: "inherit",
};

export default function ListingNotFound() {
  const locale = useSearchLocale();
  const listingCopy = listingUiCopy(locale);
  const searchCopy = searchUiCopy(locale);

  return (
    <main style={mainStyle}>
      <h1 style={{ marginTop: 0 }}>{listingCopy.notFoundTitle}</h1>
      <p style={mutedStyle}>{listingCopy.notFoundBody}</p>
      <div style={gridStyle}>
        <Link
          href={locale === "en" ? "/en/search" : "/search"}
          style={{ ...pillStyle, fontWeight: 700 }}
        >
          {listingCopy.backToSearch}
        </Link>
        <Link href={searchCopy.hubCarsHref} style={pillStyle}>
          {searchCopy.hubCars}
        </Link>
        <Link href={searchCopy.hubRealEstateHref} style={pillStyle}>
          {searchCopy.hubRealEstate}
        </Link>
        <Link href={searchCopy.hubIndustrialHref} style={pillStyle}>
          {searchCopy.hubIndustrial}
        </Link>
      </div>
    </main>
  );
}
