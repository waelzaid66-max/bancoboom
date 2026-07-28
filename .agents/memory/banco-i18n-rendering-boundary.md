---
name: BANCO i18n rendering boundary
description: How Arabic localization renders in the mobile app and which components can/can't use the language hook
---

# BANCO mobile i18n rendering boundary

The mobile app localizes via `useI18n()` (LanguageContext) with `en`/`ar` maps in `constants/i18n.ts`. `const ar: typeof en` — every `en` key MUST have an `ar` counterpart or `tsc` fails.

## Arabic only renders through AppText
Raw RN `<Text>` styled with an `Inter_*` family will NOT shape Arabic correctly. `AppText` auto-maps Inter→Cairo and applies RTL alignment in Arabic. So translating a string is not enough — the LEAF that renders it must be `AppText`.

**Why:** localizing a modal/component's caller `config` (e.g. PermissionRationaleModal) while the component body still uses raw `<Text>` leaves Arabic mis-rendered, and any labels hardcoded inside that leaf (e.g. "Continue"/"Not Now") stay English even though the screen looks "translated".

**How to apply:** when translating a surface, convert the actual rendering component's `<Text>`→`<AppText>` and localize its internal fallbacks/buttons — not just the screen that passes the strings down.

## Components ABOVE/OUTSIDE LanguageProvider can't use useI18n
The ErrorBoundary fallback renders outside the provider tree, so `useI18n()` is unavailable there. LanguageContext exposes a module-level `getCurrentLang()` snapshot (kept in sync by an effect) for exactly these cases; pair it with a local COPY map.

**Why:** the snapshot can be briefly stale right after async language hydration — acceptable for crash-only UI. Such fallbacks may keep raw `<Text>` ONLY because they carry no Inter font (system font shapes Arabic).
