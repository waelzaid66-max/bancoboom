---
name: BANCO Expo Go environment contract
description: Required environment rules for a working BANCO Mobile Expo Go development bundle on Replit.
---

# Rule

The Expo development command must preserve
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from Replit's shared environment and must
give physical clients an explicit API base URL on the API workflow's public
port (`:8080`). It must never assign that public key from a production-only
`CLERK_PUBLISHABLE_KEY` variable.

**Why:** Shell assignment in a workflow can replace a valid shared public
value with an empty production-only value. Metro then produces a real,
reachable bundle that crashes at runtime with Clerk's misleading "Missing
publishableKey" error. A physical device also cannot use the web app's
same-origin `/api` route; it needs the separately exposed API service.

**How to apply:** Keep the mobile dev startup as a fail-fast script: validate
the public Clerk key before Metro starts, set the public API URL to the
development-domain API port, and clear/restart Metro after changing
environment-related startup code. During Expo Go, guard push-notification
module loading because remote-push APIs are unavailable there; native builds
retain those capabilities.