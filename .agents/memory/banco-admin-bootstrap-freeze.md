---
name: BANCO admin bootstrap freeze
description: ADMIN_EMAILS is a one-shot first-admin bootstrap that freezes once any admin exists; how to add admins after launch
---

# ADMIN_EMAILS is a ONE-SHOT first-admin bootstrap

**Rule:** The email allowlist auto-promotes a user to admin ONLY while no admin
exists yet. Once any admin exists, the allowlist is FROZEN — no further
auto-promotion, even for other listed emails. It never demotes; existing admins
are untouched.

**Why:** The allowlist is read live on every `/me`, so without the freeze anyone
who can edit the env (or a leaked/mistyped value) could silently mint new admins
in production at any time. Freezing turns the env into a bootstrap seam, not a
standing grant.

**How to apply:**
- If multiple emails are listed, only the FIRST to sign in is promoted; the
  others not auto-promoting later is the freeze working, not a bug.
- There is currently NO in-app admin-granting UI (admin-os Users does ban/unban
  only). To add a later admin, set the DB flag or build an admin-management
  surface.
- Keep the freeze decision a PURE function and unit-test it that way. Do NOT add
  a DB "an admin exists" assertion to tests — the api-server test DB is the
  SHARED PROD DB and already has admins (see api-server-testing.md).
- Bootstrap check-then-update is not atomic; on a truly fresh DB two concurrent
  first logins could both promote. Benign (only trusted allowlisted emails), but
  wrap in an advisory lock if you ever need a strict single first admin.
