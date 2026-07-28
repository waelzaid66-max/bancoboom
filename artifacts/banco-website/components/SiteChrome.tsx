"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getAdminUrl,
  getAppStoreUrls,
  getMarketUrl,
} from "../lib/site-env";
import { chromeCopy } from "../lib/chrome-copy";
import { adminNavItems, browseNavItems, marketNavItems } from "../lib/chrome-nav";
import { localeFromPathname, localizedPath } from "../lib/hub-config";
import { writeStoredLocale } from "../lib/locale-preference";
import { isWebPlugEnabled } from "../lib/web-plug-config";
import { BrandMark } from "./BrandMark";
import { SiteMainNav } from "./SiteMainNav";
import { SiteMobileNav } from "./SiteMobileNav";
import { LocaleSwitcher } from "./LocaleSwitcher";

const footerStyle: React.CSSProperties = {
  borderTop: "1px solid var(--banco-border)",
  marginTop: "2.5rem",
  padding: "1.5rem 1.25rem 2rem",
  color: "var(--banco-muted)",
  fontSize: "0.85rem",
};

const footerGridStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "1rem",
};

const MENU_LABELS = {
  ar: { open: "القائمة", close: "إغلاق القائمة", menu: "قائمة التنقل" },
  en: { open: "Menu", close: "Close menu", menu: "Navigation menu" },
} as const;

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const locale = localeFromPathname(pathname);
  const copy = chromeCopy(locale);
  const market = getMarketUrl();
  const admin = getAdminUrl();
  const stores = getAppStoreUrls();
  const browse = browseNavItems(locale);
  const menuCopy = MENU_LABELS[locale];
  const panelId = useId();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const isDirectoryHub =
    pathname === "/directory" || pathname === "/en/directory";
  const isMaintenance =
    pathname === "/maintenance" || pathname === "/en/maintenance";
  const plugOn = isWebPlugEnabled();

  useEffect(() => {
    if (locale === "ar" && !pathname.startsWith("/listing/")) {
      writeStoredLocale("ar");
    }
  }, [locale, pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Directory hub + maintenance (plug off) render without site chrome.
  if (isDirectoryHub || isMaintenance || !plugOn) {
    return <div id="main-content">{children}</div>;
  }

  return (
    <>
      <header className="banco-site-header" data-banco-chrome="header">
        <div className="banco-header-inner">
          <BrandMark href={copy.homeHref} ariaLabel={copy.brandAria} size="header" />

          <SiteMainNav />

          <div className="banco-header-tools">
            <span className="banco-header-tools__locale">
              <LocaleSwitcher />
            </span>
            <button
              type="button"
              className="banco-menu-toggle"
              aria-expanded={menuOpen}
              aria-controls={panelId}
              aria-label={menuOpen ? menuCopy.close : menuCopy.open}
              data-banco-chrome="menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span aria-hidden className="banco-menu-toggle__icon">
                {menuOpen ? "✕" : "☰"}
              </span>
              <span className="banco-menu-toggle__text">
                {menuOpen ? menuCopy.close : menuCopy.open}
              </span>
            </button>
          </div>
        </div>

        <SiteMobileNav
          open={menuOpen}
          onClose={closeMenu}
          menuLabel={menuCopy.menu}
          closeLabel={menuCopy.close}
          panelId={panelId}
        />
      </header>

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <footer style={footerStyle} data-banco-chrome="footer">
        <div style={footerGridStyle}>
          <div>
            <strong style={{ color: "var(--banco-fg)" }}>{copy.browse}</strong>
            <p style={{ margin: "0.5rem 0 0", lineHeight: 1.8 }}>
              {browse.map((item, i) => (
                <span key={item.href}>
                  {i > 0 ? " · " : null}
                  <Link href={item.href}>{item.label}</Link>
                </span>
              ))}
              {" · "}
              <Link href={localizedPath("/directory", locale)}>
                {locale === "ar" ? "دليل المنصات" : "Platform directory"}
              </Link>
            </p>
          </div>
          <div>
            <strong style={{ color: "var(--banco-fg)" }}>{copy.platforms}</strong>
            <p style={{ margin: "0.5rem 0 0", lineHeight: 1.8 }}>
              {market ? (
                <>
                  <a href={market} target="_blank" rel="noreferrer">
                    {copy.marketLabel}
                  </a>
                  {marketNavItems(market, locale).slice(1, 4).map((item) => (
                    <span key={item.href}>
                      {" · "}
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.label}
                      </a>
                    </span>
                  ))}
                </>
              ) : (
                copy.marketSoon
              )}
            </p>
            {admin ? (
              <p style={{ margin: "0.35rem 0 0", lineHeight: 1.8 }}>
                <strong style={{ color: "var(--banco-fg)" }}>{copy.managementMenu}</strong>
                {" · "}
                {adminNavItems(admin, locale).slice(0, 3).map((item, i) => (
                  <span key={item.href}>
                    {i > 0 ? " · " : null}
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <div>
            <strong style={{ color: "var(--banco-fg)" }}>{copy.app}</strong>
            <p style={{ margin: "0.5rem 0 0", lineHeight: 1.8 }}>
              {stores.android ? (
                <a href={stores.android} target="_blank" rel="noreferrer">
                  {copy.appAndroid}
                </a>
              ) : (
                copy.androidSoon
              )}
              {" · "}
              {stores.ios ? (
                <a href={stores.ios} target="_blank" rel="noreferrer">
                  {copy.appIos}
                </a>
              ) : (
                copy.iosSoon
              )}
            </p>
          </div>
        </div>
        <p style={{ textAlign: "center", margin: "1.25rem 0 0" }}>
          © {new Date().getFullYear()} BANCO
        </p>
      </footer>
    </>
  );
}
