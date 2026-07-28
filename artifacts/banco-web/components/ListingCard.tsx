"use client";

import Link from "next/link";
import type { FeedItem } from "@workspace/api-client-react";
import { formatApiCategoryLabel } from "../lib/category-labels";
import type { SiteLocale } from "../lib/hub-config";
import { localizedPath } from "../lib/hub-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const cardStyle: React.CSSProperties = {
  display: "block",
  border: "1px solid var(--banco-border)",
  borderRadius: "12px",
  padding: "0.75rem",
  background: "rgba(255,255,255,0.02)",
  textDecoration: "none",
  color: "inherit",
};

const mediaStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16 / 10",
  objectFit: "cover",
  borderRadius: "8px",
  background: "#111",
  marginBottom: "0.6rem",
};

const metaStyle: React.CSSProperties = {
  margin: "0.35rem 0 0",
  color: "var(--banco-muted)",
  fontSize: "0.9rem",
};

type ListingCardProps = {
  item: FeedItem;
  locale?: SiteLocale;
  /** Preview/demo cards must not link to missing listing IDs. */
  linkable?: boolean;
};

export function ListingCard({ item, locale: localeProp, linkable = true }: ListingCardProps) {
  const detectedLocale = useSearchLocale();
  const locale = localeProp ?? detectedLocale;
  const copy = listingUiCopy(locale);

  const badges: string[] = [];
  if (item.is_sponsored) badges.push(copy.sponsored);
  if (item.has_video) badges.push(copy.video);
  if (item.trust_signal) badges.push(item.trust_signal);

  const body = (
    <>
      {item.media_preview ? (
        <img src={item.media_preview} alt={item.title} style={mediaStyle} />
      ) : (
        <div
          style={{
            ...mediaStyle,
            display: "grid",
            placeItems: "center",
            color: "var(--banco-muted)",
          }}
        >
          BANCO
        </div>
      )}
      <strong>{item.title}</strong>
      <p style={metaStyle}>
        {item.location} · {item.price_display}
      </p>
      <p style={{ ...metaStyle, fontSize: "0.8rem" }}>
        {formatApiCategoryLabel(item.category, locale)}
        {badges.length > 0 ? ` · ${badges.join(" · ")}` : ""}
      </p>
    </>
  );

  if (!linkable) {
    return (
      <div style={{ ...cardStyle, cursor: "default" }} aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <Link href={localizedPath(`/listing/${item.id}`, locale)} style={cardStyle}>
      {body}
    </Link>
  );
}
