"use client";

import Link from "next/link";
import { useGetFeed } from "@workspace/api-client-react";
import { ListingCard } from "./ListingCard";
import type { SiteLocale } from "../lib/hub-config";
import { searchConfig } from "../lib/search-config";
import { DEFAULT_MARKET_COUNTRY } from "../lib/search-markets";

const sectionStyle: React.CSSProperties = {
  marginTop: "1.5rem",
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

const COPY = {
  ar: {
    title: "أحدث الإعلانات",
    loading: "جاري التحميل…",
    error: "تعذّر تحميل الخلاصة الآن — يمكنك التصفح عبر البحث أو مراكز السوق.",
    empty: "لا توجد إعلانات في الخلاصة حالياً.",
    cta: "انتقل إلى البحث",
    viewAll: "عرض الكل",
    searchHref: "/search",
  },
  en: {
    title: "Latest listings",
    loading: "Loading…",
    error: "Could not load the feed — browse via search or market hubs.",
    empty: "No listings in the feed right now.",
    cta: "Go to search",
    viewAll: "View all",
    searchHref: "/en/search",
  },
} as const;

type HomeFeedTeaserProps = {
  locale?: SiteLocale;
};

export function HomeFeedTeaser({ locale = "ar" }: HomeFeedTeaserProps) {
  const copy = COPY[locale];
  const liveEnabled = searchConfig.liveSearchEnabled;

  if (!liveEnabled) {
    return null;
  }

  const query = useGetFeed({
    limit: 8,
    market_country: DEFAULT_MARKET_COUNTRY,
  });
  const items = query.data?.data ?? [];

  if (query.isLoading) {
    return (
      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{copy.title}</h2>
        <p style={{ color: "var(--banco-muted)", marginTop: "0.5rem" }}>{copy.loading}</p>
      </section>
    );
  }

  if (query.isError || items.length === 0) {
    return (
      <section style={sectionStyle}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{copy.title}</h2>
        <p style={{ color: "var(--banco-muted)", marginTop: "0.5rem", lineHeight: 1.6 }}>
          {query.isError ? copy.error : copy.empty}{" "}
          <Link href={copy.searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.cta}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{copy.title}</h2>
        <Link href={copy.searchHref} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
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
