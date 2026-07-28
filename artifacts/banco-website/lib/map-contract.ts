import type { SearchViewMode } from "./search-view";

type SearchParamValue = string | string[] | undefined;
type SearchParamRecord = Record<string, SearchParamValue>;

export type { SearchViewMode } from "./search-view";

export function parseSearchViewFromUrl(searchParams: SearchParamRecord): SearchViewMode {
  const raw = searchParams.view;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "map" ? "map" : "list";
}

export {
  boundsLiteralToViewport,
  buildMapClusterParams,
  clusterCacheKey,
  clusterToViewportPercent,
  getDefaultMapViewport,
  type MapViewport,
  viewportCenter,
} from "./map-helpers";
