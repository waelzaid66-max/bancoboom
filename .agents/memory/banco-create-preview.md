---
name: BANCO mobile create-listing preview & taxonomy
description: How the seller create wizard previews listings client-side and the rules its taxonomy module must obey
---

# Create-listing live preview mirrors TWO different server formatters

The mobile seller create wizard renders a live SmartAssetCard preview before
publish. The published buyer card always uses real BFF strings; the preview
reproduces them client-side **only** as an honest echo (no financial math — it
echoes the seller's own cash price and their lowest entered installment monthly).

**Why this is a trap:** the price and the installment badge use *different*
server formatters, so the preview must reproduce both:
- `price_display` ← BffService.formatEGP → millions at **2 dp** (`.replace(/\.00$/,"")`), K = `Math.round(n/1000).toLocaleString("en-EG")`.
- `installment_badge` ← PaymentService.formatEGP → millions at **1 dp**, K = `Math.round(n/1000)` **plain** (no locale separators). Badge text = `Starts from ${...}/month`.

**How to apply:** if either server formatter changes, `constants/listingPreview.ts`
drifts silently (no typecheck/test will catch it). Keep them in lockstep.
- `trust_signal` mirrors BffService.buildTrustSignal **minus** the "Top Dealer"
  tier (needs a server quality_score the client can't see) — verified+dealer →
  Verified Dealer, verified+company → Verified Company, verified → Verified
  Seller, else Private Seller.
- `smart_badge` is ONLY "Easy Installment" when installments exist; server-only
  feed signals (urgency_signal, best_offer_badge, is_sponsored, has_video) are
  intentionally null/false in the preview, never fabricated.

# Taxonomy module rules

`constants/listingCreateTaxonomy.ts` must stay PURE (no React/RN imports) — it
was caught importing `@expo/vector-icons` just for icon typing; use the local
`FeatherIconName` string union instead and let the screen own `<Feather>`.

`REQUIRED_SPEC_KEYS` is the single source of truth for required spec keys per UI
category; `requiredSpecFieldsFor` is derived from it (intersection with
SPEC_FIELDS_BY_UI). Canonical keys handled by dedicated pickers — `industrial_type`
(industrial picker / auto "raw_material" for raw_materials) and car brand/model
(CarPicker) — are listed in REQUIRED_SPEC_KEYS for contract fidelity but
validated separately by the screen, so they're excluded from the derived set.

"Raw Materials" is a 4th **UI-only** seller category: submit/preview map it to
category=industrial + specs.industrial_type="raw_material" (the API category enum
is only car|real_estate|industrial).

# Create-listing media & section fields

**Video = TRIM not reject.** Expo Go has no ffmpeg/trim lib, only expo-image-picker.
The trim path is the OS-native editor: a dedicated single-select "Add video"
affordance calls launchImageLibraryAsync({mediaTypes:["videos"], allowsEditing:true,
videoMaxDuration:MAX_VIDEO_SECONDS}). allowsEditing CANNOT combine with
allowsMultipleSelection — that's *why* video has its own button separate from the
multi-image picker (which is mediaTypes:["images"] only). partitionPickedAssets
still guards the result. Caps live in lib/listingMedia (MIN_PHOTOS=2, MAX_PHOTOS=15,
MAX_VIDEOS=2, MAX_MEDIA, MAX_VIDEO_SECONDS=20).

**Car "import" field** = real engine dimension `logistics.origin_type`
(local|imported) on CreateListingBody — NOT a spec. Optional chip row in the car
details block; written as `body.logistics = { origin_type }` only when set.
**Why:** origin_type is the same dimension the feed/search expose, so it's honest
backing; specs.* would not surface in those engines.

**Real-estate "rent" was intentionally SKIPPED** — no feed/search engine dimension
backs a rent-vs-sale toggle, so adding it would fabricate a filter that goes
nowhere. ownership/property type/installment are already covered. Don't add rent
until the BFF/search side supports it.

# Request mode ("عايز تشتري"/isRequest) gates media in TWO places

Making request mode "lighter" (photos optional) requires patching BOTH the
step-level `validateStep` (skip the media step) AND the final `handleSubmit`
thumbnail guard (`firstImageIdx === -1` → it hard-returns errMinPhotos). Skipping
only the step validation is NOT enough — the submit guard still blocks publish.
Gate that guard on `!isRequest`. Keep optional attached photos working: don't
force `media: []`; the empty-photos case already yields `media: []` naturally and
the backend schema makes media optional when `is_request`.
