# قائمة تحقق Staging — banco-web (بعد دمج المكدس)

**متى:** بعد دمج Phases 1–6 إلى `main` (أو نشر من رأس المكدس).  
**عزل:** خدمة `consumer-web` فقط — لا توقّف API ولا EAS.  
**Phase 7:** [`WEBSITE-PHASE7-STAGING-PACK-STATUS-AR.md`](./WEBSITE-PHASE7-STAGING-PACK-STATUS-AR.md)

---

## 0. Prep ثابت (قبل البناء)

```bash
pnpm run ops:website-staging-prep
# أو: node scripts/website-staging-prep-audit.mjs
```

---

## 1. بناء ونشر

```bash
cp deploy/aws/env/.env.banco-web.staging.example \
   deploy/aws/env/.env.banco-web.staging.local
# عبّئ SITE_URL / API_URL / Clerk — أبقِ LIVE/MAP/MARKET=false لأول smoke

# صورة معزولة
docker compose -f deploy/aws/docker-compose.banco-web.yml \
  --env-file deploy/aws/env/.env.banco-web.staging.local \
  up -d --build
```

أو مساركم على Cloud Run / ALB وفق `deploy/aws/Dockerfile.banco-web`.

---

## 2. متغيرات بيئة staging (حد أدنى)

| متغير | ملاحظة |
|--------|--------|
| `NEXT_PUBLIC_SITE_URL` | أصل الويب staging |
| `NEXT_PUBLIC_API_URL` | API staging (ليس إنتاجاً إن أمكن) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | مطلوب لـ `/workspace` و `/saved` |
| `WEB_PLUG_ENABLED=true` | الموقع موصول |
| `NEXT_PUBLIC_WEB_SEARCH_LIVE` | ابدأ `false` ثم فعّل بعد smoke |
| `NEXT_PUBLIC_WEB_MARKET_COPY` | `true` لتجربة ماركت داخل الويب |
| `NEXT_PUBLIC_MARKET_URL` | رابط كلاسيكي كـ fallback |

قالب: `artifacts/banco-web/.env.staging.example` + `deploy/aws/env/.env.banco-web.staging.example`.

---

## 3. Smoke بعد النشر

```bash
BANCO_WEB_URL=https://staging-web.example.com \
  BANCO_WEB_EXPECT_PLUG=on \
  pnpm run ops:website-staging-smoke

# صحة الفيشة
curl -sS "$BANCO_WEB_URL/api/health"
# {"status":"ok","surface":"banco-web","plug":"on",...}
```

اختياري مع إعلان حقيقي:

```bash
BANCO_LISTING_SMOKE_ID=<uuid> BANCO_WEB_URL=... node scripts/website-staging-smoke.mjs
```

---

## 4. رحلات يدوية سريعة

- [ ] `/` و `/en` — هيرو BANCO + CTA بحث  
- [ ] `/search` — قائمة (LIVE off أو on حسب العلم)  
- [ ] `/workspace` — تحويل/دخول Clerk  
- [ ] `/workspace/b2b` — ماركت كوبي إن العلم on  
- [ ] موبايل على نفس API — بدون انحدار  

---

## 5. اختبار فصل الفيشة (دقيقة)

```bash
WEB_PLUG_ENABLED=false  # restart consumer-web فقط
curl -sS "$BANCO_WEB_URL/api/health"   # plug: off
curl -sSI "$BANCO_WEB_URL/" | grep -i x-banco-web-plug
# أعد true بعدها
```

التفاصيل: [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md).

---

## 6. إشارات حمراء — لا تفعل

- لا تعطّل API لإصلاح ويب  
- لا تدمج OpenAPI breaking من مسار الويب  
- لا تفعّل `WEB_SEARCH_LIVE=true` على إنتاج قبل استقرار staging  
