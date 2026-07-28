"use client";

import { searchUiCopy } from "../lib/search-ui-copy";
import type { FeedItem } from "@workspace/api-client-react";
import { ListingCard } from "./ListingCard";
import { useSearchLocale } from "../lib/use-search-locale";

const sectionStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0.75rem 0 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: "0.75rem",
};

type SearchResultsSectionProps = {
  items: FeedItem[];
  title?: string;
  intro?: string;
  hideHeader?: boolean;
  linkable?: boolean;
};

export function SearchResultsSection({
  items,
  title,
  intro,
  hideHeader = false,
  linkable = true,
}: SearchResultsSectionProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);

  return (
    <section style={sectionStyle}>
      {hideHeader ? null : (
        <>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title ?? copy.resultsTitle}</h2>
          <p style={{ margin: "0.5rem 0 0", color: "var(--banco-muted)", lineHeight: 1.7 }}>
            {intro ?? copy.resultsIntro}
          </p>
        </>
      )}
      <ul style={listStyle}>
        {items.map((item) => (
          <li key={item.id}>
            <ListingCard item={item} locale={locale} linkable={linkable} />
          </li>
        ))}
      </ul>
    </section>
  );
}
