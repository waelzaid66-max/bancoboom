"use client";

import { useEffect, useMemo, useState } from "react";
import { useGetAutocomplete } from "@workspace/api-client-react";
import { searchConfig } from "../lib/search-config";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchAutocompleteProps = {
  enabled: boolean;
  query: string;
  onSelect: (value: string) => void;
};

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: "0.5rem",
  marginTop: "0.5rem",
};

function itemStyle(locale: "ar" | "en"): React.CSSProperties {
  return {
    border: "1px solid var(--banco-border)",
    borderRadius: 8,
    background: "transparent",
    color: "var(--banco-fg)",
    width: "100%",
    textAlign: locale === "ar" ? "right" : "left",
    padding: "0.45rem 0.6rem",
    cursor: "pointer",
  };
}


function SearchAutocompleteLive({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (value: string) => void;
}) {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query.trim()),
      searchConfig.autocomplete.debounceMs,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const active = debouncedQuery.length >= searchConfig.autocomplete.minQueryLength;
  const request = useMemo(() => ({ q: debouncedQuery || " " }), [debouncedQuery]);

  if (!active) return null;

  return <SearchAutocompleteSuggestions request={request} onSelect={onSelect} />;
}

function SearchAutocompleteSuggestions({
  request,
  onSelect,
}: {
  request: { q: string };
  onSelect: (value: string) => void;
}) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const autocompleteQuery = useGetAutocomplete(request);

  if (autocompleteQuery.isLoading) {
    return (
      <div style={panelStyle}>
        <small style={{ color: "var(--banco-muted)" }}>{copy.autocompleteLoading}</small>
      </div>
    );
  }

  if (autocompleteQuery.isError) {
    return (
      <div style={panelStyle}>
        <small style={{ color: "#ff6b6b" }}>{copy.autocompleteError}</small>
      </div>
    );
  }

  const items = autocompleteQuery.data?.data ?? [];
  if (items.length === 0) return null;

  return (
    <div style={panelStyle}>
      <div style={{ display: "grid", gap: "0.4rem" }}>
        {items.slice(0, searchConfig.autocomplete.maxSuggestions).map((item) => (
          <button
            key={item}
            type="button"
            style={itemStyle(locale)}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchAutocomplete({ enabled, query, onSelect }: SearchAutocompleteProps) {
  if (!enabled) {
    return null;
  }

  return <SearchAutocompleteLive query={query} onSelect={onSelect} />;
}
