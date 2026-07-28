"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SearchViewMode } from "../lib/map-contract";
import { searchUiCopy } from "../lib/search-ui-copy";
import { trackSearchEvent } from "../lib/telemetry";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchViewToggleProps = {
  view: SearchViewMode;
};

const wrapStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: "0.4rem",
  marginTop: "0.75rem",
  padding: "0.25rem",
  borderRadius: 12,
  border: "1px solid var(--banco-border)",
  background: "rgba(255,255,255,0.02)",
};

function buttonStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 10,
    padding: "0.45rem 0.8rem",
    cursor: "pointer",
    fontWeight: 700,
    background: active ? "var(--banco-primary)" : "transparent",
    color: active ? "#fff" : "var(--banco-muted)",
  };
}

export function SearchViewToggle({ view }: SearchViewToggleProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setView = (nextView: SearchViewMode) => {
    if (nextView === view) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === "list") params.delete("view");
    else params.set("view", "map");
    trackSearchEvent("search_view_change", { view: nextView });
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={wrapStyle} role="tablist" aria-label={copy.viewToggleAria}>
      <button type="button" style={buttonStyle(view === "list")} onClick={() => setView("list")}>
        {copy.viewList}
      </button>
      <button type="button" style={buttonStyle(view === "map")} onClick={() => setView("map")}>
        {copy.viewMap}
      </button>
    </div>
  );
}
