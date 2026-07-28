# C-02 — SQL LIKE Wildcard in Upload Serve

**Date:** 2026-07-07  
**Severity:** CRITICAL  
**Status:** FIXED

## Problem

`isLegacyListingMedia()` built a LIKE pattern as `%/api/v1/uploads/objects/${wildcardPath}`. If `wildcardPath` contained `%` or `_`, PostgreSQL LIKE semantics could match unrelated listing media rows and grant public serve access.

## Solution

Escape `\`, `%`, and `_` in the user-supplied path segment and pass escape char `'\\'` to Drizzle `like()`.

## Files changed

- `artifacts/api-server/src/controllers/uploadController.ts` — `escapeLikeLiteral()` + escaped LIKE

## Verification

Manual: request serve path with `%` in segment should not match broader URLs. Automated regression via existing upload/serve tests when `DATABASE_URL` is set.
