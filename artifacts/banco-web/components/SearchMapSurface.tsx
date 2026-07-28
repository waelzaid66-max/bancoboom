"use client";

import dynamic from "next/dynamic";
import type { MapCluster } from "@workspace/api-client-react";
import type { MapViewport } from "../lib/map-contract";
import { searchConfig } from "../lib/search-config";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";
import { SearchMapClusterCanvas } from "./SearchMapClusterCanvas";

function MapLoadingFallback() {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  return (
    <p style={{ marginTop: "0.75rem", color: "var(--banco-muted)" }}>{copy.mapLoadingSurface}</p>
  );
}

const SearchGoogleMap = dynamic(
  () => import("./SearchGoogleMap").then((module) => module.SearchGoogleMap),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

type SearchMapSurfaceProps = {
  clusters: MapCluster[];
  viewport: MapViewport;
  totalListings: number;
  onViewportChange?: (viewport: MapViewport) => void;
  compact?: boolean;
};

export function SearchMapSurface({
  clusters,
  viewport,
  totalListings,
  onViewportChange,
  compact = false,
}: SearchMapSurfaceProps) {
  const hasGoogleKey = searchConfig.map.googleMapsApiKey.length > 0;
  if (hasGoogleKey && onViewportChange) {
    return (
      <SearchGoogleMap
        clusters={clusters}
        viewport={viewport}
        totalListings={totalListings}
        onViewportChange={onViewportChange}
        compact={compact}
      />
    );
  }

  return (
    <SearchMapClusterCanvas
      clusters={clusters}
      viewport={viewport}
      totalListings={totalListings}
      compact={compact}
    />
  );
}
