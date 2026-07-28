---
name: BANCO mobile search map view
description: Why the search map is a WebView+Leaflet/OSM page (not a native map / not Google), and the contract any change must respect
---

The BANCO Mobile search "Map" view renders a self-contained Leaflet + leaflet.markercluster +
OpenStreetMap HTML page inside `react-native-webview` (native) / an `<iframe srcDoc>` (web). It is
NOT a native map module (no react-native-maps) and NOT Google Maps.

**Why:**
- The app runs in **Expo Go** via plain `expo start` (no dev/custom build), so native map SDKs
  cannot be loaded at all.
- The project deliberately avoids requiring a **Google Maps API key**. Leaflet + OSM tiles need no
  key and work entirely inside a WebView with zero native modules.

**How to apply (contract — keep these or the map breaks):**
- Markers are **embedded as JSON directly in the HTML** (escaping `<` → `\u003c`); there is no
  runtime map API to call after load. Re-render = rebuild the HTML string.
- Clustering is **honest centroid clustering** computed in-page by markercluster — clusters sit at
  the mean of their children, never a fake/fixed point.
- Bridge is `postMessage` with `{type: ready|error|select, id?}` **plus `{type:"viewport", bounds{min/max_lat/lng}, zoom}`** posted on load and after every pan/zoom (moveend, 300ms debounce). Native posts via `window.ReactNativeWebView.postMessage`; web posts via `window.parent.postMessage(..., "*")`.
- **Viewport server clustering IS wired** (no longer deferred): the page renders the loaded result page as instant pins (layer 1), then the host queries **GET /search/map** for the reported bbox+zoom with the SAME filters as the list (`buildMapClusterParams` = `buildSearchParams` minus limit/cursor + viewport) and injects authoritative clusters via **`window.BANCO_MAP.setClusters(...)`** (layer 2 replaces layer 1 on first response). `count>1` = drill-in bubble; `count===1` = price pill if the single is on the loaded page else a dot that posts `select` (off-page singles open by id). Additive: on fetch failure the map degrades to the loaded page — never worse than before.
- Honest count: after the first server response the caption uses `sum(cluster.count)` (whole visible viewport), not the loaded-page marker count; slow responses are dropped by a monotonic `vpSeqRef` guard.
- **Web hardening is required**: the iframe must keep `sandbox="allow-scripts"` (opaque origin; CDN
  scripts + `window.parent.postMessage` still work) AND the parent message listener must validate
  `event.source === iframeRef.current?.contentWindow` (don't trust origin — sandbox makes it null).
- The WebView/iframe is **keyed by a mapped-set signature** (`id:lat:lng:label` joined) so it
  reloads when the plotted set changes. Because the parent component does NOT remount, reset
  `ready=false`, clear the selection AND reset the server count/`vpSeqRef` on sig change, or the
  spinner stays hidden and a stale pin selection lingers.
- **Gotcha — keyed by the mapped SET, not by the filters:** a pure filter change (e.g. offer_type
  sale→rent) that yields a byte-identical mapped set does NOT re-key/reload the WebView, so server
  clusters + count go stale. Fix already in place: remember the last reported viewport
  (`lastViewportRef`) and, on a criteria-value change with unchanged sig, re-query `/search/map`
  for that viewport (skip when sig also changed — the reload's ready→viewport handles it, avoiding a
  duplicate request).
- `react-native-webview` is pinned to **13.15.0** (SDK54 baseline) — see icon/webview pinning notes.
- Scope: pins + in-page centroid clusters + tap→bottom-card, PLUS auto viewport server clustering
  (GET /search/map on every pan/zoom = effectively "search this area", automatic, no button). Only
  **"near me"** (device-GPS radius) remains deferred — needs a geo/radius query that doesn't exist
  yet; do not fake it client-side.
