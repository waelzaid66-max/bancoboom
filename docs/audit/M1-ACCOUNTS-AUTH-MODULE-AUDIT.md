# M1 — Accounts & Authentication · Module Audit (production)

> Master Production Recovery Program · Module 1 of 7 · repo `bancostormainvirgen` @ `3b55a0e`
> Method: evidence only. Every claim below was read from code or proven by a test run. Anything unproven is marked UNKNOWN.

## 1. Module map (STEP 1 — Architecture Discovery)
| Surface | Files |
|---|---|
| Mobile | `app/(tabs)/profile.tsx` (auth + profile) · `app/business/onboarding.tsx` · `app/business/verification.tsx` · `app/business/banks.tsx` · `components/DeleteAccountModal.tsx` · `hooks/useAuthGate.tsx` |
| API | `services/UserService.ts` · `middlewares/authGuard.ts` · `lib/permissions.ts` · `lib/roleGuards.ts` · `lib/adminBootstrap.ts` · `lib/mergeBusinessCompanyDetails.ts` · `services/CompanyService.ts` · `services/FinancingService.ts` · `services/AdminService.ts` |
| DB | `users` · `companyProfiles` · `financingIntermediaries` / `financingBranches` / `financingSeats` · `userSocialLinks` · `notificationPreferences` |

## 2. How it actually works (STEP 4 — Lifecycle)
**Provisioning.** No Clerk webhook. `getOrCreateUser(clerkId)` lazily creates the DB row on the first authenticated call. Race-safe: the mobile app fires parallel calls on first open, so the insert uses `ON CONFLICT DO NOTHING` on the unique `clerk_id` and the loser re-reads the winner's row. Only the genuine winner sends the welcome email (no double-send), fire-and-forget so an email outage can never fail account creation. Defaults: `role=individual`, `isVerified=false`.

**Auth flows (6).** `mode` (signin|signup) × `step` (form|verify|reset):
`handleSignIn` · `handleSignUp` → `handleVerify` (email OTP) · `handleForgotPassword` → `handleResetPassword` · `handleOAuth` (google | apple | **facebook**).
- Password recovery is **email-only by design** — the tenant cannot deliver SMS, and the code deliberately never offers a channel it cannot fulfil.
- Reset passes `signOutOfOtherSessions: true` (correct security posture).
- Signup stashes pending consent/phone/account-type/name in refs and clears them on failure (clean state hygiene).

**Guest gate.** `useAuthGate` is the single chokepoint converting any guest action into the sign-up funnel; if the provider is unmounted it degrades to running the action rather than crashing — safe, because the **server** is what enforces auth.

**Business onboarding.** Validates activity/name/owner/city with specific messages; documents are flattened into `companyDetails.documents[]` (the admin's review source of truth). Critically, it sends `account_type` **only for FI** and omits it for dealer/company so the server can preserve elevated roles — this matches the server-side demote guard exactly. Client and server are coherent.

**Verification.** Three states (verified / under review / none) with FI-specific copy per state, plus explicit protection against flashing a wrong status, and handled sign-in / error / retry states.

**Deletion (Play/GDPR).** Chat-media URLs are captured *before* the tombstone nulls them; one atomic transaction anonymizes the user (name→"Deleted User", email/phone/companyDetails→null, `deletedAt` set — soft delete so listing/lead references survive), wipes lead PII, deletes saved listings + behavior, blanks the user's message bodies while keeping thread structure so the counterparty's history still works, nulls conversation previews, **purges message notifications that quote the deleted user's words/name in the counterparty's inbox**, and drops push tokens. Object-storage blobs are deleted *after* the commit (best-effort, loudly logged). Clerk deletion runs **last**, and its failure raises a distinct `AUTH_PROVIDER_ERROR` — data is already durably scrubbed and the operation is retry-friendly.

## 3. Authorization model (STEP 7)
- Business `role`: individual · dealer · company · enterprise · financial_institution. Client-settable `account_type` is limited to 4 (never `enterprise`/`admin`).
- Staff role is a **separate axis**: owner · admin · moderator · support · user, with a 10-permission matrix enforced server-side by `requirePermission`.
- Guards: `requireAuth` · `requireDealerRole` · `requireAdminRole` · `requirePermission` · `optionalAuth` · `resolveDbUser` · `requireDbUser` (strict variant used on money routes).
- `roleGuards` block self-role-change, demoting/banning the last owner, and non-owners banning an owner.

## 4. Findings
| ID | Finding | Verdict |
|---|---|---|
| M1-F1 | `requireDealerRole` excludes `financial_institution` | **Not a defect.** It gates only `/v1/dealer` (the dealer console). FI is an ads + financing-inbox surface by design; an existing guard test asserts FI must not unlock dealer storefront copy. |
| M1-F2 | Staff permission matrix duplicated in `api-server` + `admin-os` with a "keep in sync" comment but **no enforcement** | **Real gap — FIXED** in `3b55a0e`. Added `permissionsMirror.test.ts` (parses both files as text; admin-os must not become an API runtime dep). Proven: in-sync passes; two simulated drifts (admin loses a permission / client gains an extra one) are both caught. |
| M1-F3 | "owner has every permission" test omitted `manage_financing` (9 of 10) | **Fixed** in the same commit. |
| M1-F4 | Auth handlers `return` silently on error | **Not a defect.** The UI renders Clerk's error state for **every** field: signup (email, password, OTP code) and signin (identifier, password, reset code, new password). Correct pattern for `@clerk/expo 3.3.1`. |
| M1-F5 | Only `errors.fields.*` is rendered — are there non-field/global errors (rate limit, network, existing session) that stay invisible? | **UNKNOWN.** The error object's shape could not be proven from the installed types, and there is no internal precedent for `.global`. No change made — resolving this needs the official Clerk 3.3.1 contract or a live trial. |
| M1-F6 | `deleteAccount` selects `deletedAt` but never reads it | **Not a defect.** Tests show the intended behaviour: no double-delete guard is needed (Clerk auth blocks a second attempt) and the path stays retry-friendly after a partial failure. Left untouched. |

## 5. Verification performed
- `permissionsMirror.test.ts` — **executed in CI**: `✓ src/lib/permissionsMirror.test.ts (5 tests)`; suite `68 passed | 1 skipped (69)`.
- CI on the change: `API tests (Postgres)` pass · `Typecheck & build` pass · `Mobile regression (static)` pass.
- Local: parser logic 12/12 checks; negative drift simulation caught both drift classes; `api-server tsc` 0 errors.
- Existing coverage relied upon: `permissions.test.ts`, `UserService.deleteAccount.test.ts` (4 cases incl. call ordering), `mergeBusinessCompanyDetails`, `adminBootstrap`.

## 6. Module verdict
**M1 is production-grade.** The accounts/auth subsystem is coherent across mobile ↔ API ↔ DB, privacy-correct on deletion, and defensively guarded on role changes. One genuine gap existed (unguarded duplicated security policy) and is now closed with a proven test. One question remains open and is recorded as UNKNOWN rather than guessed.

**Not done in M1 (deliberately out of scope, no claim made):** pixel-level UI/UX pass of the account screens (STEP 5–6) and per-surface journeys for enterprise/staff roles.
