---
name: BANCO icons are SVG (lucide), NOT icon fonts — Android tofu permanently fixed
description: The permanent fix for Android app-wide tofu/.notdef icons is SVG icons (lucide-react-native), which have no TTF/glyph-map at runtime. The whole icon-font saga below is why fonts were abandoned — do not revert to them.
---

# THE permanent fix: SVG icons (lucide-react-native), no fonts at all

BANCO mobile renders ALL icons as SVG via `lucide-react-native` (+ `react-native-svg`),
exposed by the single registry `components/icons.tsx`. There is NO icon TTF and NO
glyph map at runtime anymore, so the entire class of Android tofu/.notdef bugs is
structurally impossible — there is no font to collide, mis-version, or fail to preload.

**Why SVG instead of fixing fonts:** the font path was fought four times (preload,
exact pin, unique families, valid glyph names — all detailed below) and STILL
regressed on real Android devices. SVG sidesteps the root cause entirely: each icon
is a vector component, identical across Expo Go / dev builds / EAS / web. This
migration was an explicit, user-approved decision after repeated font failures —
do NOT revert to `@expo/vector-icons` rendering.

**How the registry works (`components/icons.tsx`):**
- `ICONS` maps every historical icon name (the old Feather/Ionicons/MaterialCommunityIcons
  names used at call sites) to a lucide component. A `FILLED` set (heart/star) paints
  the interior for active state. Brand marks lucide lacks (Google multicolor, WhatsApp,
  TikTok) are hand-authored inline SVGs.
- `IconBase` is the one wrapper: unknown name → `CircleAlert` placeholder + `__DEV__`
  warn (never a blank box). `Feather`/`Ionicons`/`MaterialCommunityIcons` are ALL the
  same `IconBase`, cast to the `@expo/vector-icons` component TYPES via a type-only
  `typeof import("@expo/vector-icons")` (erased at build) so existing call-site `name`
  typing keeps working WITHOUT pulling the library in at runtime.
- The icon `style` prop is `StyleProp<ViewStyle>` (SVG/lucide need ViewStyle, NOT the
  old TextStyle). Caveat: do not add runtime `*.glyphMap`/`.font` reads — those statics
  don't exist on `IconBase`; the cast is type-only.
- ALL app code imports icons from `@/components/icons`, never `@expo/vector-icons`.

**How to apply:** add a NEW icon by adding its name→lucide entry to `ICONS` (and to
`FILLED` if it has an active filled state); for a brand glyph lucide lacks, add an
inline SVG. Never import an icon component straight from `@expo/vector-icons`, and
never reintroduce `createIconSet`/font preloading for icons.

**Guard:** `tests/icons.test.mjs` (`pnpm --filter @workspace/banco-mobile run test:icons`)
asserts the SVG invariants — registry renders lucide (no `createIconSet`/`banco-*`
families), no source has a RUNTIME `@expo/vector-icons` import, root layout no longer
preloads icon fonts, and every icon name USED in the app is mapped. The coverage scan
reads precise icon positions (icon-component JSX, `renderTabIcon(...)`, `icon:` config,
CategoryIcon `{lib,name}`, and bodies of helpers whose RETURN TYPE is an icon name like
`socialIcon`/`planIcon`) and filters by real glyph names to avoid false positives.

**Still-true rendering rule:** do NOT nest an icon directly inside the custom
`<AppText>` component — render icons as siblings inside a row `View`. (Carried over
from the font era; keep it for layout/measurement cleanliness.)

**Dependencies:** `lucide-react-native` + `react-native-svg` are the runtime deps.
`@expo/vector-icons` remains only a devDependency (for the type-only import and the
test's glyph-name maps); its `pnpm-workspace.yaml` override is left in place. Web
bundling cannot prove the Android fix — the real proof is a native device.

---

# HISTORICAL: why icon FONTS failed on Android (do not retry these)

Kept so no future agent re-attempts the font path. None of this is live anymore.

- **Preload:** `@expo/vector-icons` glyphs tofu (□) if the set's TTF isn't registered
  before first paint; the supposed fix was spreading every set's `.font` into root
  `useFonts`. Necessary but NOT sufficient.
- **Family collision (the real app-wide killer):** each component self-loads its TTF
  but SKIPS the load when `Font.isLoaded(family)` is already true. Expo Go ships its
  OWN TTFs under the stock families `feather`/`ionicons`/`material-community` (often a
  different version), short-circuiting our load → our JS glyph map renders against the
  wrong TTF → tofu everywhere. The attempted fix was `createIconSet(glyphMap,
  "banco-feather"|..., font)` under UNIQUE families + preload. It worked in theory but
  the font path stayed fragile across cache/version states — hence the SVG migration.
- **Invalid glyph names:** a name not in a set's glyph map paints a blank box even with
  correct preload+pin. (Under SVG this becomes the `CircleAlert` fallback + dev warn.)
- **Exact pin:** `@expo/vector-icons` had to be pinned to the SDK baseline or codepoints
  mismatched. Irrelevant now that no glyph map renders.
