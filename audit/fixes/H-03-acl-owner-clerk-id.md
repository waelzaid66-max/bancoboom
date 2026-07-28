# H-03 — ACL Owner ID Inconsistency (Clerk vs DB UUID)

**Date:** 2026-07-07  
**Severity:** HIGH  
**Status:** FIXED

## Problem

Object ACL `owner` must be the Clerk user ID (`req.userId`), consistent with `authGuard` and `canAccessObject`. `CompanyService` and `ConversationService` passed internal DB `users.id` to `promoteServingUrlToPublic`, breaking owner checks and public serve for company/chat media.

## Solution

- `upsertMyCompanyProfile` — promote with `clerkId` parameter.
- `sendMessage` — promote with `clerkId` (was `userId` DB uuid).

## Files changed

- `artifacts/api-server/src/services/CompanyService.ts`
- `artifacts/api-server/src/services/ConversationService.ts`

## Verification

Company logo/cover and chat image uploads after promote should be publicly servable without auth when ACL is public.
