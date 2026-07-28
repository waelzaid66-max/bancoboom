# تقرير صيانة اللوجز — BANCO API Server

**التاريخ:** 2026-07-11  
**الإصدار:** v1.1.6 (B-OOM boom/main @ 51526ab)  
**الريبو:** `-BANCO-CA-OOM-` + `B-OOM`  
**الحالة:** ✅ مُصحَّح — اللوجز نظيفة بعد هذا التقرير

---

## 1. البنية الحالية للوجز

```
api-server/src/
├── lib/logger.ts              # pino: قناتان (app + access)
├── middlewares/requestLogger.ts  # سطر واحد per request (بعد الإصلاح)
├── middlewares/errorHandler.ts   # notFoundHandler + errorHandler
└── routes/health.ts           # GET /api/healthz  GET /api/readyz
```

### القنوات

| القناة | الملف | الاستخدام |
|--------|--------|-----------|
| `app` | pino stdout | أحداث النظام (بدء، jobs، أخطاء) |
| `access` | accessLogger | سطر واحد per HTTP request |

الفئات حسب حالة HTTP:

| الكود | المستوى | السبب |
|-------|---------|--------|
| 2xx | INFO | استجابات عادية |
| 3xx | INFO | إعادة توجيه |
| 401 / 404 | INFO | حالات عميل روتينية (لا تُعلن كأخطاء) |
| 4xx أخرى | WARN | أخطاء العميل غير الروتينية |
| 5xx | WARN + ERROR | خطأ خادم (يُسجَّل مرتين: access + app) |

---

## 2. الضجيج المعروف (قبل الإصلاح)

### المشكلة 1 — `GET /` → 404 متكرر

**الأعراض:**
```
[access] Request completed  endpoint="GET /"  status=404  error_code="NOT_FOUND"
[access] Request completed  endpoint="GET /"  status=404  error_code="NOT_FOUND"
[access] Request completed  endpoint="GET /"  status=404  error_code="NOT_FOUND"
```

**السبب:**  
Replit reverse proxy + أدوات مراقبة uptime تضرب `GET /` بشكل متكرر للتحقق من حياة العملية.
لم يكن هناك route لـ root فكانت تسقط إلى `notFoundHandler` → 404.

**الإصلاح (هذا الـ commit):**
1. `app.ts` — إضافة `app.get("/", ...)` قبل `seoRouter` تُرجع `200 + {"service":"BANCO API"}`.
2. `requestLogger.ts` — تخطي `GET /` كلياً من اللوجز (مثل `OPTIONS`) — لا قيمة معلوماتية.

---

### المشكلة 2 — ضربات healthcheck فاشلة عند بدء التشغيل

**الأعراض في لوجز deploy:**
```
[ERROR] healthcheck failed error=healthcheck /banco-mobile/ returned status 500
[ERROR] healthcheck failed error=healthcheck /api returned status 500
```

**السبب:** توقعات عند startup — العملية تحتاج ~6 ثوانٍ للبناء (esbuild) قبل الاستماع على port 8080. Replit يبدأ الـ healthcheck فوراً.

**الحكم:** حميدة تماماً — النظام يعلن جاهزيته عند `all artifact ports detected`. لا تستدعي تدخلاً.

**ملاحظة توثيقية:**  
`BANCO_DEPLOY_STARTUP_LOGS.md` في `.agents/memory/banco-deploy-startup-logs.md` يوثّق هذا السلوك بالتفصيل.

---

### المشكلة 3 — `Scheduled maintenance jobs registered` يظهر 3 مرات

**الأعراض:**
```
INFO: Scheduled maintenance jobs registered  timezone="Africa/Cairo"
INFO: Scheduled maintenance jobs registered  timezone="Africa/Cairo"
INFO: Scheduled maintenance jobs registered  timezone="Africa/Cairo"
```

**السبب:** advisory locks + idempotency guard — 3 process slots تتنافس على السجل الواحد. الوظائف تعمل مرة واحدة فقط (الأمان مضمون بـ advisory lock).

