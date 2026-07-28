---
name: BANCO fullscreen image viewer gestures
description: Non-obvious gesture-handler/RN rules for the tap-to-open fullscreen media viewer (pinch/zoom/swipe).
---

# Fullscreen media viewer (tap listing image → fullscreen swipe + pinch-zoom)

The viewer is `components/FullscreenImageViewer.tsx`, opened from `components/MediaGallery.tsx`
(each gallery slide is a `Pressable` → `openViewer(idx)`). It's a `Modal` containing a horizontal
paging `ScrollView`; each page is a `ZoomableImage` (pinch + double-tap + pan) or an expo-video slide.

## Rules that bite (all verified by real bugs the architect caught)

- **A child `Pan` gesture inside a horizontal paging `ScrollView` MUST be `.enabled(zoomed)`.**
  **Why:** an always-active Pan competes with the ScrollView and swallows the horizontal page swipe
  at scale 1, so users can't change images. Gate it: keep a `panEnabled` state, set it true only when
  scale > 1. The gesture builder re-reads `.enabled(panEnabled)` on each render, so toggling the state
  re-arms it correctly.
- **Drive all zoom-state transitions through ONE JS callback (`applyZoom`), not raw `onZoomChange`.**
  `applyZoom(z)` does `setPanEnabled(z)` AND `onZoomChange(z)` together. Every worklet branch calls
  `runOnJS(applyZoom)(true|false)` (pinch end, double-tap both branches). Splitting these two side
  effects is how the pan-enable drifts out of sync with actual zoom.
- **Restore the initial index by REMOUNTING per open, not with a reset `useEffect`.**
  **Why:** an effect that does `scrollTo(initialIndex)` races `onLayout` on Android and silently drops
  the initial scroll on repeat opens (stale `didInit`). Instead the parent gives the viewer a changing
  `key={viewerOpen ? \`viewer-${viewerIndex}\` : "viewer-closed"}` so `index`/`didInit` start fresh
  every open; the one-shot `applyInitialOffset` (guarded by `didInit`) runs on the fresh mount.
- **The Modal needs gesture context.** Root `GestureHandlerRootView` is at `app/_layout.tsx`, but RN
  `Modal` renders in its own host — gestures inside still work here because GestureDetector is used,
  but if you ever see dead gestures in a Modal, wrap its content in its own `GestureHandlerRootView`.
- **Close icon:** use Feather `name="x"` (maps to lucide `X`). `"close"` is NOT a registry key and
  renders the CircleAlert fallback. The icon registry types are per-set: Ionicons type lacks `x`,
  Feather has it — pick the set whose glyphMap type actually contains the name.
