"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../lib/hub-config";
import { buildSiteNavModel } from "../lib/site-nav-model";
import { SiteNavDropdown } from "./SiteNavDropdown";
import { SiteAuthControls } from "./SiteAuthControls";
import { LocaleSwitcher } from "./LocaleSwitcher";

const navStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.65rem",
  alignItems: "center",
};

const linkStyle: React.CSSProperties = {
  color: "var(--banco-fg)",
  textDecoration: "none",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  background: "var(--banco-border)",
  marginInline: "0.15rem",
};

export function SiteMainNav() {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const { copy, browse, appItems, marketItems, managementItems } = buildSiteNavModel(locale);

  return (
    <nav
      className="banco-desktop-nav"
      style={navStyle}
      aria-label={copy.navAria}
      data-banco-chrome="desktop-nav"
    >
      {browse.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...linkStyle,
              color: active ? "var(--banco-primary)" : "var(--banco-fg)",
            }}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      <span style={dividerStyle} aria-hidden />

      {appItems.length > 0 ? (
        <SiteNavDropdown label={copy.appMenu} items={appItems} />
      ) : (
        <span style={{ ...linkStyle, color: "var(--banco-muted)", fontWeight: 500 }}>{copy.appSoon}</span>
      )}

      {marketItems.length > 0 ? (
        <SiteNavDropdown label={copy.marketMenu} items={marketItems} />
      ) : (
        <span style={{ ...linkStyle, color: "var(--banco-muted)", fontWeight: 500 }}>{copy.marketSoon}</span>
      )}

      {managementItems.length > 0 ? (
        <SiteNavDropdown label={copy.managementMenu} items={managementItems} alignEnd />
      ) : null}

      <span style={dividerStyle} aria-hidden />

      <SiteAuthControls locale={locale} />
      <LocaleSwitcher />
    </nav>
  );
}
