# C-01 — Upload IDOR Fix

**Date:** 2026-07-07  
**Severity:** CRITICAL  
**Status:** FIXED

## Problem

Any authenticated user could call `POST /v1/uploads/promote` (or attach media on listing/chat/company) with another user's first-party upload URL. Objects without ACL metadata were silently promoted under the attacker's Clerk ID.

## Root cause

1. Presigned URLs were not bound to the requesting user.
2. `promoteServingUrlToPublic` returned silently when ACL owner mismatched (no error to caller).

## Solution

1. **`upload_claims` table** — records `(object_path, clerk_id, expires_at)` when `request-url` is called (15 min TTL, matches presign).
2. **`assertCallerMayUseUpload()`** — required before verify, promote, listing media attach, chat media, company logos.
3. **`UploadOwnershipError`** — thrown on ACL owner mismatch; HTTP 403 from upload routes.
4. **Claim consumption** — row deleted after successful promote.

## Files changed

- `lib/db/src/schema/index.ts` — `upload_claims` table
- `artifacts/api-server/src/lib/uploadClaims.ts` (new)
- `artifacts/api-server/src/lib/uploadClaims.test.ts` (new)
- `artifacts/api-server/src/lib/objectStorage.ts` — `UploadOwnershipError`, `getAclOwnerForServingUrl`
- `artifacts/api-server/src/lib/objectStorage.s3.ts` — same
- `artifacts/api-server/src/lib/objectStorageProvider.ts` — interface
- `artifacts/api-server/src/controllers/uploadController.ts`
- `artifacts/api-server/src/services/ListingService.ts`
- `artifacts/api-server/src/services/ConversationService.ts`
- `artifacts/api-server/src/services/CompanyService.ts`

## Deploy note

Run `pnpm --filter @workspace/db drizzle-kit push` (or your migration path) to create `upload_claims`.

## Verification

```bash
pnpm --filter @workspace/api-server test uploadClaims
pnpm --filter @workspace/api-server test objectStorage.s3
```
