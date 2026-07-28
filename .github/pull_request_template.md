## Summary

<!-- What changed and why (consumer web / landing / search-contract) -->

## Website ↔ Mobile independence

Reference: [`audit/website/WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md`](audit/website/WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md)

- [ ] No imports from `artifacts/banco-mobile/**`
- [ ] No changes to mobile `app.json` / `eas.json` unless explicitly scoped
- [ ] Website env uses `NEXT_PUBLIC_*` / `VITE_*` only (never `EXPO_PUBLIC_*`)
- [ ] `node scripts/verify-website-boundaries.mjs` passes locally
- [ ] `node scripts/website-rewrite-config-audit.mjs` passes locally
- [ ] `pnpm --filter @workspace/search-contract run test` passes
- [ ] Mobile smoke (if CI website ran): `test:lib` passes with **zero** mobile file changes

## Deploy / flags

- [ ] `NEXT_PUBLIC_WEB_SEARCH_LIVE` remains **false** in `.env.example` unless staging-only
- [ ] `NEXT_PUBLIC_WEB_SEARCH_MAP` remains **false** in `.env.example` unless staging-only
- [ ] Staging overrides documented in `.env.staging.example` when relevant

## Test plan

- [ ] `node scripts/website-ci-local.mjs` (or equivalent CI steps) passes
- [ ] Optional: `BANCO_WEB_URL=... node scripts/website-staging-smoke.mjs`
