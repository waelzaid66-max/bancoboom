"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../lib/hub-config";
import { savedPath } from "../../lib/clerk-config";
import { workspaceSubpath } from "../../lib/workspace-paths";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "0.65rem",
  marginTop: "1.25rem",
};

const cardStyle: React.CSSProperties = {
  display: "block",
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "0.85rem 1rem",
  textDecoration: "none",
  color: "var(--banco-fg)",
  fontWeight: 600,
  fontSize: "0.9rem",
  transition: "border-color 0.15s ease",
};

type QuickLink = {
  href: string;
  label: string;
  hint: string;
};

export function WorkspaceOverviewPanel() {
  const pathname = usePathname() ?? "/workspace";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace" : "/workspace";

  const links: QuickLink[] = [
    { href: `${prefix}/listings/new`, label: copy.navNewListing, hint: copy.overviewNewHint },
    { href: `${prefix}/listings`, label: copy.navListings, hint: copy.overviewListingsHint },
    { href: `${prefix}/leads`, label: copy.navLeads, hint: copy.overviewLeadsHint },
    { href: workspaceSubpath(locale, "messages"), label: copy.navMessages, hint: copy.overviewMessagesHint },
    { href: workspaceSubpath(locale, "bookings"), label: copy.navBookings, hint: copy.overviewBookingsHint },
    { href: `${prefix}/analytics`, label: copy.navAnalytics, hint: copy.overviewAnalyticsHint },
    { href: workspaceSubpath(locale, "wallet"), label: copy.navWallet, hint: copy.overviewWalletHint },
    { href: `${prefix}/b2b`, label: copy.b2bTitle, hint: copy.overviewB2bHint },
    { href: savedPath(locale), label: copy.navSaved, hint: copy.overviewSavedHint },
  ];

  return (
    <section aria-labelledby="workspace-quick-links">
      <h2 id="workspace-quick-links" style={{ margin: "0", fontSize: "1.05rem" }}>
        {copy.overviewQuickLinks}
      </h2>
      <p style={{ margin: "0.35rem 0 0", color: "var(--banco-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
        {copy.overviewSubtitle}
      </p>
      <div style={gridStyle}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} style={cardStyle}>
            <span style={{ display: "block" }}>{link.label}</span>
            <span
              style={{
                display: "block",
                marginTop: "0.25rem",
                fontWeight: 400,
                fontSize: "0.78rem",
                color: "var(--banco-muted)",
                lineHeight: 1.4,
              }}
            >
              {link.hint}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
