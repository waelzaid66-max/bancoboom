---
name: BANCO auth tenant limits
description: What the Clerk tenant actually supports and how to handle review requests for unsupported auth features without faking them.
---

# BANCO auth — tenant capabilities & honest reconciliation

The Clerk tenant for BANCO supports ONLY: email + password, email OTP,
change password, session management (list/revoke), and account deletion.

**PRODUCTION instance (clerk.banco.today, pk_live) has NO social providers AT ALL**
(verified live 2026-07-21: `/v1/environment` with Origin banco.today → `social` dict
EMPTY; identification_strategies = ["email_address"] only; email verifications =
["email_code"]; sign_up mode public). A real `POST /v1/client/sign_ins` probe returns
422 form_identifier_not_found = email pipeline WORKS end-to-end. **Google AND Apple
buttons in the app are dead paths on production** — Clerk production instances do NOT
inherit dev's shared OAuth creds; the owner must configure each provider in the Clerk
Dashboard (Google: GCP OAuth client ID/secret; Apple: Developer account + Services ID
+ key). This is dashboard-side config, NOT app code — buttons start working with zero
code changes once enabled. An earlier check that showed `{oauth_google: true}` was the
DEV instance; never extrapolate dev social state to prod.

**Facebook (updated 2026-07-26 — owner decision + real implementation).** The owner
enabled Facebook on the Meta/Clerk side and asked for it, so it is now wired the same
way Google and Apple are: a genuine `oauth_facebook` Clerk SSO strategy in
`profile.tsx` (commit `6778e65`), NOT a stub and NOT fake UX. It therefore sits in the
exact same class as Google/Apple — **dashboard-gated, dead until the provider is
configured on the production instance, and working with zero code changes once it is.**
The prior "never add Facebook" note referred to faking a provider the tenant did not
have; that rule still stands for stubs, and is satisfied here because the strategy is
real. Before any store submission, confirm the provider is actually enabled on
`pk_live` — shipping a visible button that always errors is a review risk.

NOT supported (and must NOT be faked anywhere — UI, copy, or stubs):
- LinkedIn login
- Phone number as a login method
- Standalone authenticator-app / SMS 2FA (sign-in is already protected by email OTP)
- OTP email branding (that is a Clerk *dashboard* config, not app code)

**Turnstile bot-protection is ON for sign-up** (`user_settings.sign_up.captcha_enabled=true`,
provider=turnstile, widget=smart). The app is wired for it: `<View nativeID="clerk-captcha" />`
renders in signup mode. Consequence for testing: any HEADLESS/curl sign-up will
always 400 with "failed security validations" — that is EXPECTED (no browser to solve
the challenge), NOT a defect. Real-device sign-up (Expo Go webview) is the only way to
confirm the widget actually solves; if it fails there, it's a Clerk-dashboard toggle
(account-level), not app code.

**Rule:** When a reviewer or task asks to "add LinkedIn/phone login" or
"add 2FA", do NOT implement or fake them. Reconcile honestly: surface the *real*
available sign-in methods (email & password, plus Google / Apple / Facebook — each only
once enabled on the instance) and frame unavailable
features as unavailable (e.g. settings "Sign-in methods" + "Two-step verification"
info rows state what is and isn't available).

**Why:** Project rule forbids fabricated auth methods/verification; a full-task code
review once rejected the work for "missing FB/LinkedIn/phone login" — the correct
response was honest disclosure, not building tenant-impossible features.

**How to apply:** Identity/account surfaces (profile auth sheet, settings security
center) should describe the supported methods and gate password UI on
`user.passwordEnabled` (SSO-only accounts have no password to change). Anti-fraud
messaging is surfaced as bilingual copy, not enforced client-side.
