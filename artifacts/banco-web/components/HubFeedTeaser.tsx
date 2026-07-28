"use client";

import Link from "next/link";
import {
  useGetFeed,
  type GetFeedCategory,
} from "@workspace/api-client-react";
import { ListingCard } from "./ListingCard";
import { searchConfig } from "../lib/search-config";

const sectionStyle: React.CSSProperties = {
  marginTop: "1.25rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: "0.75rem 0 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "0.75rem",
};

type HubFeedTeaserProps = {
  title: string;
  category: GetFeedCategory;
  searchHref: string;
  locale?: "ar" | "en";
};

const COPY = {
  ar: {
    viewAll: "عرض الكل",
    loading: "جاري التحميل…",
    error: "تعذّر تحميل الإعلانات — جرّب البحث مباشرة.",
    empty: "لا توجد إعلانات في هذا القسم حالياً.",
    cta: "انتقل إلى البحث",
  },
  en: {
    viewAll: "View all",
    loading: "Loading…",
    error: "Could not load listings — try search directly.",
    empty: "No listings in this section right now.",
    cta: "Go to search",
  },
} as const;

export function HubFeedTeaser({
  title,
  category,
  searchHref,
  locale = "ar",
}: HubFeedTeaserProps) {
  const copy = COPY[locale];
  const liveEnabled = searchConfig.liveSearchEnabled;

  if (!liveEnabled) {
    return (
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
          <Link href={searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.viewAll}
          </Link>
        </div>
        <p style={{ color: "var(--banco-muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
          {copy.empty}{" "}
          <Link href={searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.cta}
          </Link>
        </p>
      </section>
    );
  }

  const query = useGetFeed({ limit: 6, category });
  const items = query.data?.data ?? [];

  if (query.isLoading) {
    return (
      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
        <p style={{ color: "var(--banco-muted)", marginTop: "0.5rem" }}>{copy.loading}</p>
      </section>
    );
  }

  if (query.isError || items.length === 0) {
    return (
      <section style={sectionStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
          <Link href={searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.viewAll}
          </Link>
        </div>
        <p style={{ color: "var(--banco-muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
          {query.isError ? copy.error : copy.empty}
        </p>
        <Link
          href={searchHref}
          style={{
            display: "inline-block",
            marginTop: "0.5rem",
            color: "var(--banco-primary)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {copy.cta} →
        </Link>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
        <Link href={searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
          {copy.viewAll}
        </Link>
      </div>
      <ul style={listStyle}>
        {items.map((item) => (
          <li key={item.id}>
            <ListingCard item={item} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
