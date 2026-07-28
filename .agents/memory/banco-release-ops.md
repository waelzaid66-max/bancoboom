---
name: Release ops — GitHub push channel + security scans
description: How to actually push to origin (broken token workarounds) and what the security scanners can/can't do on this monorepo
---

## GitHub push — the ONLY working channel
- `GITHUB_TOKEN` secret contains Arabic junk text (user pasted a chat message), NOT a PAT. Any git URL embedding it fails with `URL rejected: Malformed input to a URL function`.
- The remote URL itself got polluted once (`https://x-access-token:<arabic>@github.com/...`) — fix: `git remote set-url origin https://github.com/waelzaid66-max/-BANCO-CA-OOM-.git`.
- Anonymous `git fetch` WORKS (repo readable without creds). Push does not.
- **Push works via the `gitPush({branch})` CodeExecution callback** (git-remote skill, user's connected GitHub account), BUT it refuses while any `credential.helper` is configured (`DANGEROUS_CONFIG`). Fix first: `git config --unset-all credential.helper` (check global/system too), then `gitPush` succeeds.

**Why:** verified 2026-07-19 — fetch failed → cleaned URL → fetch OK; gitPush DANGEROUS_CONFIG → unset helper → "Pushed to main on github".

**How to apply:** any future push: clean remote URL, unset credential helpers, use gitPush callback. Never embed the secret in URLs.

## Security scanners on this monorepo
- `runDependencyAudit()` → works (0 vulns across all severities on 2026-07-19).
- `runHoundDogScan()` → works (0 findings).
- `runSastScan()` → returns `{incomplete: true, results: []}` consistently (repo too large). Do NOT report SAST as "clean" — report it as incomplete and lean on dep audit + HoundDog + the app's own security posture (CORS allowlist, CSRF guard, FI authz tests, publicVisibilityConditions).

## Release naming (owner decision 2026-07-20)
- The global release tag name is **`B.4`** — chosen by the owner, superseding Claude's `v1.5.0-global` proposal. Tag is to be created + pushed only after Claude confirms his review of the tested main. Don't rename or "normalize" it to semver.
