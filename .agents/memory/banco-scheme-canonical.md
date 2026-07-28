---
name: BANCO app scheme canonical
description: the one true mobile deep-link scheme (bancooom) and the drift tripwire
---
- Canonical custom scheme is `bancooom` — consistent with package/bundle `com.bancooom.app`, the website smoke test (`bancooom://`), and the GCP deploy repo name. `bancoboom` appeared exactly once, in `app.json`, introduced by a "Update Replit configuration" config-sync commit, and was reverted (July 2026). No code ever referenced the drifted value.
- The mobile `universal-links` guard test asserts the scheme literally. If it fails, treat it as **app.json drift**, not a stale test.

**Why:** environment/config-sync commits can silently rewrite app.json fields; a scheme change breaks OAuth redirects and custom-scheme deep links for future builds.

**How to apply:** before "fixing" either side, run `rg -n "bancooom|bancoboom"` repo-wide and side with the ecosystem-consistent value.
