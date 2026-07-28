---
name: BANCO EAS native Android build
description: What it takes to produce a native Android AAB via EAS for this Expo-Go-only project, and the packaging conflict that blocks it.
---

# Building a native Android AAB for banco-mobile (EAS)

The app is architected Expo-Go-only (static-bundle deploy via scripts/build.js, no
native android/ios dirs). A native EAS build is possible but needs build-config
additions that do NOT affect the Expo Go dev flow or the static web bundle:

- `app.json` → `android.package` + `android.versionCode` (required for a store AAB).
- `eas.json` with a `production` profile: `android.buildType: "app-bundle"`,
  `appVersionSource: "local"`, `environment: "production"`.
- EAS project link (`eas init`) writes `extra.eas.projectId` + `owner` into app.json.
- EAS **production env vars** must exist for the runtime keys the app reads at boot:
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_DOMAIN` (else ClerkProvider
  throws / API base is empty). These live on EAS, not just in Replit secrets.
- Build with `EAS_NO_VCS=1` (uncommitted config gets uploaded; git commit is restricted)
  and `EAS_BUILD_NO_EXPO_GO_WARNING=true`.

## The blocking Gradle failure (and the fix)
`:app:mergeReleaseJavaResource FAILED` — "2 files found with path
`META-INF/versions/9/OSGI-INF/MANIFEST.MF`" from `okhttp3:logging-interceptor` (5.x,
multi-release JAR) and `org.jspecify:jspecify`. Both are transitive (RN/Clerk stack).

**Fix:** add `expo-build-properties` plugin with an Android packaging exclude:
```json
["expo-build-properties", { "android": { "packagingOptions": { "exclude": ["META-INF/versions/9/OSGI-INF/MANIFEST.MF"] } } }]
```
`expo install expo-build-properties` (SDK54 → ~1.0.10). It's a prebuild-only plugin;
no-op in Expo Go runtime, so it's safe for the existing dev/deploy paths.

**Why:** AGP refuses to pick between duplicate META-INF metadata from two multi-release
JARs; this is the ONLY way to resolve it without native dirs.

## Honesty caveats when delivering the AAB
- It points at the EPHEMERAL Replit dev backend (`EXPO_PUBLIC_DOMAIN` = dev domain)
  and the Clerk **dev** instance — not production infra.
- App was built/QA'd for Expo Go; native runtime behavior isn't guaranteed identical.
- EAS builds cost the user's EAS credits and take ~15-25 min (queue + ~6m gradle).

## Reading EAS build logs
`eas build:view <id> --json` → `logFiles[0]` is an NDJSON log served with content
encoding; fetch with `curl --compressed` (plain curl yields undecodable bytes).
Each line is `{phase, msg, ...}`; grep `msg` for `FAILED`/`What went wrong`.

## Icon assets fixed (2026-07-20)
- `icon.png`/`favicon.png` were JPEG-content masquerading as .png (icon also non-square 1194×1139) → expo-doctor failed the app.json schema check and would break the Android adaptiveIcon in native builds. Re-encoded PNG32, icon squared to 1194×1194 (black pad = original bg). expo-doctor now 18/18. If icons are ever replaced, verify with `file` + `magick identify` that content is真 PNG and square BEFORE committing.

## Expo Go via replit proxy needs EXPO_TOKEN (Jul 2026)
The *.expo.worf.replit.dev manifest proxy runs `npx expo` non-interactively → HTTP 500 "Input is required… EXPO_TOKEN" on the phone until an EXPO_TOKEN secret exists (encrypted store, then restart expo workflow). Pre-warm launchAsset URL from the manifest to spare the phone the first compile.
