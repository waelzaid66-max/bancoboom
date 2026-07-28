---
name: BANCO BFF Architecture
description: Immutable FeedItem v1 contract, layer rules, and global response shape that all BANCO surfaces must respect
---

# BANCO BFF Architecture

## The Rule
FeedItem TypeScript type is IMMUTABLE for v1. Never rename, remove, or add required fields without bumping to /v2/*.

```typescript
// FeedItem — v1 contract (locked, exactly 11 fields)
{
  id,              // listing identifier (use for navigation — same as DB listing id)
  media_preview,
  price_display,
  installment_badge,  // nullable
  title,
  location,
  urgency_signal,     // nullable
  trust_signal,
  smart_badge,        // nullable
  has_video,
  is_sponsored
}
// Note: category and seller_id are NOT in FeedItem — use ListingDetail endpoint for full data
```

## Additive evolution (allowed without /v2)
Adding NEW fields to FeedItem/ListingDetail is allowed on v1 ONLY if backward-compatible:
the field is OPTIONAL in OpenAPI (NOT in `required`, so generated client types stay
optional), and "present-always but nullable" in the server Zod schema + transforms (emit
`null`, never omit). Existing core fields/`ListingDetail.payment` must stay byte-identical.
Example: payments+geo work added `coordinates` + `best_offer_badge` to FeedItem and
`coordinates`/`offers`/`best_offer` to ListingDetail this way — no /v2 bump needed.
**Why:** old mobile/dealer/admin clients keep compiling and running unchanged; only
renames/removals/new-required-fields are breaking and force /v2.

## Islamic financing (hard rule)
Islamic (Murabaha) offers must NEVER carry a rate/APR field anywhere (OfferSchema,
OpenAPI, generated client, DB→response). Conventional offers amortize from
`annualRatePct`; Islamic uses `profitRatePct` to compute total/monthly ONLY. `best_offer`
excludes cash; lowest monthly (tiebreak total), or lowest total (tiebreak monthly) when
all-Islamic. Geo + offers are attached in `SearchService.enrichListings` (batched IN
queries, no N+1) which the feed/search/ads/recommendation paths all funnel through.

Global response shape — every endpoint, no exceptions:
```json
{ "data": any, "error": { "code": string, "message": string } | null, "meta": { "cursor"?: string, "has_next"?: boolean, "total"?: number } }
```

Error data is always `[]` (never null). Error codes: `INVALID_DATA`, `NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

## Layer Rules (non-negotiable)
- `services/` — all business logic. Zero Express imports.
- `controllers/` — call service → validateResponse() → return JSON. No logic.
- `validators/` — all Zod schemas. Shared by controllers + services.
- `middlewares/` — Clerk auth (role guard: /v1/dealer/* blocked for non-dealer), rate limiter, request logger.
- `db/` — Drizzle schema + parameterized queries only. No formatting, no ranking.

## Key behaviors
- `transformToFeedItem` drops listings missing `id`, `thumbnail_url`, or `base_price_cash` — never returned partially.
- `validateResponse(schema, payload)` is called before EVERY successResponse send in all controllers — fails closed.
- `adaptFeed()` is in-memory, < 10ms, never blocks the request path. No longer uses item.category (removed from FeedItem).
- `POST /v1/leads/track` is fire-and-forget via `setImmediate` — never blocks.
- Rate limiter needs `app.set("trust proxy", 1)` on Replit (X-Forwarded-For).
- BulkImportService uses per-BATCH transactions (100 rows/batch, entire batch rolls back on any failure).
- GIN index on listing_attributes.specs for JSONB query performance.

**Why:** Contract stability lets the mobile and dealer-web clients build against the API independently without coordination overhead.
