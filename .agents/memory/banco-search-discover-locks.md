---
name: BANCO search / discover locks
description: Two hard UI rules for the mobile Search surface the user demanded repeatedly — do not re-violate.
---

# Search discover = section cards ONLY

The main Search discover screen (`components/SearchDiscover.tsx`) must render ONLY:
the section cards (car / real_estate / facilities / materials), the engine-chip
reveal for car & real_estate, and the "explore on map" CTA. Nothing else.

Explicitly REMOVED and must NOT be reintroduced: company/developer offers row,
recent-queries strip, popular-brands strip, saved-searches strip, trending strip,
recently-viewed strip (and the CompactCard helper that fed them).

**Why:** the user stated many times ("agreed 4 times, paid for it") that the page
is for sections and "there is no room for strips at all." Re-adding any horizontal
content row here is treated as unrequested tampering (عبث), same severity class as
the home-search-bar ban.

**How to apply:** keep the discover body to sections + engine reveal + map CTA.
The Props interface may still carry now-unused callbacks (onBrowseBrand /
onApplySaved / onOpenListing / onSearchQuery) for caller compatibility — leaving
them is fine (noUnusedLocals is false); do NOT take them as a hint to render strips.

# Bottom tab bar must persist inside the section mini-apps

The section screens (`app/section/*`, incl. `booking`) are pushed as full-screen
Stack routes ABOVE the `(tabs)` navigator, so the real `CapsuleTabBar` is hidden
inside them. `components/MiniAppBottomNav.tsx` restores a persistent bottom nav in
`SectionSearchApp` and `BookingStaysApp`: a heavier (less transparent) glass
mirror of the tab bar that `router.navigate`s back to the 5 tab routes.

**Why:** the user's standing requirement is the bottom nav stays visible in every
mini-app; its absence was a real unmet request.

**How to apply:** any NEW full-screen surface launched above `(tabs)` that should
feel in-app must render `<MiniAppBottomNav />` and clear it in layout — bump the
floating map-toggle to `insets.bottom + 100` and pass `contentPaddingBottom`
`insets.bottom + 150` to the results list so content isn't hidden behind the bar.
Read unread state from the SHARED react-query cache (no own refetchInterval) — the
underlying tab bar still owns the poll; a second interval doubles network/battery.
