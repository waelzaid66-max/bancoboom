---
name: BANCO signup pending-intent refs
description: Why post-signup "pending intent" refs must be cleared on every abandonment path in the mobile auth screen
---

# Signup pending-intent refs must clear on ALL abandonment paths

The mobile profile/auth screen stashes signup intent in refs (consent flag, phone
to persist, business-routing flag) BEFORE the async `signUp.password()` call,
then a `[user]` effect consumes them once the account becomes active.

**Rule:** every path that abandons an in-flight signup must reset those refs —
not just the password-error path. That includes switching auth mode
(sign-up ⇄ sign-in) and going back from the verify step.

**Why:** if a draft business signup is abandoned at the verify step and the user
then signs into an EXISTING account, the post-active effect fires for that
returning account and wrongly: rewrites consent timestamp, overwrites their phone
via PATCH /me with the stale draft value, and routes them into
`/business/onboarding`. The effect's "only for accounts created this session"
guard is a ref, so a stale ref defeats it.

**How to apply:** when adding any new way to leave the signup flow, clear all
pending-intent refs there too. State setters alone are not enough — refs persist
across renders and across a mode switch.
