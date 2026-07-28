---
name: BANCO Android tab-bar layering & touch (absolute bar + elevation/box tradeoff)
description: Why the Android bottom tab bar's icons dim/flash and taps die, and the elevation-vs-opaque-box fix that keeps the glass look.
---

# Android absolute tab bar: elevation is required for touch, but a border/bg on the bar makes it cast an opaque box

Symptom (Android only, iOS fine): bottom tab icons fade/disappear, taps in the bar
don't register, occasional flashing/distortion.

**Root cause:** the tab bar is `position: absolute` (needed so content scrolls
under it for the iOS blur, and tab screens hard-code `paddingBottom: 120` assuming
that). With `elevation: 0`, the react-native-screens scene composites ABOVE the
absolute bar on Android → it dims the icons and swallows taps. So the bar needs a
positive `elevation` to become the top interactive layer.

**The trap:** simply adding `elevation` makes the bar paint a full-rectangle shadow
("opaque box") that ruins the glass — BUT only because the bar container had a
drawable. A `borderTopWidth`/`borderTopColor` (or any background) on `tabBarStyle`
forces Android to attach a background drawable whose outline = full bounds, and
elevation casts a shadow from that outline. An earlier fix removed elevation to
kill the box, which reintroduced the touch/dim bug.

**Fix:** keep the bar container drawable-free — `backgroundColor: 'transparent'`,
NO border on `tabBarStyle` — and move the hairline top border onto the
`tabBarBackground` glass layer (which is `pointerEvents="none"` and rendered behind
the buttons). Then set `elevation: isAndroid ? 8 : 0` plus `zIndex: 1`. Drawable-free
+ elevation = the bar lifts above the screen for touch with NO shadow box; the glass
(iOS BlurView / Android opaque-ish LinearGradient) is untouched.

**Why:** Android elevation drives both global Z draw order and touch dispatch among
overlapping native views; the shadow is derived from the view's outline, which only
exists when the view has a background/border drawable.

## Geometry matters: a ROUNDED floating capsule is the opposite case

The "no bg on the elevated bar" rule above is specific to the FULL-WIDTH
RECTANGULAR `tabBarStyle` (outline = full bounds → a hard rectangular shadow box).
A custom ROUNDED floating capsule is the inverse: its elevated shadow-host MUST
carry an **opaque** `backgroundColor` + a `borderRadius` that matches the visible
capsule + `elevation`, or Android casts **no shadow at all** (no drawable → no
outline → no shadow). With the opaque bg + matching radius the outline is a rounded
rect, so the elevation shadow is a soft ROUNDED shadow — NOT the opaque box.

Current Apple-glass bar (`app/(tabs)/_layout.tsx`): `shadowHost` (borderRadius 30 +
iOS shadow props; on Android adds opaque bg + `elevation`) wraps `capsule`
(same borderRadius 30, `overflow: hidden`, hairline border, holds the glass). The
glass capsule fully covers shadowHost, so the opaque host bg is never visible — it
only exists to give Android a rounded outline to cast the shadow from. Do NOT
"fix" this by stripping the host bg: that silently kills the Android depth and
makes the bar look flat. iOS = real BlurView; Android = opaque-ish LinearGradient;
all glass/rim/tint layers are `pointerEvents="none"` and sit behind the buttons.

**Why:** Android elevation shadow is derived from the view's drawable outline,
which respects borderRadius. Rounded opaque drawable → rounded shadow (good);
no drawable → no shadow; rectangular drawable → opaque box (bad). The fix differs
by geometry, so a literal reading of the rectangular rule will false-positive a
rounded capsule. (A code review flagged the host bg as a violation — it is not.)

**How to apply / standing rules:**
- Never put `borderTopWidth`/`borderTopColor` or a solid `backgroundColor` directly
  on `tabBarStyle` if the bar is absolute + elevated — push them to the
  pointerEvents-none `tabBarBackground` layer instead.
- BUT for a rounded floating capsule, keep the opaque bg + matching borderRadius +
  elevation ON the shadow-host; cover it with the glass capsule. This is correct
  and required, not a violation.
- The Android glass MUST stay a LinearGradient, never a BlurView (Dimezis blur on
  SDK 54 New Arch composes above the buttons and eats touches — see
  banco-android-icon-fonts.md).
- The PostAssetFab is fine as-is: `box-none` wrapper + pointerEvents-none halo,
  anchored `tabBarHeight + 16` ABOVE the bar, and rendered as a later sibling than
  `<Tabs>` so it draws above the elevated bar without overlapping it.
