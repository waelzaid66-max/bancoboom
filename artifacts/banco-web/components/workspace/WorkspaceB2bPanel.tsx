"use client";

import { usePathname } from "next/navigation";
import { MarketDashboardPanel } from "./market/MarketDashboardPanel";
import { MarketRfqsPanel } from "./market/MarketRfqsPanel";
import { MarketSupplyPanel } from "./market/MarketSupplyPanel";
import { marketNavItems } from "../../lib/chrome-nav";
import { localeFromPathname } from "../../lib/hub-config";
import { isWebMarketCopyEnabled } from "../../lib/market-copy-config";
import { getMarketUrl } from "../../lib/site-env";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "0.65rem",
  marginTop: "1rem",
};

const linkStyle: React.CSSProperties = {
  display: "block",
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.75rem 0.9rem",
  color: "var(--banco-primary)",
  fontWeight: 600,
  fontSize: "0.9rem",
  textDecoration: "none",
};

const classicBox: React.CSSProperties = {
  marginTop: "1.5rem",
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.9rem 1rem",
};

export type MarketCopyTab = "overview" | "rfqs" | "supply";

type WorkspaceB2bPanelProps = {
  tab?: MarketCopyTab;
};

export function WorkspaceB2bPanel({ tab = "overview" }: WorkspaceB2bPanelProps) {
  const pathname = usePathname() ?? "/workspace/b2b";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const market = getMarketUrl();
  const marketCopyEnabled = isWebMarketCopyEnabled();

  if (!marketCopyEnabled) {
    return <ClassicB2bLinks />;
  }

  return (
    <div
      data-testid="workspace-market-copy-root"
      data-banco-journey="market-copy"
      data-market-copy="enabled"
      data-market-tab={tab}
    >
      {tab === "overview" ? <MarketDashboardPanel /> : null}
      {tab === "rfqs" ? <MarketRfqsPanel /> : null}
      {tab === "supply" ? <MarketSupplyPanel /> : null}

      <div style={classicBox} data-testid="workspace-market-classic-fallback">
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{copy.marketClassicTitle}</p>
        <p style={{ margin: "0.4rem 0 0.75rem", color: "var(--banco-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {copy.marketClassicNote}
        </p>
        {market ? (
          <a
            href={market}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...linkStyle, display: "inline-block" }}
            data-testid="workspace-market-classic-link"
          >
            {copy.b2bMarketCta}
          </a>
        ) : (
          <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>
            {copy.b2bMarketDisabled}
          </p>
        )}
      </div>
    </div>
  );
}

function ClassicB2bLinks() {
  const pathname = usePathname() ?? "/workspace/b2b";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const market = getMarketUrl();
  const links = market ? marketNavItems(market, locale) : [];

  return (
    <div data-banco-journey="b2b-classic" data-market-copy="disabled">
      <h2 style={{ margin: "0 0 0.75rem" }}>{copy.b2bTitle}</h2>
      <p style={{ color: "var(--banco-muted)", lineHeight: 1.7, margin: 0 }}>{copy.b2bBody}</p>
      {market ? (
        <>
          <p style={{ margin: "1rem 0 0.35rem", fontWeight: 600, fontSize: "0.9rem" }}>
            {copy.b2bMarketLinks}
          </p>
          <div style={gridStyle}>
            {links.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                data-testid="workspace-b2b-market-link"
              >
                {item.label}
              </a>
            ))}
          </div>
          <p style={{ margin: "1rem 0 0", fontSize: "0.85rem", color: "var(--banco-muted)" }}>
            {copy.b2bMarketNote}
          </p>
        </>
      ) : (
        <p style={{ marginTop: "1rem", color: "var(--banco-muted)", fontSize: "0.9rem" }}>
          {copy.b2bMarketDisabled}
        </p>
      )}
    </div>
  );
}
