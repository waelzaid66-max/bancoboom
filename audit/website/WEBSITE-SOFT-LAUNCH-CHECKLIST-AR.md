# قائمة تحقق Soft-launch — banco-web (إنتاج محدود)

**متى:** بعد Staging pack (Phase 7) + smoke حي أخضر.  
**المبدأ:** افتح الويب لجمهور محدود مع أعلام آمنة؛ الموبايل/API لا يتأثران.  
**Phase 8:** [`WEBSITE-PHASE8-SOFT-LAUNCH-STATUS-AR.md`](./WEBSITE-PHASE8-SOFT-LAUNCH-STATUS-AR.md)

---

## 0. Prep ثابت

```bash
pnpm run ops:website-staging-prep
pnpm run ops:website-soft-launch-prep
node scripts/verify-website-boundaries.mjs
```

---

## 1. أعلام الإنتاج (إلزامي عند الإطلاق المحدود)

```env
NEXT_PUBLIC_WEB_SEARCH_LIVE=false
NEXT_PUBLIC_WEB_SEARCH_MAP=false
NEXT_PUBLIC_WEB_MARKET_COPY=false
WEB_PLUG_ENABLED=true
NEXT_PUBLIC_SEARCH_ANALYTICS_MODE=off
```

قالب: `deploy/aws/env/.env.banco-web.production.example`

---

## 2. نشر

```bash
docker compose -f deploy/aws/docker-compose.banco-web.yml \
  --env-file deploy/aws/env/.env.banco-web.production.local \
  up -d --build
```

أو Cloud Run / ALB بنفس الصورة `Dockerfile.banco-web`.

---

## 3. Smoke بعد النشر

```bash
BANCO_WEB_URL=https://www.example.com \
  BANCO_WEB_EXPECT_PLUG=on \
  pnpm run ops:website-staging-smoke

curl -sS "$BANCO_WEB_URL/api/health"
curl -sS "$BANCO_WEB_URL/api/healthz"
# كلاهما: {"status":"ok","surface":"banco-web","plug":"on",...}
```

---

## 4. مراقبة (حد أدنى)

- [ ] Uptime على `/` (أو صفحة صيانة مقبولة عند unplug)  
- [ ] Uptime على `/api/health` **أو** `/api/healthz`  
- [ ] لا أخطاء API جديدة من traffic الويب (LIVE=false يقلّل الضغط)  
- [ ] موبايل regression يدوي سريع على نفس API  

---

## 5. اختبار فصل الفيشة (قبل الإعلان العام)

```bash
WEB_PLUG_ENABLED=false   # restart consumer-web فقط
curl -sS "$BANCO_WEB_URL/api/healthz"   # plug: off, HTTP 200
# أعد true
```

[`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md)

---

## 6. ما لا تفعله في soft-launch

- لا تفعّل `WEB_SEARCH_LIVE=true` على إنتاج قبل soak staging  
- لا تلمس api-server / موبايل لإصلاح ويب  
- لا تُفعّل Market copy على إنتاج قبل تجربة staging  
- لا تعتمد على Cloud Run trigger الفاشل كبوابة — اعتمد CI Website  

---

## 7. بعد soft-launch مستقر

1. تفعيل LIVE على staging أولاً ثم إنتاج بحذر  
2. (مستقبلي) `consumer_web_enabled` من الأدمن — يلمس API/admin  
