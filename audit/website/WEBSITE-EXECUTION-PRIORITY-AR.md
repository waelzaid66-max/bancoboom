# ترتيب التنفيذ — الموبايل أولاً · الويب معزول

**التاريخ:** 2026-07-10  
**قاعدة:** لا نُعلن «إنتاج كامل» قبل إغلاق **الطبقة 1**. الويب (W3 staging) **لا يوقف** ولا **يؤخر** gates الموبايل.

---

## الطبقة 1 — الموبايل + API (أولوية قصوى · أنت)

| # | المهمة | Gate | ملاحظة |
|---|--------|------|--------|
| 1 | Replit redeploy api-server | `ops:redeploy-watch` → exit 0 | `bash audit/mobile/REPLIT-SHELL-COPYPASTE.sh` |
| 2 | Wave 8 حي | `post-redeploy-verify` → exit 0 | `seller.social_links` على listing detail |
| 3 | Wave-b | `pnpm run ops:wave-b` | بعد FRESH فقط |
| 4 | Upload smoke | `CLERK_BEARER_TOKEN` + verify script | |
| 5 | EAS preview | `eas build --profile preview` | device QA |
| 6 | EAS production | بعد QA أخضر | store submit |

**مرجع:** [`release/SURFACES-DEPLOY-FINISH.md`](../../release/SURFACES-DEPLOY-FINISH.md)

---

## الطبقة 2 — dealer-os + admin-os (أنت · parallel)

| # | المهمة | URL |
|---|--------|-----|
| 1 | Banco Market artifact | `/dealer-os/` |
| 2 | Admin Control artifact | `/admin-os/` |

Kill-switch **وقت التشغيل** على الويب موجود: `WEB_PLUG_ENABLED` (Phase 6) — انظر [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md).  
تحكم أدمن عبر API (`consumer_web_enabled`) **ما زال مستقبلياً** ولا يُنفَّذ من مسار الويب وحده.

---

## الطبقة 3 — banco-web (الوكيل · معزول)

| # | المهمة | الحالة |
|---|--------|--------|
| 1 | W0–W2 code + CI | ✅ `ci-website.yml` |
| 2 | W3 map/facets UI (flags off) | ✅ كود؛ MAP/LIVE على staging لاحقاً |
| 3 | Local CI mirror | ✅ `pnpm run ops:website-ci` |
| 4 | Docker image | ✅ `ci-website-docker.yml` |
| 5 | CDN staging deploy | ⏳ OPS — pack جاهز: [`WEBSITE-PHASE7-STAGING-PACK-STATUS-AR.md`](./WEBSITE-PHASE7-STAGING-PACK-STATUS-AR.md) |
| 6 | Full-copy Phases 1–6 | ✅ على `main` — [`WEBSITE-TRANSFER-HANDOFF-AR.md`](./WEBSITE-TRANSFER-HANDOFF-AR.md) |
| 7 | Staging pack (Docker/env/smoke) | ✅ Phase 7 — `pnpm run ops:website-staging-prep` |
| 8 | Soft-launch pack | ✅ Phase 8 — `pnpm run ops:website-soft-launch-prep` · CDN ⏳ OPS |
| 9 | Market RFQ create (write MVP) | ✅ Phase 9 — [`WEBSITE-PHASE9-MARKET-RFQ-CREATE-STATUS-AR.md`](./WEBSITE-PHASE9-MARKET-RFQ-CREATE-STATUS-AR.md) |
| 10 | Offer write / RFQ detail | ⏳ موجة لاحقة بعد Phase 9 |


| 7 | Clerk workspace / journeys | ✅ ضمن Phases 2–3 على المكدس |

**قواعد صارمة للوكيل:**

- لا تعديل على `artifacts/banco-mobile` أو `artifacts/api-server` أثناء W3 staging.
- لا تغيير OpenAPI breaking.
- أي تغيير في `lib/search-contract` → يجب `test:lib` + search-contract tests.

---

## ما «مكتمل» vs ما «معلق»

| | الكود GitHub | التشغيل الحي |
|--|--------------|--------------|
| موجات 6–10C | ✅ `main` @ v1.1.4 | ⚠️ Replit wave 8 STALE |
| production-confidence | ✅ 19/19 محلي | — |
| banco-web build | ✅ | ⏳ CDN |
| EAS | ✅ profiles جاهزة | ⏳ builds |

---

## أوامر سريعة

```bash
# موبايل (أنت)
pnpm run ops:redeploy-watch
pnpm run ops:post-redeploy
pnpm run ops:wave-b

# ويب (وكيل — لا يمس الموبايل)
pnpm run ops:website-ci
BANCO_WEB_URL=https://staging.example.com node scripts/website-staging-smoke.mjs
```

---

**يُحدَّث عند:** كل sign-off على G-W2/G-W3 في [`WEBSITE-READINESS-GATES.md`](./WEBSITE-READINESS-GATES.md).
