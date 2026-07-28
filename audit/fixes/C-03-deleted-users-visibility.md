# C-03 — Deleted Users Visible in Marketplace

**Date:** 2026-07-07  
**Severity:** CRITICAL  
**Status:** FIXED

## Problem

`publicVisibilityConditions()` filtered flagged listings and shadow-banned sellers but not soft-deleted users (`users.deleted_at`). Deleted sellers' listings could still appear in feed, search, and legacy upload serve checks.

## Solution

Added `users.deletedAt IS NULL` to `publicVisibilityConditions()`.

## Files changed

- `artifacts/api-server/src/lib/feedVisibility.ts`
- `artifacts/api-server/src/lib/feedVisibility.test.ts` — new test case

## Verification

```bash
pnpm --filter @workspace/api-server test feedVisibility
```
