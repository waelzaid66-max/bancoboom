import { getMapClusters } from "@workspace/api-client-react";
import { buildSearchParams } from "./buildSearchParams";
import type { SearchCriteria } from "./types";

type MapClusterParams = Parameters<typeof getMapClusters>[0];

export interface MapViewport {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  zoom: number;
}

export function buildMapClusterParams(
  c: SearchCriteria,
  viewport: MapViewport,
): MapClusterParams {
  const filters: Record<string, unknown> = { ...buildSearchParams(c) };
  delete filters.limit;
  delete filters.cursor;
  return { ...filters, ...viewport } as MapClusterParams;
}

export function viewportCenter(viewport: MapViewport): { lat: number; lng: number } {
  return {
    lat: (viewport.min_lat + viewport.max_lat) / 2,
    lng: (viewport.min_lng + viewport.max_lng) / 2,
  };
}

export function boundsLiteralToViewport(
  bounds: { north: number; south: number; east: number; west: number },
  zoom: number,
): MapViewport {
  return {
    min_lat: bounds.south,
    max_lat: bounds.north,
    min_lng: bounds.west,
    max_lng: bounds.east,
    zoom,
  };
}

export function clusterCacheKey(criteriaSig: string, viewport: MapViewport): string {
  return `${criteriaSig}:${viewport.max_lat.toFixed(3)}:${viewport.min_lat.toFixed(3)}:${viewport.max_lng.toFixed(3)}:${viewport.min_lng.toFixed(3)}:${viewport.zoom}`;
}

export function clusterToViewportPercent(
  cluster: { lat: number; lng: number },
  viewport: MapViewport,
): { left: number; top: number } {
  const lngSpan = viewport.max_lng - viewport.min_lng;
  const latSpan = viewport.max_lat - viewport.min_lat;
  const left = lngSpan > 0 ? ((cluster.lng - viewport.min_lng) / lngSpan) * 100 : 50;
  const top = latSpan > 0 ? ((viewport.max_lat - cluster.lat) / latSpan) * 100 : 50;
  return {
    left: Math.min(96, Math.max(4, left)),
    top: Math.min(96, Math.max(4, top)),
  };
}
