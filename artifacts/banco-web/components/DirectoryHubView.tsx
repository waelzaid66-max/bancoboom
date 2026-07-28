import Link from "next/link";
import { bancoBrand } from "@workspace/design-tokens";
import {
  adminDirectoryDests,
  adminPathLabels,
  APP_FEATURE_SECTIONS,
  marketDirectoryDests,
  marketPathLabels,
  webDirectoryDests,
  type DirectoryDest,
} from "../lib/directory-hub-config";
import { directoryHubCopy } from "../lib/directory-hub-copy";
import type { SiteLocale } from "../lib/hub-config";
import { localizedPath } from "../lib/hub-config";
import {
  getAdminUrl,
  getAppStoreUrls,
  getMarketUrl,
} from "../lib/site-env";

function LinkOrSoon({
  url,
  label,
  soonSuffix,
}: {
  url: string | null;
  label: string;
  soonSuffix: string;
}) {
  if (!url) {
    return (
      <span style={styles.soon}>
        {label} — {soonSuffix}
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={styles.cta}>
      {label}
    </a>
  );
}

function DestList({
  items,
  useInternalLink,
}: {
  items: DirectoryDest[];
  useInternalLink: boolean;
}) {
  return (
    <ul style={styles.list}>
      {items.map((item) => (
        <li key={`${item.path}-${item.label}`} style={styles.li}>
          {useInternalLink ? (
            <Link href={item.href} style={styles.pageLink}>
              {item.label} <span style={styles.pathMono}>{item.path}</span>
            </Link>
          ) : (
            <a href={item.href} style={styles.pageLink}>
              {item.label} <span style={styles.pathMono}>{item.path}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DirectoryHubView({ locale }: { locale: SiteLocale }) {
  const copy = directoryHubCopy(locale);
  const market = getMarketUrl();
  const admin = getAdminUrl();
  const stores = getAppStoreUrls();
  const browseHome = localizedPath("/", locale);

  const webItems = webDirectoryDests(locale);
  const marketItems = market ? marketDirectoryDests(market, locale) : [];
  const adminItems = admin ? adminDirectoryDests(admin, locale) : [];
  const appSections = APP_FEATURE_SECTIONS[locale];

  return (
    <div style={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <header style={styles.hero}>
        <p style={styles.brandMark} aria-hidden>
          BANCO
        </p>
        <h1 style={styles.title}>{copy.title}</h1>
        <p style={styles.tagline}>{copy.tagline}</p>
        <p style={styles.mission}>{copy.missionNote}</p>
        <p style={styles.localeRow}>
          <Link href={copy.localeSwitchHref} style={styles.localeLink}>
            {copy.localeSwitch}
          </Link>
        </p>
      </header>

      <main style={styles.grid}>
        <section style={{ ...styles.card, borderTopColor: bancoBrand.red }}>
          <h2 style={styles.cardTitle}>📱 {copy.appCardTitle}</h2>
          <p style={styles.cardBody}>{copy.appCardBody}</p>
          <ul style={styles.list}>
            {appSections.map((label) => (
              <li key={label} style={styles.li}>
                {label}
              </li>
            ))}
          </ul>
          <div style={styles.ctaRow}>
            <LinkOrSoon
              url={stores.android}
              label={copy.googlePlay}
              soonSuffix={copy.soonSuffix}
            />
            <LinkOrSoon
              url={stores.ios}
              label={copy.appStore}
              soonSuffix={copy.soonSuffix}
            />
          </div>
        </section>

        <section style={{ ...styles.card, borderTopColor: bancoBrand.red }}>
          <h2 style={styles.cardTitle}>🌐 {copy.browseCardTitle}</h2>
          <p style={styles.cardBody}>{copy.browseCardBody}</p>
          <DestList items={webItems} useInternalLink />
          <div style={styles.ctaRow}>
            <Link href={browseHome} style={styles.cta}>
              {copy.openBrowse}
            </Link>
          </div>
        </section>

        <section style={{ ...styles.card, borderTopColor: "#1FA97D" }}>
          <h2 style={styles.cardTitle}>🛒 {copy.marketCardTitle}</h2>
          <p style={styles.cardBody}>{copy.marketCardBody}</p>
          {marketItems.length > 0 ? (
            <DestList items={marketItems} useInternalLink={false} />
          ) : (
            <ul style={styles.list}>
              {marketPathLabels(locale).map((item) => (
                <li key={item.path} style={styles.li}>
                  {item.label} <span style={styles.pathMono}>{item.path}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={styles.ctaRow}>
            <LinkOrSoon
              url={market}
              label={copy.openMarket}
              soonSuffix={copy.soonSuffix}
            />
          </div>
        </section>

        <section style={{ ...styles.card, borderTopColor: "#3B82F6" }}>
          <h2 style={styles.cardTitle}>🛠️ {copy.adminCardTitle}</h2>
          <p style={styles.cardBody}>{copy.adminCardBody}</p>
          {adminItems.length > 0 ? (
            <DestList items={adminItems} useInternalLink={false} />
          ) : (
            <ul style={styles.list}>
              {adminPathLabels(locale).map((item) => (
                <li key={item.path} style={styles.li}>
                  {item.label} <span style={styles.pathMono}>{item.path}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={styles.ctaRow}>
            <LinkOrSoon
              url={admin}
              label={copy.openAdmin}
              soonSuffix={copy.soonSuffix}
            />
          </div>
        </section>
      </main>

      <footer style={styles.footer}>© {new Date().getFullYear()} BANCO</footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#f5f5f5",
    fontFamily: "var(--banco-font, system-ui, sans-serif)",
    padding: "clamp(16px, 4vw, 48px)",
    display: "flex",
    flexDirection: "column",
    gap: 36,
  },
  hero: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },
  brandMark: {
    color: bancoBrand.red,
    fontWeight: 800,
    fontSize: "clamp(28px, 5vw, 40px)",
    margin: 0,
    letterSpacing: "0.04em",
  },
  title: { fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800, margin: 0 },
  tagline: {
    color: "#b8b8b8",
    fontSize: "clamp(14px, 2vw, 17px)",
    margin: 0,
    lineHeight: 1.8,
    maxWidth: 720,
  },
  mission: {
    color: "#8ec9ff",
    fontSize: 13,
    margin: 0,
    lineHeight: 1.7,
    maxWidth: 640,
    border: "1px solid #1e3a5f",
    background: "#0d1520",
    borderRadius: 12,
    padding: "10px 14px",
  },
  localeRow: { margin: "4px 0 0" },
  localeLink: { color: "#d4d4d4", fontSize: 14 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    maxWidth: 1100,
    width: "100%",
    margin: "0 auto",
  },
  card: {
    background: "#141414",
    border: "1px solid #262626",
    borderTopWidth: 4,
    borderRadius: 16,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTitle: { fontSize: 19, fontWeight: 800, margin: 0 },
  cardBody: { color: "#a8a8a8", fontSize: 14, margin: 0 },
  list: {
    margin: 0,
    paddingInlineStart: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  li: { fontSize: 14, lineHeight: 1.7 },
  pageLink: { color: "#f5f5f5", textDecoration: "none" },
  pathMono: {
    color: "#7a7a7a",
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 12,
    marginInlineStart: 6,
  },
  ctaRow: {
    display: "flex",
    gap: 10,
    marginTop: "auto",
    paddingTop: 12,
    flexWrap: "wrap",
  },
  cta: {
    backgroundColor: bancoBrand.red,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14.5,
    padding: "10px 22px",
    borderRadius: 999,
    textDecoration: "none",
  },
  soon: {
    border: "1px solid #333",
    color: "#8a8a8a",
    fontWeight: 600,
    fontSize: 14,
    padding: "10px 22px",
    borderRadius: 999,
  },
  footer: {
    textAlign: "center",
    color: "#6a6a6a",
    fontSize: 12,
    marginTop: "auto",
  },
};
