---
name: BANCO engine/sub-filter strip flicker & empty-gap
description: Why the EngineChips row under CategoryTabs flickered ("appears once then disappears") and reserved an empty black gap, and the rule that prevents it.
---

# Engine-strip flicker & empty gap

The EngineChips / IndustrialSubChips row sits BELOW CategoryTabs on both the home
and search tabs. Two distinct defects produced the same user-visible "it shows
then vanishes / leaves an empty black gap":

1. **Fail-open-then-collapse flicker.** `lib/facets.ts` `engineMatchesFacets()`
   returns core chips when facets are not yet loaded (fails OPEN), so
   `visibleEngines()` yields the full core set during the load window. Rendering
   the row on `engineList.length > 1` alone shows it during load, then it shrinks
   or unmounts once real counts arrive.
   **Rule:** gate the row on facets RESOLVED — `!loading && engineList.length > 1`
   — consuming `loading` from `useInventoryFacets()`. On a genuine facet error
   `loading` flips false while facets stay undefined, so `visibleEngines()` still
   fails open → real inventory is never hidden. Honest AND flicker-free.

2. **Stale measured height (home only).** The home engine bar animates an outer
   wrapper height = `engineBarH * (1 - barCollapse)`, where `engineBarH` is an
   onLayout-measured pixel value. The measurement was guarded by `!compact`, so
   switching category while scrolled (compact) kept a stale height → an empty
   reserved gap on scroll-up.
   **Rule:** measure on every layout (drop the `!compact` guard — the inner
   content View keeps intrinsic height even when the outer wrapper is clipped to
   height:0), and on category switch reset `setCompact(false)` + `setEngineBarH(0)`
   so the next pass re-measures the incoming chip set.

**Why it matters:** the honesty rule is sacred (never surface a permanently-empty
section) but a real section must never flicker either. The fix preserves the
fail-open-on-error behavior while removing the load-time flash.
