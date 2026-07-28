import Link from "next/link";
import { JsonLd } from "../components/JsonLd";
import { BrandMark } from "../components/BrandMark";
import { HomeFeedTeaser } from "../components/HomeFeedTeaser";
import { HomeTrendingStrip } from "../components/HomeTrendingStrip";
import { SectionIcon, type SectionIconVariant } from "../components/SectionIcon";
import { hubAccent } from "@workspace/design-tokens";
import { collectionPageJsonLd } from "../lib/structured-data";
import { pageMetadata } from "../lib/page-metadata";

const hubsSectionStyle: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "2rem 1.25rem 2.5rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "0.75rem",
  marginTop: "1rem",
};

const hubCardStyle = (accent: string): React.CSSProperties => ({
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  textDecoration: "none",
  color: "var(--banco-fg)",
  display: "block",
  borderTop: `3px solid ${accent}`,
});

const HUBS: Array<{
  href: string;
  accent: string;
  icon: SectionIconVariant;
  titleAr: string;
  descAr: string;
}> = [
  {
    href: "/search",
    accent: hubAccent.general,
    icon: "search",
    titleAr: "بحث عام",
    descAr: "فلاتر، خريطة، ونتائج حية",
  },
  {
    href: "/cars",
    accent: hubAccent.cars,
    icon: "cars",
    titleAr: "سيارات",
    descAr: "بيع وتقسيط",
  },
  {
    href: "/real-estate",
    accent: hubAccent.real_estate,
    icon: "real_estate",
    titleAr: "عقارات",
    descAr: "بيع وإيجار",
  },
  {
    href: "/industrial",
    accent: hubAccent.industrial,
    icon: "industrial",
    titleAr: "صناعي",
    descAr: "منشآت ومواد",
  },
];

export const metadata = pageMetadata({
  title: "BANCO — سيارات وعقارات وصناعي",
  description: "منصة BANCO للبحث عن سيارات وعقارات ومنشآت صناعية في مصر",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          name: "BANCO",
          description: "تصفح سيارات وعقارات ومنشآت صناعية",
          path: "/",
        })}
      />

      {/* Phase 1 — brand-first full-bleed hero (logo dominant; hubs below) */}
      <section className="banco-brand-hero" aria-labelledby="banco-home-heading">
        <div className="banco-brand-hero__inner">
          <BrandMark
            href="/"
            ariaLabel="BANCO الرئيسية"
            size="hero"
            priority
          />
          <h1 id="banco-home-heading" className="banco-brand-hero__title">
            سوق واحد. فرص أوضح.
          </h1>
          <p className="banco-brand-hero__lede">
            سيارات · عقارات · صناعي — بنفس هوية تطبيق BANCO.
          </p>
          <div className="banco-brand-hero__cta">
            <Link href="/search" className="banco-btn banco-btn--primary">
              ابدأ البحث
            </Link>
            <Link href="/cars" className="banco-btn banco-btn--ghost">
              السيارات
            </Link>
          </div>
        </div>
      </section>

      <section style={hubsSectionStyle} aria-label="مراكز التصفح">
        <h2
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1.15rem",
            fontWeight: 700,
          }}
        >
          تصفّح الأقسام
        </h2>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.95rem" }}>
          اختر السوق — البحث الموحّد يعمل عبر نفس عقد التطبيق.
        </p>
        <nav style={gridStyle} aria-label="مراكز التصفح">
          {HUBS.map((hub) => (
            <a key={hub.href} href={hub.href} style={hubCardStyle(hub.accent)}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <SectionIcon variant={hub.icon} size={18} color={hub.accent} />
                <strong>{hub.titleAr}</strong>
              </span>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  color: "var(--banco-muted)",
                  fontSize: "0.9rem",
                }}
              >
                {hub.descAr}
              </p>
            </a>
          ))}
        </nav>
        <HomeTrendingStrip />
        <HomeFeedTeaser />
      </section>
    </>
  );
}
