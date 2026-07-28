---
name: BANCO Booking & Stays section
description: What the Booking & Stays (rentals) section is, and the rules StayCard must follow to stay in parity with the app.
---

# Booking & Stays (الإيجار / بوكينج)

**Essence:** NOT hotels. It is the residential-rental world = Real-Estate feed
filtered to `offer_type = rent` (engine locked `rent`). Purpose: connect people
to places to live. Lives in `components/search/BookingStaysApp.tsx` (forked from
SectionSearchApp) + `app/section/booking.tsx`; cards = `components/StayCard.tsx`.

## Rules (learned the hard way)
- **No blue.** There is NO blue token in the BANCO palette (primary is red).
  Stays wears the Real-Estate identity: `STAYS_ACCENT = sectionAccent("real_estate")`
  (rose-burgundy). Do not introduce a foreign navy/blue "booking" colour.
- **Cards lead with the real photo** as a full-bleed, section-indicating
  background (same pattern as the four Discover section cards: photo + scrim +
  overlaid label), not a flat colour block.
- **StayCard must mirror `SmartAssetCard` exactly** for the identity-B reaction
  and the `React.memo` comparator. Tap = `onSave` (save only); long-press menu =
  Potential (`onPotential` = save + `sendBehaviorSignal("interested")`) and
  not-for-me (`onAngry` = `sendBehaviorSignal("angry")`); section-aware save
  glyph; `potentialFlash`. Never gut it to a no-op / hardcoded heart. The memo
  comparator intentionally compares only id + isSaved + handlers (perf; matches
  SmartAssetCard) — keep parity, don't "fix" it in isolation.

**Why:** the user reviews new surfaces against the existing "respectable
divisions" and reacts strongly when a new card silently drops behaviour (dead
reactions) or invents an off-brand colour. Match the proven feed card first.

## Data reality
- FeedItem v1 has no rooms/area/rating/amenities — StayCard renders only what
  exists (title, location, trust_signal, `price_display`, is_bookable,
  media_preview, is_sponsored). Render `price_display` VERBATIM (honesty rule);
  the BFF already bakes per-term suffixes ("/يوم" etc.).
- Only `furnished_daily` is bookable → BookingCard reserve flow on the detail
  screen (`app/listing/[id].tsx`). Other terms are contact-the-owner rentals.
- Rental taxonomy: `furnished_daily`, `new_law`, `old_law`, `annual_contract`.
