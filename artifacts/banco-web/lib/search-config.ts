export type SearchAnalyticsMode = "debug" | "off";

export const searchConfig = {
  /** Rollback: set NEXT_PUBLIC_SEARCH_ENABLED=false to show hub-only shell. */
  searchEnabled: process.env.NEXT_PUBLIC_SEARCH_ENABLED !== "false",
  liveSearchEnabled: process.env.NEXT_PUBLIC_WEB_SEARCH_LIVE === "true",
  analyticsMode: (process.env.NEXT_PUBLIC_SEARCH_ANALYTICS_MODE ?? "debug") as SearchAnalyticsMode,
  limits: {
    min: 1,
    max: 100,
    default: 20,
  },
  autocomplete: {
    debounceMs: 250,
    minQueryLength: 2,
    maxSuggestions: 8,
    staleTimeMs: 20_000,
  },
  listings: {
    staleTimeMs: 30_000,
    retry: 1,
  },
  facets: {
    staleTimeMs: 30_000,
    retry: 1,
    topEntries: 5,
  },
  map: {
    enabled: process.env.NEXT_PUBLIC_WEB_SEARCH_MAP === "true",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    debounceMs: 450,
    defaultViewport: {
      min_lat: 29.95,
      max_lat: 30.15,
      min_lng: 31.15,
      max_lng: 31.45,
      zoom: 11,
    },
    staleTimeMs: 30_000,
  },
} as const;

export function clampSearchLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return searchConfig.limits.default;
  }
  return Math.min(
    searchConfig.limits.max,
    Math.max(searchConfig.limits.min, Math.floor(value)),
  );
}
