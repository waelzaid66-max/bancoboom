---
name: BANCO browse-category grouping (client)
description: How the 4 user-facing browse categories map onto the 3-value API category enum, and why industrial groups must be client-filtered.
---

# BANCO browse-category grouping

The mobile app shows **4 browse categories** to users: `car`, `real_estate`,
`facilities` (مصانع وأراضي), `materials` (مواد خام وخطوط إنتاج). The API
`category` enum has only **3** values: `car | real_estate | industrial`.

**Rule:** `facilities` and `materials` BOTH map to API `category=industrial` and
are separated **client-side** by each item's `industrial_type`. Helpers live in
`components/CategoryTabs.tsx`: `apiCategoryFor`, `industrialGroupForCategory`,
`feedItemMatchesCategory`, plus `FACILITIES_TYPES` / `MATERIALS_TYPES` /
`ALL_INDUSTRIAL_TYPES`.

**Why client-side, not the `industrial_type` API param:** the `getFeed`
`industrial_type` param enum is missing `raw_material` (DB + listingAttributes
have it, the param does not). Filtering by the API param would make
`raw_material` listings unreachable. So the contract was extended additively:
`FeedItem.industrial_type` (nullable string) is now surfaced by the BFF, and the
client filters groups by it. This is uniform across home, search, and the
industry hub — never branch one surface onto the param and another onto the
client filter.

**How to apply:**
- For a group category, fetch `category=industrial` (no `industrial_type` param)
  and over-fetch (home uses `limit = PAGE_SIZE * 2`) because client-filtering
  thins each page. Server cursor is independent of the client filter, so
  pagination/load-more stays correct.
- Ads/sponsored items have `industrial_type = null` → they drop out of group
  views. Accepted.
- Known minor edge: selecting a single rare sub-type can yield an all-filtered
  (empty) first page while `has_next` is true; over-fetch mitigates but does not
  fully eliminate it. Group-level ("all" sub-type) selection is robust.
- Create/RFQ forms still use the raw 3-value API category enum (car/real_estate/
  industrial) — do NOT give them facilities/materials.
- Exact AR category labels are a hard product requirement: سيارات / عقارات /
  مصانع وأراضي / مواد خام وخطوط إنتاج (keys `home.categories.*`).
