---
name: BANCO mobile icon-font version pinning
description: Why @expo/vector-icons must be pinned EXACT (no caret) or Android icons break app-wide as .notdef boxes
---

# BANCO mobile vector-icon glyph boxes on Android

**Rule:** In `artifacts/banco-mobile/package.json`, keep `@expo/vector-icons` pinned to an
EXACT version (no `^`/`~`) that matches the Expo SDK baseline in expo's
`bundledNativeModules.json` (SDK 54 → `15.0.3`). Never let it drift to a newer minor.

**Symptom when violated:** Icons render app-wide on Android as missing-glyph placeholders
(rectangle-with-an-X / `.notdef`) — tab bar, menu rows, card action buttons — while text and
images render fine. iOS/web look fine. Easy to misdiagnose as a tab-bar z-order / blur issue;
it is NOT.

**Why:** Expo Go ships a fixed, pre-registered build of the icon fonts (the SDK baseline,
15.0.x). Android ignores re-registration of an already-registered font family, so the runtime
`useFonts({ ...Feather.font })` in `app/_layout.tsx` does NOT override Expo Go's bundled TTF.
If the installed JS package is a newer minor (e.g. 15.1.1 via `^15.0.3`), the app uses
15.1.1's glyph map (codepoints) against Expo Go's 15.0.x TTF → codepoints absent from the old
TTF resolve to `.notdef` boxes. Pinning to 15.0.3 makes the JS glyph map match the bundled
font. In dev/EAS builds the app loads its own (now-matching) 15.0.3 TTF, so the pin fixes
those too.

**How to apply:** After any dependency bump or `expo install`, re-check that
`@expo/vector-icons` is still exact and equals the SDK baseline. `expo install --check` will
NOT catch this — it treats any version within the caret range as "up to date". The expo-font
config-plugin native embed is irrelevant for Expo Go (Expo Go ignores custom native config),
so do not rely on it to fix this symptom.

**Unrelated red herring (also hardened once):** Android `expo-blur`
`experimentalBlurMethod="dimezisBlurView"` used as a tab `tabBarBackground` composes over the
tab buttons on New Architecture and hides/blocks them — keep blur iOS/web-only and use a solid
opaque `tabBarStyle.backgroundColor` on Android. This is a DIFFERENT bug from the glyph boxes.
