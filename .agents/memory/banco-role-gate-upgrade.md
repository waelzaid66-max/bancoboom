---
name: Dealer/Admin role gate must offer an in-app upgrade path
description: Why a bare role gate on a self-signup surface permanently locks out new users, and the rule that prevents it.
---

# Gated self-signup surfaces need an in-app role upgrade, never a dead end

Any surface that lets users self-sign-up but then gates on role (e.g. dealer-os
RoleGuard allows only dealer/company/enterprise) MUST provide an in-app path to
obtain the required role. A bare "Access Restricted" message is a permanent
lockout.

**Why:** new accounts default to role `individual` (server-side default in
UserService). dealer-os/admin-os sign-up does NOT mint a seller role, so a fresh
signer-in lands as `individual` and, without an upgrade path, can never reach the
app — a dead end that reads as "the product is broken."

**How to apply:**
- The upgrade is server-authoritative: PATCH /me with `account_type`
  (`dealer`|`company`) + a `business` object promotes the role. The client cannot
  self-grant `enterprise`/`admin` — keep it that way.
- After a successful upgrade, await `invalidateQueries(getGetMeQueryKey())` so the
  guard re-evaluates with the fresh role. Do NOT drive the submit spinner off
  `isSuccess` alone — if the refetch fails or the role still isn't allowed you get
  a permanent spinner (a new dead end). Use `mutateAsync` + awaited invalidation,
  then surface a retry error if still locked.
- `/me` failing to load entirely should show a retry screen, not a lockout; the
  guard must still fail **closed** (grant access only when /me returns an allowed
  role).
- Open product question: if `company` carries materially more privilege than
  `dealer`, constrain self-selection server-side (currently UpdateMeSchema accepts
  both for self-update).

## admin-os is the intentional exception — its gate is SUPPOSED to be a dead-end

Unlike dealer-os, admin-os' AdminGuard gates on `me.is_admin` and there is NO
in-app upgrade path, by design. Admin cannot be self-granted; admins are
provisioned out-of-band by flipping `users.is_admin` in the DB. So a fresh
signer-in correctly landing on "Access Restricted" in admin-os is CORRECT, not a
bug — do not "fix" it by adding a self-upgrade to admin.

**Testing the admin gate (e2e/Clerk):** the only reliable recipe is provision →
grant → hard reload. (1) sign in via `[Clerk Auth]`; (2) `[Browser]` navigate so
GET /me runs and lazily provisions the user row (expect Access Restricted here);
(3) `[DB] UPDATE users SET is_admin=true WHERE email=...`; (4) do a FULL hard
browser reload of the target page — an in-app SPA navigation reuses the cached
/me and stays denied; only a fresh document mount refetches /me with the new role.
