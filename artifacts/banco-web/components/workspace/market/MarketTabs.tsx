"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../../lib/hub-config";
import { workspaceUiCopy } from "../../../lib/workspace-ui-copy";

const tabRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.45rem",
  margin: "0 0 1.25rem",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  textDecoration: "none",
  padding: "0.4rem 0.75rem",
  borderRadius: 8,
  fontSize: "0.88rem",
  fontWeight: 700,
  border: "1px solid var(--banco-border)",
  background: active ? "rgba(232,0,45,0.12)" : "transparent",
  color: active ? "var(--banco-primary)" : "var(--banco-fg)",
});

export function MarketTabs() {
  const pathname = usePathname() ?? "/workspace/b2b";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace/b2b" : "/workspace/b2b";

  const tabs = [
    { href: prefix, label: copy.marketTabOverview, exact: true },
    { href: `${prefix}/rfqs`, label: copy.marketTabRfqs },
    { href: `${prefix}/supply`, label: copy.marketTabSupply },
  ];

  return (
    <nav style={tabRow} aria-label={copy.marketCopyTitle} data-banco-journey="market-tabs">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} style={tabStyle(active)} aria-current={active ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
