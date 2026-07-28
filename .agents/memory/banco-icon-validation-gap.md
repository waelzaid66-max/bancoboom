---
name: BANCO mobile CI test chain coverage
description: what the banco-mobile `test` chain runs in CI and how guard-test gaps get closed
---
- The mobile `test` chain = icons · lib-hardening · resilience · universal-links · session-restore · section-guard · i18n (7 suites, ~88 tests). `test:icons` was ALWAYS chained — an earlier note here claimed it wasn't; Claude disproved that with the package.json evidence. The real gap was `i18n-usage.test.mjs`, wired into the chain July 2026.
- Unmapped icon names still render a CircleAlert "dot" + dev warning; the icons guard now provably runs in CI.

**Why:** an audit test only protects the app if the `test` script CI executes actually includes it — an unchained guard is silent decoration.

**How to apply:** when adding any guard test, add its `test:<name>` script AND append it to the `test` chain in the same commit; verify by running the full chain, not the file alone.
