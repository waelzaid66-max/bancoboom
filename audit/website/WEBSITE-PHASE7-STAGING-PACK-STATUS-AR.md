# Phase 7 — حزمة Staging (W9) — حالة

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase7-staging-pack-4322`  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)

---

## الهدف

إغلاق فجوة «الكود على main لكن النشر غير جاهز» دون لمس موبايل/API:  
Docker/env/smoke جاهزون لـ OPS ليشير دومين staging إلى `consumer-web`.

---

## ما تغيّر

| بند | تفصيل |
|-----|--------|
| Dockerfile | `NEXT_PUBLIC_WEB_MARKET_COPY` + روابط Market/Admin/App |
| Compose | يمرّر `WEB_MARKET_COPY` وقت البناء |
| Env templates | AWS first-smoke: LIVE/MAP/MARKET=`false` · `banco-web/.env.staging.example`: LIVE=`true` (Phase 2) |
| Prep audit | `scripts/website-staging-prep-audit.mjs` + `pnpm run ops:website-staging-prep` |
| Smoke | `/maintenance`، `BANCO_WEB_EXPECT_PLUG`، إشارة براند على الهوم |
| CI محلي | خطوة staging prep داخل `ops:website-ci` |

---

## أوامر OPS

```bash
# 1) تحقق ثابت قبل البناء
pnpm run ops:website-staging-prep

# 2) بناء/تشغيل معزول
cp deploy/aws/env/.env.banco-web.staging.example \
   deploy/aws/env/.env.banco-web.staging.local
# حرّر SITE_URL / API_URL / Clerk ثم:
docker compose -f deploy/aws/docker-compose.banco-web.yml \
  --env-file deploy/aws/env/.env.banco-web.staging.local \
  up -d --build

# 3) Smoke حي
BANCO_WEB_URL=https://staging-web.example.com \
  pnpm run ops:website-staging-smoke
```

قائمة يدوية: [`WEBSITE-STAGING-OPS-CHECKLIST-AR.md`](./WEBSITE-STAGING-OPS-CHECKLIST-AR.md).  
نقل: [`WEBSITE-TRANSFER-HANDOFF-AR.md`](./WEBSITE-TRANSFER-HANDOFF-AR.md).

---

## تعريف الإنجاز

| معيار | حالة |
|-------|------|
| Docker يخبز Market copy flag | ✅ |
| Env افتراضي آمن | ✅ |
| Prep audit PASS | ✅ (محلي) |
| CDN/دومين حي | ⏳ OPS (أنت) |
| Clerk keys على staging | ⏳ OPS (أنت) |

---

## خارج النطاق

- نشر CDN فعلي (يحتاج أسرار/حساب سحابة)  
- تفعيل LIVE على إنتاج  
- `consumer_web_enabled` عبر admin API  
