# BANCO — Production Full Snapshot v1.1.5 (صادق · كامل)

**Generated:** 2026-07-11T07:05+03:00  
**Primary repo:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-  
**AWS repo:** https://github.com/waelzaid66-max/aws-virgen  
**Tag:** `v1.1.5-production-2026-07-11` → commit `1882523`  
**Branch HEAD:** `a78fd41` (docs after tag)

---

## 1) Executive verdict

| Layer | Verdict | Evidence (2026-07-11 scan) |
|-------|---------|----------------------------|
| **Code + local gates** | ✅ **GO** | confidence **19/19** · website CI **9/9** · typecheck **PASS** · core build **PASS** · lint **PASS** |
| **API unit (no Postgres)** | ✅ **GO** | **15/15** vitest |
| **API integration (local)** | ⚠️ **SKIP** | Docker غير متاح على الجهاز — CI يغطيه |
| **ops:full-verify** | ✅ **GO** | 17/17 + 57/57 + 44/44 |
| **pre-redeploy code gate** | ✅ **GO** | 11 checks incl. bio + social_links |
| **Live Replit API** | ❌ **PARTIAL** | wave 6 FRESH · wave 8+bio **STALE** |
| **aws-virgen sync** | ⏳ **OPEN** | token required |
| **EAS / Store** | ⏳ **OPEN** | after live FRESH |

**Honest summary:** كل ما يُختبر محلياً **PASS**. الإنتاج الحي على Replit **لم يُحدَّث** — redeploy blocking.

---

## 2) Automated gates (this scan)

| Script | Result |
|--------|--------|
| `pnpm run confidence` | **19/19** |
| `pnpm run typecheck` | **PASS** |
| `node scripts/website-ci-local.mjs` | **9/9** |
| `pnpm run test:api:unit` | **15/15** |
| `pnpm run lint` | **PASS** |
| core build (api, admin, dealer) | **PASS** |
| `pnpm run ops:full-verify` | **PASS** |
| `pnpm run ops:post-redeploy` | **exit 1** (wave 8 STALE live) |

---

## 3) What ships in v1.1.5

### From `bcd442e` (browse journeys)
- Web section icons, hub parity, search facets/map, listing contact deep-links
- Mobile listing_mode chips, seller social UI
- search-contract facet extensions (+44 tests)

### From `1882523` (production hardening)
- Lazy DB pool init (`lib/db`)
- PATCH `/v1/me`: bio, display_title, category_label + Clerk metadata sync
- SearchService industrial_type typing
- vitest commodity filter tests
- `docker-compose.test.yml` + `scripts/run-api-tests-local.mjs`
- `FULL-DEPLOY-TASK-MATRIX-2026-07-11-AR.md`

### This scan (`a78fd41+`)
- Extended live probes: `probe-wave9-seller-bio.mjs`
- post-redeploy checks wave 6 → 8 → bio
- pre-redeploy gate: bio + PATCH /v1/me validators
- eslint fix in run-api-tests-local.mjs

---

## 4) Live API truth (Replit)

Host: `https://banco-ca-oom.replit.app`

| Probe | Status |
|-------|--------|
| ISO market_country reject | ✅ 400 |
| map `is_bookable` / `price_display` | ✅ |
| `seller.social_links` | ❌ missing |
| `seller.bio` / `display_title` | ❌ not reached (blocked at wave 8) |

**Fix:** `bash audit/mobile/REPLIT-SHELL-COPYPASTE.sh` → restart api-server → `pnpm run ops:post-redeploy` exit 0.

---

## 5) Repos (official pair only)

| Remote | Repo | Agent may push? |
|--------|------|-----------------|
| `origin` | -BANCO-CA-OOM- | ✅ yes |
| aws-virgen sync | aws-virgen | ✅ via script/workflow only |
| `boom`, `bbanco`, `bdeals` | mirrors | ❌ unless operator explicitly asks |

**Workspace scope:** `C:\Users\waelz\Downloads\BANCO-CA-OOM` — `main` here is the only source of truth.

---

## 6) Remaining for full production

1. Replit redeploy (blocking)
2. aws-virgen sync
3. AWS infra deploy (optional path)
4. CLERK_BEARER_TOKEN upload smoke
5. EAS preview + Device QA
6. banco-web CDN + `NEXT_PUBLIC_WEB_SEARCH_LIVE=true`

---

## 7) Reference files

- `audit/production-readiness/FULL-DEPLOY-TASK-MATRIX-2026-07-11-AR.md`
- `DUAL_REPO_STATUS.md`
- `audit/mobile/NEXT-OPS-REPLIT-REDEPLOY.md`
- `deploy/aws/reports/06-READINESS_CHECKLIST_GONOGO.md`
