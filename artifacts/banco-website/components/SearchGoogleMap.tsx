"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  APIProvider,
  Map,
  Marker,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import type { MapCluster } from "@workspace/api-client-react";
import { bancoBrand } from "@workspace/design-tokens";
import {
  boundsLiteralToViewport,
  viewportCenter,
  type MapViewport,
} from "../lib/map-contract";
import { searchConfig } from "../lib/search-config";
import { formatMapTotalInViewport, searchUiCopy } from "../lib/search-ui-copy";
import { localizedPath } from "../lib/hub-config";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchGoogleMapProps = {
  clusters: MapCluster[];
  viewport: MapViewport;
  totalListings: number;
  onViewportChange: (viewport: MapViewport) => void;
  compact?: boolean;
};

function ClusterMarkers({
  clusters,
  onListingClick,
}: {
  clusters: MapCluster[];
  onListingClick: (listingId: string) => void;
}) {
  return (
    <>
      {clusters.map((cluster, index) => {
        // The STRICT cluster contract carries lat/lng/count/listing_id only —
        // price/bookable signals ride the page items, not this endpoint. A
        // single-listing pin therefore shows "1" and opens the listing on tap.
        const label = String(cluster.count);
        const listingId = cluster.listing_id;
        return (
          <Marker
            key={`${cluster.lat}-${cluster.lng}-${index}`}
            position={{ lat: cluster.lat, lng: cluster.lng }}
            label={{
              text: label,
              color: bancoBrand.black,
              fontWeight: "700",
            }}
            onClick={
              listingId
                ? () => onListingClick(listingId)
                : undefined
            }
          />
        );
      })}
    </>
  );
}

export function SearchGoogleMap({
  clusters,
  viewport,
  totalListings,
  onViewportChange,
  compact = false,
}: SearchGoogleMapProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const router = useRouter();
  const center = viewportCenter(viewport);
  const mapHeight = compact ? 200 : 320;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const handleListingClick = useCallback(
    (listingId: string) => {
      router.push(localizedPath(`/listing/${listingId}`, locale));
    },
    [router, locale],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleCameraChanged = useCallback((event: MapCameraChangedEvent) => {
    const { bounds, zoom } = event.detail;
    if (!bounds) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onViewportChangeRef.current(boundsLiteralToViewport(bounds, zoom));
    }, searchConfig.map.debounceMs);
  }, []);

  return (
    <APIProvider apiKey={searchConfig.map.googleMapsApiKey}>
      <div
        style={{
          position: "relative",
          marginTop: "0.75rem",
          minHeight: mapHeight,
          borderRadius: "var(--banco-radius)",
          border: "1px solid var(--banco-border)",
          overflow: "hidden",
        }}
        aria-label={copy.mapAria}
      >
        <Map
          defaultCenter={center}
          defaultZoom={viewport.zoom}
          gestureHandling="greedy"
          reuseMaps
          style={{ width: "100%", height: mapHeight }}
          onCameraChanged={handleCameraChanged}
        >
          <ClusterMarkers clusters={clusters} onListingClick={handleListingClick} />
        </Map>
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            color: "#ffffff",
            background: "rgba(0,0,0,0.55)",
            padding: "0.25rem 0.5rem",
            borderRadius: 8,
            fontSize: "0.8rem",
            pointerEvents: "none",
          }}
        >
          {formatMapTotalInViewport(locale, totalListings)}
        </div>
      </div>
    </APIProvider>
  );
}
