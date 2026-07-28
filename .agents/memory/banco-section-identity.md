---
name: BANCO section-identity backdrop system
description: The shared per-section gradient+motif backdrop, the "no blank card" rule, motif-name registry constraint, and the blue=banks-only rule.
---

# BANCO section-identity system

`lib/sectionTheme.ts` defines, per section key (`Category | "banks" | "industrial"`):
- `SECTION_ACCENT` / `sectionAccent()` — the section's accent colour.
- `SECTION_GRADIENT` — a 2-stop background gradient.
- `SECTION_MOTIF` — a motif icon name.
`components/SectionBackdrop.tsx` renders gradient + a large faint centered motif as an absolute-fill fallback.

## Rule: a card is NEVER a blank grey box
Every asset card (`SmartAssetCard`, `IndustrialAssetCard`, `StayCard`) renders `<SectionBackdrop section={item.category}/>` UNDER the photo and only renders `<Image>` when `item.media_preview` is truthy. A listing with no photo shows its section's gradient+motif, not an empty box.
**How to apply:** any new card type must follow the same fallback pattern.

## Constraint: SECTION_MOTIF names must be REGISTRY-mapped
Icons render through the custom lucide registry `components/icons.tsx`, NOT native Ionicons. An unmapped name silently renders the fallback warning glyph (a code review caught raw Ionicons names like `car-sport`/`cube`/`construct`/`card` failing this way). Only use names present in `components/icons.tsx` (e.g. `grid`, `car`, `home`, `business`, `package`, `cog`, `credit-card`, `wallet`).

## Rule: blue is BANKS ONLY
`BANKS_ACCENT = #1668B5` (trust-blue). Banks & Financiers is the ONLY section outside BANCO's red family.
**Why:** Booking & Stays was wrongly navy/blue; blue was always meant for banks. Booking/Stays is real-estate rentals → uses the `real_estate` rose identity (`sectionAccent("real_estate")` / `STAYS_ACCENT`), NEVER blue. The Discover booking card + booking section must use the rose/real-estate identity + a real furnished-rental photo (`assets/images/categories/booking.jpg`), like the other 4 section cards.
