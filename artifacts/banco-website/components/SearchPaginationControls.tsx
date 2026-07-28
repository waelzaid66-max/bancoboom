"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { searchUiCopy } from "../lib/search-ui-copy";
import { trackSearchEvent } from "../lib/telemetry";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchPaginationControlsProps = {
  liveEnabled: boolean;
  hasLiveNextCursor: boolean;
  nextCursor?: string | null;
};

const wrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.6rem",
  marginTop: "0.75rem",
  alignItems: "center",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  color: "var(--banco-fg)",
  padding: "0.5rem 0.8rem",
  cursor: "pointer",
  fontWeight: 600,
};

const mutedTextStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--banco-muted)",
  fontSize: "0.85rem",
};

export function SearchPaginationControls({
  liveEnabled,
  hasLiveNextCursor,
  nextCursor,
}: SearchPaginationControlsProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToNext = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cursor", nextCursor);
    trackSearchEvent("search_pagination_next", {
      liveEnabled,
      hasLiveNextCursor,
      nextCursor,
    });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearCursor = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cursor");
    trackSearchEvent("search_pagination_reset", { liveEnabled });
    router.replace(`${pathname}?${params.toString()}`);
  };

  const statusText = liveEnabled
    ? hasLiveNextCursor
      ? copy.paginationLiveNext
      : copy.paginationNoNext
    : copy.paginationPreview;

  return (
    <div style={wrapStyle}>
      <button type="button" onClick={clearCursor} style={buttonStyle}>
        {copy.paginationFirst}
      </button>

      <button
        type="button"
        onClick={goToNext}
        style={{
          ...buttonStyle,
          opacity: liveEnabled && hasLiveNextCursor ? 1 : 0.5,
          cursor: liveEnabled && hasLiveNextCursor ? "pointer" : "not-allowed",
        }}
        disabled={!liveEnabled || !hasLiveNextCursor}
      >
        {copy.paginationNext}
      </button>

      <p style={mutedTextStyle}>{statusText}</p>
    </div>
  );
}
