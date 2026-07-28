---
name: BANCO section mini-app pages
description: How the 5 dedicated section search pages work (SectionSearchApp) and the invariants that keep them from bleeding into the shared Search tab
---

# BANCO section mini-app pages

Each marketplace section (Cars, Real Estate, Factories, Materials, Booking & Stays)
has its own full-screen pushed page that mounts one reusable component,
`SectionSearchApp` — a complete search engine scoped to ONE locked category
(Booking additionally locks engine=`rent`). SearchDiscover section cards
`router.push` into these pages instead of expanding inline.

## Rules / invariants
- **SectionSearchApp is additive, NOT a refactor of the Search tab.** It owns its
  OWN `useSearchMiniApp` instance. Never route the Search tab through it and never
  make the Search tab depend on section-only props.
- **Reset is by lifecycle, not code.** A fresh `useSearchMiniApp` mounts per
  entry and unmounts on exit → entering always starts clean, leaving discards
  state. Do not add manual reset-on-focus effects.
- **Dirty = delta vs a per-entry baseline, never vs hardcoded defaults.**
  `baselineRef` captures the seeded criteria at mount and is advanced in lockstep
  when the async market preference hydrates. `isDirty` (drives `usePreventRemove`
  exit-confirm) and the section `activeFilterCount` badge both compare against
  that baseline. **Why:** a persisted non-default `marketCountry` must NOT make a
  freshly-landed page "dirty" or show a phantom filter badge, yet ANY user change
  (incl. listingMode) must arm the exit confirmation. If you add a new criteria
  field, the key-sorted `serializeCriteria` snapshot already covers it — do not
  reintroduce field-by-field default comparisons for dirtiness.
- **Market hydration must mirror the Search tab's safe pattern** (marketHydrated
  ref, `applyPatch` functional merge into latest criteria, `sanitizeRentalTermForMarket(null, iso)`,
  conditional `retry` only when a fetch is in flight). A one-shot effect that reads
  `criteria` from a stale closure can overwrite newer user state.
- **Locked engine (Booking):** `selectEngine` early-returns, the facet
  normalization effect skips engine wipes when `lockedEngine` is set, engine chips
  are hidden, and rent-only rental-term chrome shows. Don't let facet gating clear
  the locked engine.
- Shared components gained additive optional props used only here:
  `FilterSheet.lockCategory` (hides the category chip row) and
  `SearchResultsSurface.onRefresh` (adds pull-to-refresh RefreshControl). The
  Search tab passes neither.
- Routes live under `app/section/*` and MUST be registered in `app/_layout.tsx`
  as `Stack.Screen` with `animation: "slide_from_right"` or they 404 on push.
- Exit-confirm resume uses `useNavigation().dispatch(data.action)` — expo-router's
  `router` has no `.dispatch`.
