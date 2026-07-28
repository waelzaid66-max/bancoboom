---
name: BANCO rental term picker (stays)
description: The rental term filter in BookingStaysApp was changed from a horizontal chip strip to a compact modal-picker button
---

**What changed:** `BookingStaysApp.tsx` — replaced the horizontal `ScrollView` chip strip (`testID="stays-rental-strip"`) with `RentalTermPickerButton` component (`testID="stays-rental-term-btn"`).

**Why:** Owner requested all rental-term / date-period selectors be collapsed into a compact icon-button (same pattern as MarketCountryButton) so header chrome stays lean.

**How it works:**
- `RentalTermPickerButton` is a file-local component defined before `export function BookingStaysApp`.
- Shows active term label (calendar icon + label + chevron-down) or "All types" / "كل الأنواع" when no term is selected.
- Tapping opens a `Modal` (fade) with the term list + an "All types" row.
- Active term shown with `${STAYS_ACCENT}1A` background + check icon.
- Calls `update({ rentalTerm: null })` for "all types", `selectRentalTerm(v)` for a real term (selectRentalTerm is a toggle: same value → null).

**Guard key:** `testID="stays-rental-term-btn"` — guard test `section-miniapp-guard.test.mjs` was updated from the old strip testID.

**Styles removed:** `hScroll`, `rentalChrome`, `rentalChip`, `rentalChipText` — orphaned after the strip was replaced.

**i18n added:** `search.discover.rentalTermAny` ("All types" / "كل الأنواع").