**الحكم:** حميدة — مُوثَّقة في الـ memory كسلوك متوقع.

---

## 3. ما صُلح في هذا الـ commit

| الملف | التغيير | الأثر |
|--------|---------|-------|
| `src/middlewares/requestLogger.ts` | تخطي `GET /` من اللوجز | يُزيل سطور 404 على root من access log |
| `src/app.ts` | إضافة `app.get("/", ...)` قبل `notFoundHandler` | `GET /` يرجع 200 بدل 404 |

---

## 4. ما يجب مراقبته (لوجز مهمة)

### حالات تستدعي تدخلاً:

```
# خطأ قاعدة بيانات
WARN: Request completed with error  status=503  endpoint="GET /api/readyz"

# خطأ خادم حقيقي
ERROR: Request failed with server error  status=500  endpoint="POST /api/listings"

# استثناء غير مُعالَج
ERROR: Unhandled rejection  kind="unhandledRejection"
ERROR: Uncaught exception  kind="uncaughtException"

# CSRF مرفوض (قد يشير لهجوم)
[access] Request completed with error  status=403  error_code="FORBIDDEN"
```

### حالات طبيعية لا تستدعي تدخلاً:

```
# مسبار حيوية (بعد الإصلاح: لا يظهر بعد الآن)
# كان: [access] endpoint="GET /"  status=404

# مسبار جاهزية (/api/healthz)
INFO: [access] endpoint="GET /api/healthz"  status=200  ← طبيعي كل 30s

# فشل healthcheck عند بدء التشغيل (أول 6 ثوانٍ)
ERROR healthcheck failed ... ← حميدة، تختفي بعد boot

# وظائف مجدولة
INFO: Job completed  job="subscription-expiring-reminders"  ← طبيعي كل ساعة
```

---

## 5. أوامر مراقبة اللوجز (محلي)

```bash
# لوجز API الحية
tail -f /tmp/logs/artifactsapi-server_*.log

# فلترة الأخطاء فقط
grep '"status":5' /tmp/logs/artifactsapi-server_*.log

# مراقبة healthcheck
watch -n 30 'curl -s http://localhost:8080/api/readyz'

# فلترة 4xx غير روتيني (تجاهل 401/404)
grep '"status":4' /tmp/logs/artifactsapi-server_*.log | grep -v '"status":401\|"status":404'
```

---

## 6. بنية مقاييس الأداء

`lib/metrics.ts` يجمع in-memory:
- Request count per endpoint
- Duration percentiles (p50 / p95 / p99)
- Error rate

متاحة عبر Admin OS → Dashboard → Live API Monitor.

---

## 7. حالة اللوجز بعد الإصلاح (متوقع)

```
[18:54:14.041] INFO: Server listening  port=8080
[18:54:14.083] INFO: Scheduled maintenance jobs registered  timezone="Africa/Cairo"
[18:54:14.157] INFO: Job completed  job="backfill-staff-roles"  duration_ms=74
# لا توجد سطور GET / بعد الآن ✅
[18:55:02.534] INFO: [access] endpoint="GET /api/healthz"  status=200  ← فقط هذا
[18:55:02.558] INFO: [access] endpoint="GET /api/readyz"   status=200
```

---

## 8. مرجع سريع — نقاط تهيئة اللوجز

| الإعداد | الملف | القيمة |
|---------|--------|--------|
| pino transport | `src/lib/logger.ts` | stdout JSON + pino-roll |
| autoLogging | `src/app.ts` (pinoHttp) | **false** (requestLogger يتولى) |
| تخطي OPTIONS | `requestLogger.ts` | `req.method === "OPTIONS"` |
| تخطي GET / | `requestLogger.ts` | `req.method === "GET" && req.path === "/"` |
| 4xx routine | `requestLogger.ts` | 401 + 404 → INFO بدل WARN |
| 5xx | `requestLogger.ts` | WARN (access) + ERROR (app) |

---

_تقرير مُنشأ تلقائياً — BANCO Agent · 2026-07-11_
