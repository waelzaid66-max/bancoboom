"use client";

import Link from "next/link";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchState = "loading" | "empty" | "error";

type SearchStatePanelProps = {
  state: SearchState;
};

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
  textAlign: "center",
};

const hubGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
  marginTop: "0.75rem",
};

const hubLinkStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 999,
  padding: "0.35rem 0.75rem",
  fontSize: "0.85rem",
  color: "var(--banco-primary)",
  textDecoration: "none",
};

export function SearchStatePanel({ state }: SearchStatePanelProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const showHubs = state === "empty" || state === "error";

  const messageByState: Record<SearchState, string> = {
    loading: copy.stateLoading,
    empty: copy.stateEmpty,
    error: copy.stateError,
  };

  const hubLinks = [
    { href: copy.hubCarsHref, label: copy.hubCars },
    { href: copy.hubRealEstateHref, label: copy.hubRealEstate },
    { href: copy.hubIndustrialHref, label: copy.hubIndustrial },
  ];

  return (
    <section style={panelStyle} role="status">
      <p style={{ margin: 0, color: "var(--banco-muted)", lineHeight: 1.7 }}>
        {messageByState[state]}
      </p>
      {showHubs ? (
        <nav style={hubGridStyle} aria-label={copy.hubsAria}>
          {hubLinks.map((link) => (
            <Link key={link.href} href={link.href} style={hubLinkStyle}>
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
