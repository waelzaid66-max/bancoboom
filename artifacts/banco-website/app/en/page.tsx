import Link from "next/link";
import { JsonLd } from "../../components/JsonLd";
import { BrandMark } from "../../components/BrandMark";
import { HomeFeedTeaser } from "../../components/HomeFeedTeaser";
import { HomeTrendingStrip } from "../../components/HomeTrendingStrip";
import { SectionIcon, type SectionIconVariant } from "../../components/SectionIcon";
import { hubAccent } from "@workspace/design-tokens";
import { collectionPageJsonLd } from "../../lib/structured-data";
import { pageMetadata } from "../../lib/page-metadata";

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
  title: string;
  desc: string;
}> = [
  {
    href: "/en/search",
    accent: hubAccent.general,
    icon: "search",
    title: "Search",
    desc: "Filters, map, and live results",
  },
  {
    href: "/en/cars",
    accent: hubAccent.cars,
    icon: "cars",
    title: "Cars",
    desc: "Sale and financing",
  },
  {
    href: "/en/real-estate",
    accent: hubAccent.real_estate,
    icon: "real_estate",
    title: "Real Estate",
    desc: "Sale and rent",
  },
  {
    href: "/en/industrial",
    accent: hubAccent.industrial,
    icon: "industrial",
    title: "Industrial",
    desc: "Facilities and materials",
  },
];

export const metadata = pageMetadata({
  title: "BANCO — Cars, Real Estate & Industrial",
  description: "Browse cars, real estate, and industrial listings in Egypt on BANCO",
  path: "/en",
  locale: "en",
});

export default function EnglishHomePage() {
  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          name: "BANCO",
          description: "Browse cars, real estate, and industrial listings",
          path: "/en",
        })}
      />

      <section className="banco-brand-hero" aria-labelledby="banco-home-heading-en">
        <div className="banco-brand-hero__inner">
          <BrandMark
            href="/en"
            ariaLabel="BANCO home"
            size="hero"
            priority
          />
          <h1 id="banco-home-heading-en" className="banco-brand-hero__title">
            One market. Clearer opportunities.
          </h1>
          <p className="banco-brand-hero__lede">
            Cars · Real estate · Industrial — the same BANCO brand as the app.
          </p>
          <div className="banco-brand-hero__cta">
            <Link href="/en/search" className="banco-btn banco-btn--primary">
              Start searching
            </Link>
            <Link href="/en/cars" className="banco-btn banco-btn--ghost">
              Cars
            </Link>
          </div>
        </div>
      </section>

      <section style={hubsSectionStyle} aria-label="Browse hubs">
        <h2
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1.15rem",
            fontWeight: 700,
          }}
        >
          Browse sections
        </h2>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.95rem" }}>
          Pick a market — unified search shares the mobile contract.
        </p>
        <nav style={gridStyle} aria-label="Browse hubs">
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
                <strong>{hub.title}</strong>
              </span>
              <p
                style={{
                  margin: "0.35rem 0 0",
                  color: "var(--banco-muted)",
                  fontSize: "0.9rem",
                }}
              >
                {hub.desc}
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
