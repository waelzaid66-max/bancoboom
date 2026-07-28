"use client";

import Link from "next/link";
import type { MapCluster } from "@workspace/api-client-react";
import { bancoBrand } from "@workspace/design-tokens";
import { clusterToViewportPercent, type MapViewport } from "../lib/map-contract";
import {
  formatMapClusterLabel,
  formatMapTotalInViewport,
  searchUiCopy,
} from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";
import { localizedPath } from "../lib/hub-config";

type SearchMapClusterCanvasProps = {
  clusters: MapCluster[];
  viewport: MapViewport;
  totalListings: number;
  compact?: boolean;
};

export function SearchMapClusterCanvas({
  clusters,
  viewport,
  totalListings,
  compact = false,
}: SearchMapClusterCanvasProps) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);
  const mapHeight = compact ? 200 : 280;

  const canvasStyle: React.CSSProperties = {
    position: "relative",
    marginTop: "0.75rem",
    minHeight: mapHeight,
    borderRadius: "var(--banco-radius)",
    border: "1px solid var(--banco-border)",
    background:
      "radial-gradient(circle at 20% 20%, rgba(232,0,45,0.06), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03), transparent 40%), var(--banco-card)",
    overflow: "hidden",
  };

  const bubbleStyle: React.CSSProperties = {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    borderRadius: 999,
    border: "1px solid var(--banco-border)",
    background: "rgba(255,255,255,0.08)",
    color: "var(--banco-fg)",
    fontSize: "0.78rem",
    fontWeight: 700,
    padding: "0.35rem 0.55rem",
    whiteSpace: "nowrap",
  };

  return (
    <div style={canvasStyle} aria-label={copy.mapPreviewAria}>
      <div
        style={{
          position: "absolute",
          inset: 12,
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 12,
          pointerEvents: "none",
        }}
      />
      {clusters.map((cluster, index) => {
        const position = clusterToViewportPercent(cluster, viewport);
        const label = formatMapClusterLabel(
          locale,
          cluster.count,
          Boolean(cluster.listing_id),
        );
        if (cluster.listing_id) {
          return (
            <Link
              key={`${cluster.lat}-${cluster.lng}-${index}`}
              href={localizedPath(`/listing/${cluster.listing_id}`, locale)}
              style={{
                ...bubbleStyle,
                left: `${position.left}%`,
                top: `${position.top}%`,
                background: "rgba(255,255,255,0.12)",
                cursor: "pointer",
                textDecoration: "none",
              }}
              title={`${label} — ${cluster.lat.toFixed(4)}, ${cluster.lng.toFixed(4)}`}
            >
              {label}
            </Link>
          );
        }

        return (
          <div
            key={`${cluster.lat}-${cluster.lng}-${index}`}
            style={{
              ...bubbleStyle,
              left: `${position.left}%`,
              top: `${position.top}%`,
              background:
                cluster.count > 1
                  ? `${bancoBrand.red}22`
                  : "rgba(255,255,255,0.12)",
            }}
            title={`${label} — ${cluster.lat.toFixed(4)}, ${cluster.lng.toFixed(4)}`}
          >
            {label}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          color: "var(--banco-muted)",
          fontSize: "0.78rem",
        }}
      >
        {formatMapTotalInViewport(locale, totalListings)}
      </div>
    </div>
  );
}
