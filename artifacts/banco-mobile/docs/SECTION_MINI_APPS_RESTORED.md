# Section mini-apps restored (Discover → `/section/*`)

## What was wrong
Discover section cards called `onBrowseSection`, which filtered the shared
Search tab in place. That melted Cars / Real Estate / Factories / Materials
into one shared search surface (CategoryTabs + empty chips + load error).

## What is restored
- `SearchDiscover` uses `SECTION_ROUTE` + `router.push` for every section card.
- Booking still opens `/section/booking` → `BookingStaysApp`.
- `app/_layout.tsx` registers all five `section/*` Stack screens again.
- Engine chips live inside each `SectionSearchApp` mount — not inline on Discover.

## Invariants (do not regress)
See `.agents/memory/banco-section-pages.md`.

## Out of scope here
- API “Couldn't load results” errors (separate).
- Website work — website is a **new independent project**, not this mobile artifact.
