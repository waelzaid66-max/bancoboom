---
name: Clerk multi-step sign-in (never treat status as boolean)
description: Live banco.today Clerk tenant enforces an email second factor after password; handling only status==="complete" silently locks out every real user.
---

# Clerk sign-in is a state machine, not a boolean

A custom Clerk sign-in flow must drive **every** non-`complete` status to its next
step. Handling only `status === "complete"` means a correct email+password is
verified and then silently discarded — the user can never sign in and the UI shows
nothing useful.

Statuses that must each have a branch: `needs_second_factor`,
`needs_new_password`, `needs_first_factor`, `needs_identifier`.

**Why:** the live production tenant verifies the password (`first_factor_verification:
verified`) and then returns `needs_second_factor` offering `email_code` /
`email_link`. This is enforced by the instance even though the environment payload
reports `sign_in.second_factor.required: false` and `mfa.required: false` — those
flags do **not** mean a second factor will not be demanded. Trust the live
`sign_ins` response, not the environment flags.

**How to apply:** after `signIn.password(...)`, branch on `signIn.status`. For a
second factor, pick the strategy from `signIn.supportedSecondFactors` rather than
hardcoding one — TOTP and backup codes need no dispatch, while `email_code` /
`phone_code` must be sent first. Cover TOTP/backup/phone even when the tenant
currently prefers email, or a user who enrolls an authenticator gets stranded.

## Verifying against the live tenant without reading an inbox

You cannot read the emailed OTP, but you can prove the transition end to end:
create a throwaway user via the Backend API, POST `/v1/client/sign_ins` with
`strategy=password` (keep the client cookie jar), then POST
`/v1/client/sign_ins/<id>/prepare_second_factor` with `strategy=email_code`.
A 200 plus `second_factor_verification: {object: verification_otp, strategy:
email_code}` proves the dispatch path works. Always delete the throwaway user and
re-check `/v1/users/count`.

**Gotcha:** `UID` is a **readonly** variable in bash — `UID=$(...)` silently fails
and a cleanup `DELETE /v1/users/$UID` then 404s, leaving a junk user on the
production tenant. Use any other name.

## Social providers are dashboard state, not code

The live tenant's `user_settings.social` dictionary is **empty** and
`oauth_applications` is `0`, so Google/Facebook/Apple cannot work no matter what
the app does — every tap can only throw. Enabling them requires the Clerk
Dashboard plus provider credentials from Google/Facebook/Apple, which is an owner
action. Gate the buttons on what the tenant reports (fail closed) instead of
rendering dead buttons.
