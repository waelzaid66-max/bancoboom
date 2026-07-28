---
name: Expo CI auth crash + port prompt
description: With EAS owner/projectId in app.json, dev Metro under CI=1 dies demanding EXPO_TOKEN; EXPO_OFFLINE=1 is the permanent fix
---

Dev Metro (`start-dev.sh`) MUST export `EXPO_OFFLINE=1` and `fuser -k` the Metro port before `expo start`.

**Why:** Restoring EAS identity (`expo.owner` + `extra.eas.projectId` in app.json — required for EAS builds) makes `expo start` try to authenticate against Expo's servers. Under `CI=1` (non-interactive) it throws "Use the EXPO_TOKEN environment variable" and exits — Expo Go then shows the 500 "There was a problem running the requested app" screen. Separately, any stale Metro holding the port triggers the interactive "Use port X instead?" prompt, which also exits under CI.

**How to apply:** EAS builds carry their own EXPO_TOKEN and never go through start-dev.sh, so offline mode only affects dev. Verified 2026-07-28: after the fix, `localhost:23351/status` = packager-status:running and /manifest returns 200 for ios+android.
