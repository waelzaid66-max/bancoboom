"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isClerkConfigured, signInPath } from "../../lib/clerk-config";
import { localeFromPathname } from "../../lib/hub-config";
import { isWebMarketCopyEnabled } from "../../lib/market-copy-config";
import { getMarketUrl } from "../../lib/site-env";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const navLinkStyle: React.CSSProperties = {
  color: "var(--banco-fg)",
  textDecoration: "none",
  padding: "0.45rem 0.65rem",
  borderRadius: 8,
  fontSize: "0.9rem",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

type WorkspaceShellProps = {
  children: ReactNode;
};

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const pathname = usePathname() ?? "/workspace";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace" : "/workspace";
  const market = getMarketUrl();
  const clerkOn = isClerkConfigured();
  const marketCopyOn = isWebMarketCopyEnabled();

  const links = [
    { href: prefix, label: copy.navOverview, exact: true },
    { href: `${prefix}/listings`, label: copy.navListings },
    { href: `${prefix}/listings/new`, label: copy.navNewListing },
    { href: `${prefix}/leads`, label: copy.navLeads },
    { href: `${prefix}/messages`, label: copy.navMessages },
    { href: `${prefix}/bookings`, label: copy.navBookings },
    { href: `${prefix}/analytics`, label: copy.navAnalytics },
    { href: `${prefix}/wallet`, label: copy.navWallet },
    {
      href: `${prefix}/b2b`,
      label: marketCopyOn ? copy.marketNavWebCopy : copy.b2bTitle,
    },
  ];

  if (!clerkOn) {
    return (
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem" }}
        data-banco-journey="workspace"
        data-banco-auth="off"
      >
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem" }}>{copy.title}</h1>
        <p style={{ color: "var(--banco-muted)", lineHeight: 1.7 }}>{copy.authDisabled}</p>
        <p style={{ marginTop: "0.5rem", color: "var(--banco-muted)", lineHeight: 1.7 }}>
          {copy.signInRequired}
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link href={signInPath(locale)} style={{ color: "var(--banco-primary)", fontWeight: 700 }}>
            {copy.signInCta}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="banco-workspace-shell"
      data-banco-journey="workspace"
      data-banco-auth="on"
      data-banco-chrome="workspace-shell"
    >
      <aside className="banco-workspace-shell__aside" aria-label={copy.title}>
        <h1 className="banco-workspace-shell__title">{copy.title}</h1>
        <nav className="banco-workspace-shell__nav">
          {links.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  ...navLinkStyle,
                  background: active ? "rgba(232,0,45,0.12)" : "transparent",
                  color: active ? "var(--banco-primary)" : "var(--banco-fg)",
                }}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          {market ? (
            <a href={market} target="_blank" rel="noreferrer" style={navLinkStyle}>
              {copy.navMarket}
            </a>
          ) : null}
        </nav>
      </aside>
      <section className="banco-workspace-shell__main">{children}</section>
    </div>
  );
}
