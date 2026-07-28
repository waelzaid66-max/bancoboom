---
name: BANCO Search NLP
description: Arabic/English NLP query parsing details and critical installment filter bug fix
---

# BANCO Search NLP

## Installment Filter — MUST use EXISTS subquery
Post-query filtering (`items.filter(i => i.installment_badge !== null)`) produces false-zeros when the top-N paginated rows happen to be recently-inserted listings without payment options (e.g. the last-seeded industrial listings).

**Fix applied in `SearchService.searchListings`:** push installment check into the WHERE clause via SQL EXISTS:
```sql
EXISTS (
  SELECT 1 FROM payment_options
  WHERE payment_options.listing_id = listings.id
    AND payment_options.monthly_payment IS NOT NULL
    AND payment_options.mode != 'cash'
)
```

**Why:** Seed order: industrial (no installments) → real estate → cars. DESC created_at returns industrials first. Post-filter on first-page results always returned 0.

## NLP Keyword Maps
- Arabic categories: `سيارة/سيارات/عربية` → `car`, `شقة/فيلا/عقار/ارض` → `real_estate`, `مصنع/معدات` → `industrial`
- Arabic payment: `قسط/اقساط/تقسيط` → `has_installment = true`
- Arabic numbers: `مليون` → 1_000_000, `مليار` → 1_000_000_000, `الف/ألف` → 1_000
- English price: `under/below/less N million/m/k` → `max_price`

## search_term stripping rule
When a structured filter is detected (price range, category, installment), strip the filter keywords before setting `search_term` to avoid title ILIKE matching "installment" or "under 3 million" verbatim. Only set `search_term` on the remaining words if length > 2.
