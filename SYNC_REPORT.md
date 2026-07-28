# BANCO Replit → b-banco Sync Report

**Date:** 2026-07-04 (UTC)
**HEAD commit (this workspace):** 3e41512 (ancestors: ee7fac0, fb3f2cc)
**New full-mirror repo:** https://github.com/waelzaid66-max/b-banco
**Pushed by:** Replit Agent (via Project Task)

---

## What changed in this session

### 1. Arabic-font text inputs — COMPLETE
- New component `artifacts/banco-mobile/components/AppTextInput.tsx`
  A forwardRef drop-in for RN TextInput. When `isRTL` it maps Inter_* → Cairo_*,
  adds writingDirection "rtl" and textAlign "right" (respects existing). English
  is untouched. Fixes Arabic tofu in all typed/placeholder text.
- Applied across **23 input screens** (alias-swap Pattern A/B):
  messages, listings/create, comments, rfq/create, profile, company-edit,
  assistant, search, LocationPicker, CarPicker, CountryCodePicker, FilterSheet,
  SellerReviews, DeleteAccountModal, wallet, settings, listing/[id],
  business/suppliers, business/rfq-inbox, business/onboarding,
  business/investments/create, business/global-supply/create,
  business/global-supply/[id].

### 2. B reaction button saved state — COMPLETE
- `artifacts/banco-mobile/components/BReactionButton.tsx`
  Exported `SAVED_RED="#E8002D"`. BGlyph accepts `tint?` prop → passes expo-image
  `tintColor`. Saved state = B glyph paints solid red. Removed old savedDot View.
- `artifacts/banco-mobile/components/SmartAssetCard.tsx`
  B height bumped 22 → 30 for better tap target.

### 3. Safe-launch review — COMPLETE
- **IDOR check** on updateListing: SAFE — WHERE scopes by `listings.userId = user.id`.
- **Dealer-os price re-send**: FALSE POSITIVE — initialPrice IS set from same
  `cleanNumberString(price_raw)`. No fix needed.
- **Profile cover upload**: FALSE POSITIVE — upload+promote+persist fully wired.
  No fix needed.
- **Remaining items** (CORS allowlist env, Clerk webhook, ADMIN_EMAILS, PAYMOB
  config, dealer-os video upload, admin media moderation) are deployment config
  or feature gaps — not code bugs.

## Verification
- `pnpm --filter @workspace/banco-mobile run typecheck` → exit 0 (0 errors)
- Metro web bundle → 3531 modules, no errors
- App boots without runtime errors
- Architect code review → PASS, no severe issues

## Sync mechanics
- The workspace clone was shallow (grafted at `81a6916`) and missing an object
  needed to build a complete pack for a brand-new remote, so the first
  force-push to b-banco failed with `index-pack failed`.
- Fix: `git fetch --unshallow` from origin (B-OOM) to restore the full object
  graph, then `git push b-banco main --force` succeeded (`[new branch] main`).

## Stack reminder
- pnpm monorepo, Node 24, TypeScript 5.9
- API: Express 5 | DB: PostgreSQL + Drizzle ORM
- Mobile: Expo SDK 54 / expo-router v6 / React Native
- Auth: Clerk | Storage: Replit Object Storage
- Web: React + Vite (dealer-os, admin-os, landing)

## Artifacts in this repo
| Artifact | Description |
|---|---|
| `artifacts/api-server` | Express 5 REST API (port 5000) |
| `artifacts/banco-mobile` | Expo mobile app (iOS + Android) |
| `artifacts/dealer-os` | Dealer web dashboard (Vite/React) |
| `artifacts/admin-os` | Admin control center (Vite/React) |
| `artifacts/landing` | Landing page (Vite/React) |
| `lib/db` | Drizzle ORM schema + migrations |
| `lib/api-spec` | OpenAPI spec + Orval codegen |
| `lib/api-client-react` | Generated React hooks |
