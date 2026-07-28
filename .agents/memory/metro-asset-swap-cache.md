---
name: Metro asset-swap cache staleness
description: Replacing a bundled image in place doesn't refresh in Expo web until Metro caches are cleared
---

When you overwrite a bundled asset file in place (same filename, e.g.
`assets/images/categories/car.jpg` referenced via `require(...)`), Expo's Metro
dev server can keep serving the OLD image bytes/hash. A plain workflow restart
is NOT enough — Metro reuses its on-disk caches and recomputes nothing.

Symptom: after swapping an image (and even after a restart), an external_url
screenshot of the Expo web build still shows the previous image, AND unrelated
in-flight JS edits also look stale (the whole bundle reads old). A suspiciously
fast "Web Bundled NNNNms" (a few seconds for thousands of modules) is the tell
that Metro reused cache.

**Why:** Metro keys assets through a file-map/transform cache under
`/tmp/metro-cache` and `/tmp/metro-file-map-*`; an in-place overwrite isn't
always detected, so the old content hash (and thus old asset URL/bytes) persists.

**How to apply:** before restarting the Expo workflow after an asset swap, clear
the caches:
`rm -rf /tmp/metro-cache /tmp/metro-file-map-* <app>/.expo/cache <app>/.expo/web <app>/node_modules/.cache`
then restart. Warm the real JS bundle (not just the HTML shell) by extracting
the `entry.bundle?...` script src from the page HTML and curling it, then take
the screenshot with a unique cache-buster query param. (app_preview returns
blank for banco-mobile; verify via external_url against the public Expo web URL
with `?noIntro=1`.)

## Watcher blind on this container (Jul 2026)
Metro dev server does NOT pick up source edits at all here (not just assets): every code change needs rm -rf /tmp/metro-cache /tmp/metro-file-map-* + workflow restart, then warm the entry bundle and grep it for a new identifier to prove freshness before trusting any browser test.
