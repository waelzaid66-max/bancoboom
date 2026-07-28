"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMapClusters, type MapCluster } from "@workspace/api-client-react";
import {
  buildMapClusterParams,
  clusterCacheKey,
  getDefaultMapViewport,
  type MapViewport,
} from "../lib/map-contract";
import type { SearchCriteria } from "@workspace/search-contract";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";
import { SearchMapSurface } from "./SearchMapSurface";

type SearchMapPanelProps = {
  mapEnabled: boolean;
  liveEnabled: boolean;
  criteria: SearchCriteria;
  /** Compact height when map is secondary (#2) beside list results. */
  compact?: boolean;
};

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  padding: "1rem",
  marginTop: "1rem",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "var(--banco-muted)",
  lineHeight: 1.7,
};

const CLUSTER_CACHE_MAX = 24;

// Preview-only data, kept in lockstep with the STRICT server MapClusterSchema
// (lat/lng/count/listing_id — nothing else; bookable/price signals ride the
// page items, not the cluster endpoint).
const mockClusters: MapCluster[] = [
  { lat: 30.05, lng: 31.25, count: 12, listing_id: null },
  { lat: 30.02, lng: 31.35, count: 1, listing_id: "preview-1" },
  { lat: 30.08, lng: 31.2, count: 3, listing_id: null },
];

function SearchMapPanelDisabled() {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);

  return (
    <section style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.mapDisabledTitle}</h2>
      <p style={{ ...mutedStyle, marginTop: "0.5rem" }}>{copy.mapDisabledBody}</p>
    </section>
  );
}

function SearchMapPanelMock({
  viewport,
  compact,
}: {
  viewport: MapViewport;
  compact?: boolean;
}) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const total = mockClusters.reduce((sum, cluster) => sum + cluster.count, 0);

  return (
    <section style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.mapMockTitle}</h2>
      <p style={{ ...mutedStyle, marginTop: "0.5rem" }}>{copy.mapMockBody}</p>
      <SearchMapSurface
        clusters={mockClusters}
        viewport={viewport}
        totalListings={total}
        compact={compact}
      />
    </section>
  );
}

function SearchMapPanelLive({
  criteria,
  compact,
}: {
  criteria: SearchCriteria;
  compact?: boolean;
}) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const [viewport, setViewport] = useState<MapViewport>(() => getDefaultMapViewport());
  const [clusters, setClusters] = useState<MapCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);

  const criteriaSig = useMemo(() => JSON.stringify(criteria), [criteria]);
  const vpSeqRef = useRef(0);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const clusterCacheRef = useRef(
    new Map<string, { clusters: MapCluster[]; total: number }>(),
  );

  const fetchClusters = useCallback(
    async (nextViewport: MapViewport) => {
      const cacheKey = clusterCacheKey(criteriaSig, nextViewport);
      const cached = clusterCacheRef.current.get(cacheKey);
      if (cached) {
        setClusters(cached.clusters);
        setTotal(cached.total);
        setLoading(false);
        setError(false);
        return;
      }

      const seq = ++vpSeqRef.current;
      setLoading(true);
      setError(false);
      try {
        const res = await getMapClusters(buildMapClusterParams(criteria, nextViewport));
        if (seq !== vpSeqRef.current) return;
        const nextClusters = res.data ?? [];
        const nextTotal = nextClusters.reduce((sum, cluster) => sum + cluster.count, 0);
        const cache = clusterCacheRef.current;
        cache.set(cacheKey, { clusters: nextClusters, total: nextTotal });
        if (cache.size > CLUSTER_CACHE_MAX) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
        setClusters(nextClusters);
        setTotal(nextTotal);
      } catch {
        if (seq !== vpSeqRef.current) return;
        setError(true);
      } finally {
        if (seq === vpSeqRef.current) setLoading(false);
      }
    },
    [criteria, criteriaSig],
  );

  useEffect(() => {
    clusterCacheRef.current.clear();
    vpSeqRef.current++;
    void fetchClusters(viewportRef.current);
  }, [criteriaSig, fetchClusters]);

  const handleViewportChange = useCallback(
    (nextViewport: MapViewport) => {
      setViewport(nextViewport);
      void fetchClusters(nextViewport);
    },
    [fetchClusters],
  );

  return (
    <section style={panelStyle}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{copy.mapLiveTitle}</h2>
      {loading ? (
        <p style={{ ...mutedStyle, marginTop: "0.5rem" }}>{copy.mapLoadingClusters}</p>
      ) : error ? (
        <p style={{ ...mutedStyle, marginTop: "0.5rem", color: "#ff6b6b" }}>{copy.mapError}</p>
      ) : clusters.length === 0 ? (
        <p style={{ ...mutedStyle, marginTop: "0.5rem" }}>{copy.mapEmpty}</p>
      ) : (
        <SearchMapSurface
          clusters={clusters}
          viewport={viewport}
          totalListings={total}
          onViewportChange={handleViewportChange}
          compact={compact}
        />
      )}
    </section>
  );
}

export function SearchMapPanel({
  mapEnabled,
  liveEnabled,
  criteria,
  compact = false,
}: SearchMapPanelProps) {
  const viewport = getDefaultMapViewport();

  if (!mapEnabled) {
    return <SearchMapPanelDisabled />;
  }

  if (!liveEnabled) {
    return <SearchMapPanelMock viewport={viewport} compact={compact} />;
  }

  return <SearchMapPanelLive criteria={criteria} compact={compact} />;
}
