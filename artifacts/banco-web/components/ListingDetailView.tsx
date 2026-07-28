"use client";

import Link from "next/link";
import type { FeedItem, ListingDetail } from "@workspace/api-client-react";
import { accentForCategory } from "@workspace/design-tokens";
import { formatApiCategoryLabel } from "../lib/category-labels";
import { formatListingStatus } from "../lib/listing-labels";
import { LISTING_HUB_LABELS, listingUiCopy } from "../lib/listing-ui-copy";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";
import { ListingShareActions } from "./ListingShareActions";
import { ListingContactActions } from "./ListingContactActions";
import { ListingSaveButton } from "./ListingSaveButton";
import { ListingReportActions } from "./ListingReportActions";
import { ListingCommentsSection } from "./ListingCommentsSection";
import { ListingSellerRatingBar, ListingSellerReviews } from "./ListingSellerReviews";
import { ListingBookingSection } from "./ListingBookingSection";
import { SearchResultsSection } from "./SearchResultsSection";

function isDailyRentListing(listing: ListingDetail): boolean {
  if (listing.category !== "real_estate") return false;
  const rentalTerm = listing.specs?.rental_term;
  return typeof rentalTerm === "string" && rentalTerm === "furnished_daily";
}

const wrapStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--banco-muted)",
  lineHeight: 1.7,
};

type ListingDetailViewProps = {
  listing: ListingDetail;
  similarItems?: FeedItem[];
};

export function ListingDetailView({
  listing,
  similarItems = [],
}: ListingDetailViewProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const searchCopy = searchUiCopy(locale);
  const hub = LISTING_HUB_LABELS[locale][listing.category];
  const hero = listing.media?.[0]?.url ?? null;
  const homeHref = locale === "en" ? "/en" : "/";
  const sectionAccent = accentForCategory(listing.category);
  const sellerCardStyle: React.CSSProperties = {
    marginTop: "1.25rem",
    padding: "1rem",
    borderRadius: "var(--banco-radius)",
    border: "1px solid var(--banco-border)",
    borderInlineStart: `3px solid ${sectionAccent}`,
    background: "var(--banco-card)",
  };

  return (
    <>
      <nav
        aria-label={copy.breadcrumbAria}
        style={{
          marginBottom: "0.75rem",
          fontSize: "0.85rem",
          color: "var(--banco-muted)",
        }}
      >
        <Link href={homeHref} style={{ color: "var(--banco-primary)", textDecoration: "none" }}>
          {copy.home}
        </Link>
        {hub ? (
          <>
            {" / "}
            <Link href={hub.href} style={{ color: "var(--banco-primary)", textDecoration: "none" }}>
              {hub.label}
            </Link>
          </>
        ) : null}
        {" / "}
        <span>{listing.title}</span>
      </nav>
      <article style={wrapStyle}>
        {hero ? (
          <img
            src={hero}
            alt={listing.title}
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: 12,
              marginBottom: "1rem",
            }}
          />
        ) : null}
        <h1 style={{ marginTop: 0 }}>{listing.title}</h1>
        {listing.is_request ? (
          <p
            style={{
              display: "inline-block",
              margin: "0 0 0.35rem",
              padding: "0.2rem 0.55rem",
              borderRadius: 999,
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "rgba(232, 0, 45, 0.12)",
              color: "var(--banco-primary)",
            }}
          >
            {copy.requestBadge}
          </p>
        ) : null}
        <p style={{ ...mutedStyle, fontSize: "1.1rem" }}>
          {listing.price_display} · {listing.location}
        </p>
        {listing.description ? (
          <p style={{ ...mutedStyle, marginTop: "0.75rem" }}>{listing.description}</p>
        ) : null}
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          <div>
            <dt style={mutedStyle}>{copy.category}</dt>
            <dd style={{ margin: "0.25rem 0 0" }}>
              {formatApiCategoryLabel(listing.category, locale)}
            </dd>
          </div>
          <div>
            <dt style={mutedStyle}>{copy.status}</dt>
            <dd style={{ margin: "0.25rem 0 0" }}>
              {formatListingStatus(listing.status, locale)}
            </dd>
          </div>
        </dl>
        <section style={sellerCardStyle} aria-label={copy.sellerAbout}>
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--banco-muted)",
            }}
          >
            {copy.sellerAbout}
          </p>
          {/* display_title/bio are NOT in the seller contract today (bio lives
              in client-side auth metadata, never served by the API). When a
              DB-backed seller bio ships, render it here — until then showing
              nothing is the honest state, not a placeholder. */}
          <p style={{ margin: 0, fontSize: "0.95rem" }}>{listing.seller.name}</p>
          <ListingSellerRatingBar sellerId={listing.seller.id} />
          {listing.seller.social_links && listing.seller.social_links.length > 0 ? (
            <ul
              style={{
                margin: "0.75rem 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {listing.seller.social_links.map((link) => {
                const href =
                  link.platform === "whatsapp"
                    ? `https://wa.me/${link.value.replace(/\D/g, "")}`
                    : /^https?:\/\//i.test(link.value)
                      ? link.value
                      : `https://${link.value}`;
                return (
                  <li key={link.platform}>
                    <a
                      href={href}
                      rel="noopener noreferrer"
                      target="_blank"
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--banco-primary)",
                        textDecoration: "none",
                      }}
                    >
                      {link.platform}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
        <ListingContactActions listing={listing} />
        {isDailyRentListing(listing) ? (
          <ListingBookingSection listingId={listing.id} pricePerNight={listing.price_cash} />
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.75rem", alignItems: "center" }}>
          <ListingSaveButton listingId={listing.id} initialSaved={listing.is_saved} />
          <ListingReportActions listingId={listing.id} />
        </div>
        <ListingShareActions listingId={listing.id} title={listing.title} />
        <ListingCommentsSection listingId={listing.id} sellerId={listing.seller.id} />
        <ListingSellerReviews sellerId={listing.seller.id} />
      </article>
      {similarItems.length > 0 ? (
        <section style={{ marginTop: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
            {searchCopy.similarListingsTitle}
          </h2>
          <SearchResultsSection items={similarItems} hideHeader />
        </section>
      ) : null}
    </>
  );
}
