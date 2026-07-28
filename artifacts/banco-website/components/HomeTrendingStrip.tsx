"use client";

import Link from "next/link";
import { useGetTrending } from "@workspace/api-client-react";
import { ListingCard } from "./ListingCard";
import type { SiteLocale } from "../lib/hub-config";
import { searchConfig } from "../lib/search-config";

const sectionStyle: React.CSSProperties = {
  marginTop: "1.5rem",
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
    title: "الأكثر رواجاً",
    loading: "جاري التحميل…",
    error: "تعذّر تحميل الاتجاهات الآن.",
    empty: "لا توجد عناصر رائجة حالياً.",
    cta: "تصفّح البحث",
    searchHref: "/search",
  },
  en: {
    title: "Trending",
    loading: "Loading…",
    error: "Could not load trending items.",
    empty: "No trending items right now.",
    cta: "Browse search",
    searchHref: "/en/search",
  },
} as const;

type HomeTrendingStripProps = {
  locale?: SiteLocale;
};

export function HomeTrendingStrip({ locale = "ar" }: HomeTrendingStripProps) {
  const copy = COPY[locale];
  const liveEnabled = searchConfig.liveSearchEnabled;

  if (!liveEnabled) {
    return null;
  }

  const query = useGetTrending();
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
      <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{copy.title}</h2>
      <ul style={listStyle}>
        {items.slice(0, 8).map((item) => (
          <li key={item.id}>
            <ListingCard item={item} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
