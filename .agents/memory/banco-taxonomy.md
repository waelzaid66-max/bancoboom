---
name: BANCO Taxonomy Normalization
description: Governed-taxonomy + normalization/validation pipeline rules for listings (api-server) — strict control policy, dedup approach, alias-keying & seed-idempotency gotchas
---

# BANCO Taxonomy & Normalization (api-server)

Free-text listing fields are resolved to governed master data (brands/models/carVariants/locations + controlled enums) by `NormalizationService.normalizeListing`. Trust score feeds RANKING ONLY — it must never be added to the immutable 11-field FeedItem output contract.

## Controlled fields must be strictly enforced, not best-effort
**Rule:** When a controlled field (brand, model, location, and every enum: fuel/condition/transmission/body_type/property_type/finishing/ownership/industrial_type/industry) is PROVIDED but cannot be resolved to a valid taxonomy value (even after text inference), strict mode rejects (`code:"INVALID_DATA"`) and lenient mode (bulk/seed) records a warning. Resolved values overwrite the raw spec so nothing persists as free text.
**Why:** The objective is "no free text." If only brand/model/property_type are enforced, invalid fuel/condition/location/industrial values slip through as free text with their taxonomy columns left null — which violates the requirement.
**How to apply:** Reject only when a value was provided AND neither coercion nor title inference yields a valid value (if inference resolves a valid value, accept and canonicalize). Location is required-resolvable in strict mode — unmatched area aborts the create.

## Duplicate detection uses pg_trgm, with same-model+year as an independent signal
**Rule:** `detectDuplicate` scopes to same seller + category + ±5% price band, then flags when in-DB trigram `similarity(title)` ≥ 0.7 OR (same modelId AND same year). Do NOT prefilter candidates on `similarity > X` in SQL — that makes the model+year branch unreachable for reworded relistings.
**Why:** Duplicate detection must combine trigram title matching with an explicit same-model-and-year criterion; a reworded relisting of the identical car has low title similarity but must still be caught. Same-seller + same-model + same-year + near-identical price is a strong duplicate signal without over-flagging distinct-year units.
**Dependency:** requires the `pg_trgm` Postgres extension (`CREATE EXTENSION IF NOT EXISTS pg_trgm`). Without it, `similarity()` errors at runtime. `year` is read from `listing_attributes.specs->>'year'` (JSON), not a column.

## Alias maps key on the model's OWN name-slug, NOT the stored DB slug
**Rule:** Model alias autocorrect must look up `MODEL_ALIASES[slugify(model.name)]` (e.g. `c-class`), because stored `models.slug` is brand-prefixed (`mercedes-benz-c-class`).
**Why:** Keying by the brand-prefixed stored slug silently returns `undefined`, so aliases like `c200`→C-Class never apply and strict mode falsely rejects valid provided models. BRAND_ALIASES is safe because a brand slug = `slugify(name)` with no prefix.
**How to apply:** For any prefixed-slug table, key alias maps by the canonical short value and derive it with `slugify(entity.name)` at candidate-build time.

## Taxonomy master-data needs slug UNIQUE for idempotent seeding
**Rule:** Every taxonomy table whose seed uses `.onConflictDoNothing()` on slug MUST have a UNIQUE constraint on that slug, AND the seed must fetch the existing row id on conflict (so child rows like variants still backfill on reruns).
**Why:** `onConflictDoNothing` only no-ops against a real constraint; without one, reruns insert duplicates. And if a parent insert no-ops without re-fetching its id, child inserts are skipped on reruns/extensions.
**How to apply:** drizzle-kit `push` prompts interactively (fails in non-TTY) when adding a unique constraint to a populated table. If no duplicates exist, apply `ALTER TABLE ... ADD CONSTRAINT <t>_slug_unique UNIQUE (slug)` via SQL, then `push` reports "No changes detected". Never `push --force` for this — it truncates.

## lib/db is a composite TS project — rebuild after schema edits
**Rule:** After editing `lib/db/src/schema`, run `pnpm exec tsc -b lib/db --force` before typechecking api-server.
**Why:** api-server resolves lib/db via TS project references against `lib/db/dist/*.d.ts` (+ `tsconfig.tsbuildinfo`); without a rebuild, new exports/columns appear missing even though source is correct.

## Taxonomy FK ids must be persisted in EVERY write path, not just create
**Rule:** `listingAttributes` carries both controlled enum columns AND nullable FK id columns (propertyTypeId/finishingTypeId/ownershipTypeId/industrialTypeId/industryId + brandId/modelId/variantId). Every path that writes attributes must persist the `normalized.taxonomy.*Id` ids alongside the enum values: `ListingService.createListing`, `ListingService.updateListing`, `BulkImportService` insert, and `seed.ts` re-normalization link update.
**Why:** It's easy to persist FK ids in createListing yet miss the bulk-import insert and seed-link update, which then write only enum values — leaving FK ids null and drifting from the enums. The enum value === reference-table slug, so FK lookup is `vocabMap[enumValue]`.
**How to apply:** When adding a new controlled taxonomy dimension, add (a) reference table with UNIQUE slug + name/nameAr/sortOrder, (b) nullable FK col, (c) seed the vocab idempotently, (d) populate the id in NormalizationService, and (e) persist it in ALL FOUR write paths. Backfill existing rows with `UPDATE ... FROM <ref> WHERE enum::text = slug AND fk_id IS NULL`.
