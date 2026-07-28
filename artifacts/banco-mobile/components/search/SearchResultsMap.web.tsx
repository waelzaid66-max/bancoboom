import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { marketCountryMapCenter } from "@/lib/searchTaxonomy";
import { buildMapHtml, feedItemsToMarkers, type MapBridgeMessage } from "./mapHtml";
import { MapOverlayChrome } from "./MapOverlayChrome";
import type { SearchResultsMapProps } from "./SearchResultsMap";

/**
 * Web map surface: the same self-contained Leaflet/OpenStreetMap page rendered
 * in an <iframe srcDoc>. A srcDoc iframe shares the parent origin, so the page
 * can postMessage selections straight back to a window "message" listener here.
 * Keeping this on web means the preview pane shows a real, working map instead
 * of a dead fallback — and never imports react-native-webview into the web bundle.
 */
export function SearchResultsMap({
  items,
  criteria,
  onOpenListing,
  onSave,
  isSaved,
}: SearchResultsMapProps) {
  const colors = useColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const markers = useMemo(() => feedItemsToMarkers(items), [items]);
  const sig = useMemo(
    () => markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.label}`).join("|"),
    [markers],
  );
  const html = useMemo(
    () =>
      buildMapHtml(
        markers,
        {
          primary: colors.primary,
          primaryForeground: colors.primaryForeground,
          card: colors.card,
          foreground: colors.foreground,
          border: colors.border,
        },
        marketCountryMapCenter(criteria.marketCountry),
        criteria.nearMeEnabled &&
          criteria.nearLat != null &&
          criteria.nearLng != null
          ? {
              lat: criteria.nearLat,
              lng: criteria.nearLng,
              radiusKm: criteria.nearRadiusKm,
            }
          : undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sig,
      colors.primary,
      colors.primaryForeground,
      colors.card,
      colors.foreground,
      colors.border,
      criteria.marketCountry,
      criteria.nearMeEnabled,
      criteria.nearLat,
      criteria.nearLng,
      criteria.nearRadiusKm,
    ],
  );

  // A reloaded iframe (keyed by `sig`) loses its in-page selection; drop ours
  // too so a stale pin selection never lingers across map reloads.
  useEffect(() => {
    setSelectedId(null);
  }, [sig]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Only trust messages from our own map iframe, not other window senders.
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const msg = JSON.parse(String(event.data)) as MapBridgeMessage;
        if (msg.type === "select" && typeof msg.id === "string") setSelectedId(msg.id);
      } catch {
        // Ignore non-map messages on the shared web message channel.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]}>
      <iframe
        key={sig}
        ref={iframeRef}
        title="search-map"
        srcDoc={html}
        sandbox="allow-scripts"
        style={{ border: "none", width: "100%", height: "100%" }}
      />
      <MapOverlayChrome
        count={markers.length}
        selected={selected}
        onClose={() => setSelectedId(null)}
        onOpenListing={onOpenListing}
        onSave={onSave}
        isSaved={isSaved}
      />
    </View>
  );
}
