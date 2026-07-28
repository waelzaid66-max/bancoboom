# Global Car-Brand Reference — Report

**Date:** 2026-07-04 · **Scope:** brands only (no models / trims / years, by design)

## Approach (why no new table)
The marketplace already runs on a `brands` table (id, name, slug, category) with a
`brands → models → car_variants` hierarchy, read by search, filters, the create
form, admin, and the brand auto-learn path (`NormalizationService.learnBrand`).

Rather than create a parallel reference table (which would duplicate brands and
NOT integrate), the existing `brands` table was **enriched** with additive,
optional/defaulted columns: `name_ar, country, parent_company, founded_year,
logo_url, is_active, is_premium, is_electric, is_commercial, popularity,
search_keywords, updated_at`. Every existing query, insert and the auto-learn
path stays byte-compatible (all selects are explicit-column; new columns default).
The seed upserts by `slug`, so brands already present are enriched **in place** —
zero duplication — and missing global brands are added.

Result: search / filters / create / admin pick this up automatically, with **no
API or business-logic change**.

## 1. Brands added
- **111 active global car brands** in the production seed (`seed:car-brands`).
- Verified in a real DB: 111 rows, **111 distinct slugs — no duplicates**; a
  pre-existing lowercase "toyota" row was enriched to `Toyota / تويوتا / Japan /
  popularity 98`, proving enrich-not-duplicate.

## 2. Countries covered (16)
Japan, South Korea, Germany, United Kingdom, Italy, France, United States,
Sweden, Czech Republic, Spain, Romania, India, Malaysia, Russia, China, Vietnam.

## 3. Parent companies / groups (58 distinct), e.g.
Toyota, Honda, Nissan, Hyundai Motor Group, Volkswagen Group, Stellantis,
General Motors, Ford, BMW Group, Mercedes-Benz Group, Geely, SAIC, Great Wall
Motors, BYD, Chery, Changan, Renault Group, Tata (JLR), Mahindra, Tesla, etc.

## 4. Segmentation flags
Premium = 40 · Electric-only marques = 21 · Commercial-focused = 5. Each brand
also carries bilingual `search_keywords` (English + Arabic + common misspellings)
so autocomplete/search resolve "شيري", "chery", "شيفورليه", "vw", etc.

## 5. Missing / hard-to-source data (honest)
- **Logos:** `logo_url` is intentionally **null** — real logo files are not
  fabricated. The column is ready; upload assets (or wire a logo CDN) later.
- **Arabic names for niche Chinese/EV marques:** transliterated where no
  established Arabic form exists (kept in `search_keywords` too). Safe for search.
- **`popularity`** is an editorial 0–100 sort weight (MENA-market informed), not a
  measured statistic — tune from real engagement once data accrues.
- A few ultra-niche/coachbuilder marques are omitted to avoid clutter; adding one
  is a single data line (no schema change).

## 6. Models bootstrap — DONE (batch 2)
- **327 real models across 26 top brands** seeded into the existing `models`
  table (`seed:car-models`), each with a body type (sedan/suv/hatchback/coupe/
  pickup/van/crossover/minivan/convertible). Verified: 332 total / 332 distinct
  slugs (no dup), idempotent re-run, every model linked to a valid brand FK, the
  5 pre-existing models preserved (never deleted). Slug convention matches the
  current seed (`slugify("<brandName>-<modelName>")`).
- Covered brands: Toyota, Lexus, Hyundai, Kia, Nissan, Chevrolet, Mitsubishi,
  Honda, Mazda, Mercedes-Benz, BMW, Audi, Volkswagen, Jeep, Renault, Peugeot, MG,
  Chery, BYD, Suzuki, Škoda, Geely, Haval, Ford, Opel, Fiat.

## 7. Next phase (generations → trims → engines) — NOT executed now
- `car_variants` already exists for the variant level; add **generation, trim,
  engine** as new nullable columns / small child tables when ready — no restructure.
- **Self-learning dictionary:** as sellers publish, capture the model/trim they
  type against the resolved `brand_id` (mirror the candidate-attributes pattern)
  so the dictionary keeps growing from real listings.
- Extend the model set to more brands + years as the market demands.

## Run
```
pnpm --filter @workspace/db run push-force          # adds the brand columns
pnpm --filter @workspace/api-server run seed:car-brands
```
