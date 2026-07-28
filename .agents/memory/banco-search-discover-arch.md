---
name: SearchDiscover portal directory architecture
description: SearchDiscover is a clean portal directory — never add feed-style content between the section cards and the Business Hub. Structure is locked.
---

## Rule
`components/SearchDiscover.tsx` is a **portal directory**, not a feed.
Each card = a distinct sub-app / division with its own catalogue and data system.
Nothing belongs between the section cards group and the Business Hub group.

## Correct structure (finalized 2026-07-12)
```
1. Section cards (2×2 grid): Cars | Real Estate | Factories | Materials
   └── [on expand] Engine chips
2. Booking & Stays (full-width 5th portal)
3. ── B2B divider ──
4. Business Hub header
5. Global Supply Portal → /business/supply-hub
6. Global Importers → /business/global-supply
7. Banks & Financiers → /business/banks  (gold #C9A84C)
8. CompanyOffers (company directory)
```

## What MUST NOT be added back between the groups
| Content | Correct home |
|---------|-------------|
| Popular car brand chips | Inside Cars section UI |
| Trending / Recently Viewed cards | Feed tab (Home) |
| Saved / Recent searches | Search results chrome |
| Car Import CTA | Cars-section filter, not a portal |
| Explore on Map CTA | Inline Real Estate affordance |

**Why:** These were accidentally restored from an older design without understanding the
architecture. User explicitly requested they be removed (2026-07-12) and stated the
SearchDiscover structure is canonical — no future structural changes.

## Legacy optional props (do not remove)
`onBrowseBrand`, `onApplySaved`, `onOpenListing`, `onExploreMap`, `onSearchQuery`
are kept in the Props interface as optional so `search.tsx` needs no changes.
They are intentionally unused — the corresponding UI is gone.
