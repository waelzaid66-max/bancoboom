# BANCO STORE — Production Sign-off & Deployment Package

**التاريخ / Date:** 2026-07-08 (closure wave)  
**الفرع / Branch:** `main` (push this wave)  
**الوضع / Mode:** Release Freeze — إصلاحات جذرية فقط، بدون ميزات جديدة  
**المُعِد / Prepared by:** Engineering readiness pass (code + docs + local gates)

> **ملاحظة صريحة:** لا يوجد فرع `aws-virgen-main` على الريموت. هدف الشحن: **`origin/main`**.

---

## ملخص تنفيذي | Executive Summary

| البند | الحكم |
|--------|--------|
| **جاهزية الكود للتجميد والنشر التشغيلي** | **GO WITH FIXES** |
| **النشر العالمي للمتاجر (App Store / Play) بدون إشراف** | **NO GO** |
| **EAS Preview (Android)** | **IN PROGRESS** — build `2b030ca4-b001-43a5-9723-00128f471d07` |
| **النشر المباشر إلى إنتاج حي (Replit / AWS / GCP)** | **جاهز على مستوى المستودع + runbooks** — يتطلب أسراراً تشغيلية وتحقق staging لم يُنفَّذ من هذه الشبكة |

**السبب:** بوابات البناء والنوع واللينت والاختبارات الثابتة للموبايل **خضراء محلياً** بعد إصلاح Metro. العوائق المتبقية **تشغيلية** (DB قابل للوصول، JWT Clerk، EAS، متاجر، webhook مراقبة) — وليست انحداراً في منطق المنتج المُجمَّد.

---

## 1) جاهزية الإصدار | Release Readiness

### 1.1 بوابات التحقق (مُنفَّذة هذه الجلسة)

| البوابة | الأمر | النتيجة | Exit |
|---------|--------|---------|------|
| بناء الموبايل (web export) | `pnpm --filter @workspace/banco-mobile run build` | **PASS** | 0 |
| TypeScript (monorepo) | `pnpm run typecheck` | **PASS** | 0 |
| Lint | `pnpm run lint` | **PASS** | 0 |
| اختبارات الموبايل | `pnpm --filter @workspace/banco-mobile run test` | **PASS** (**25** = 6+12+5+2) | 0 |
| Production confidence | `node scripts/production-confidence-check.mjs` | **PASS** (12/12) | 0 |

### 1.2 بوابات لم تُعاد هنا (مع تبرير صادق)

| البوابة | الحالة | السبب |
|---------|--------|--------|
| `pnpm run build` كامل monorepo | **غير مُعاد** | CI يبني api-server + admin + dealer + landing؛ الموبايل مُثبت منفصلاً |
| API vitest كامل | **محجوب محلياً** | يحتاج Postgres؛ **CI job `test`** يشغّله على Linux + Postgres 16 |
| GitHub Actions | **غير مُتحقق من هنا** | `gh` غير مُصرّح (`GH_TOKEN` / `gh auth login`) — على المشغّل تأكيد الأخضر على `f2dcab7` |
| Staging smoke | **FAIL (ops)** | API sleeping (404); `CLERK_BEARER_TOKEN` absent |
| DB schema verify | **FAIL (ops)** | `DATABASE_URL` `ENOTFOUND` |
| EAS Android preview | **IN PROGRESS** | Cloud build queued; auth **PASS** |
| EAS production + device QA | **NOT DONE** | Required for store **GO** |

### 1.3 إصلاحات جذرية مُدمجة في `main`

| المشكلة | السبب الجذري | الإصلاح |
|---------|--------------|---------|
| فشل Metro (`@react-navigation/*`, Expo peers) | `disableHierarchicalLookup` + تخطيط pnpm معزول بعد تنظيف جزئي على Windows | `.npmrc` hoisted + تبعيات صريحة + `disableHierarchicalLookup = false` |
| `pnpm` على Windows | `preinstall` يستخدم `sh` | `scripts/preinstall-enforce-pnpm.mjs` |
| Universal Links | غير مُكوَّن أو hardcoded | `app.config.ts` — env-driven `associatedDomains` / `intentFilters` |
| أسرار smoke لا تُحمَّل | عملية منفصلة | `tryLoadLocalSecrets()` + `run-with-local-secrets.mjs` |
| OpenAI تعليق / مفاتيح وهمية | لا timeout ولا رفض placeholders | `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`, رفض DUMMY/CHANGEME، حد `OPENAI_MAX_COMPLETION_TOKENS` |
| `OBJECT_STORAGE_PROVIDER=gcs` | غير مدعوم في الكود | رفض صريح؛ GCP يستخدم `s3` (HMAC) أو `replit` |

### 1.4 مصفوفة المجالات

| المجال | الحكم |
|--------|--------|
| API (تصميم + hardening) | **PASS** مع حجز staging |
| Admin / Dealer / Landing | **PASS** (typecheck ضمن المونوريبو) |
| Marketplace / Search / Media | **PASS WITH RESERVATIONS** (إثبات runtime يحتاج DB + auth) |
| Mobile (كود + export) | **PASS** |
| Mobile (جهاز / متجر) | **BLOCKED** (ops) |
| Cloud Replit / AWS / GCP | **PASS scaffold** — لا ادعاء نشر حي هذه الجلسة |

---

## 2) المراجعة الأمنية | Security Review

**المنهجية:** فحص كود ثابت + تقارير المراحل السابقة؛ **لا** pentest خارجي ولا فحص تبعيات npm كامل هذه الجلسة.

### 2.1 ضوابط مُتحقَّق منها في الكود

| التهديد | الضابط | الملف / المرجع |
|---------|--------|----------------|
| **IDOR uploads** | `upload_claims` + ACL | Phase 05؛ commits سابقة |
| **CSRF** (طلبات cross-origin بسيطة) | `shouldRejectUnsafeOrigin` قبل parsers | `artifacts/api-server/src/app.ts` |
| **CORS** | قائمة أصول مسموحة + credentials | `lib/cors.ts` |
| **Headers** | Helmet + CSP للـ JSON API | `app.ts` |
| **Rate limiting** | public 120/min، write 30/min، search 60/min، AI 12/min | `middlewares/rateLimiter.ts` |
| **Body size** | JSON/urlencoded 100kb | `app.ts` |
| **Auth** | Clerk middleware؛ مسارات محمية `requireAuth` | routes v1 |
| **SQLi** | Drizzle ORM + parameterized queries | db layer |
| **Secrets في Git** | `.gitignore` لـ `.secrets/`, `.env*` | جذر المستودع |
| **مفاتيح OpenAI وهمية** | رفض عند أول استخدام AI | `lib/integrations-openai-ai-server/src/_client.ts` |
| **تخزين غير مدعوم** | رفض `gcs` كـ provider | `objectStorageProvider.ts` |

### 2.2 فجوات / حجوزات (ليست regressions جديدة)

| البند | الخطورة | الملاحظة |
|-------|---------|----------|
| IDOR smoke بتوكن ثانٍ | High (ops) | يحتاج `CLERK_BEARER_TOKEN_OTHER` على staging |
| SSRF في تكاملات خارجية | Medium | راجع أي fetch لـ URLs من المستخدم عند التوسع |
| Dependabot / npm audit | Medium | لم يُعاد تشغيله هنا — يُنصح قبل الإنتاج |
| WAF / DDoS على الحافة | Medium (ops) | خارج نطاق التطبيق — Replit/AWS/GCP config |

**حكم الأمن للكود المُجمَّد:** **PASS WITH RESERVATIONS** — لا Critical مفتوح في الكود؛ الإثبات التشغيلي على staging مطلوب.

---

## 3) الأداء والاستقرار | Performance & Reliability

### 3.1 API

| البند | التنفيذ |
|-------|---------|
| ضغط الاستجابات | `compression()` |
| Health | `/api/healthz` (liveness)، `/api/readyz` (DB مع timeout 2s) |
| Logging | Pino + request ID؛ سطر وصول واحد لكل طلب |
| OpenAI | timeout 30s افتراضي، retries=1، حد tokens للإكمال |
| DB readiness | لا يعلق الـ probe — `Promise.race` مع 2s |

### 3.2 Mobile

| البند | الحالة |
|-------|--------|
| Metro monorepo | **مُصلَح** — بناء export ناجح |
| Crash handling | ErrorBoundary + `crashLog` — 5 اختبارات resilience |
| New Architecture | `newArchEnabled: true` في `app.json` |
| Bundle store | **لم يُقاس** حجم AAB/IPA — يتطلب `eas build` |

### 3.3 مخاطر أداء متبقية

- Rate limits في الذاكرة (instance-local) — على تعدد النسخ استخدم Redis أو LB sticky rules إن لزم.
- بحث ثقيل / feed كبير — يعتمد على فهارس DB؛ تحقق تحميل على staging.
- AI تكلفة — `aiRateLimiter` + `OPENAI_MAX_COMPLETION_TOKENS`.

**حكم الأداء:** **PASS WITH RESERVATIONS** للتصميم؛ **قياس حمل** على staging موصى به قبل ذروة الإطلاق.

---

## 4) مراجعة الامتثال | Compliance Review

### 4.1 iOS

| المتطلب | الحالة |
|---------|--------|
| Bundle ID | `com.bancooom.app` |
| Sign in with Apple | `usesAppleSignIn: true` |
| Privacy strings (صور/كاميرا/موقع) | موجودة في `app.json` / plugins |
| Privacy Manifest | `NSPrivacyAccessedAPITypes: []` |
| ITSAppUsesNonExemptEncryption | `false` |
| Universal Links | **مُكوَّن في التطبيق (env)** — يحتاج ملفات hosted على النطاق |

### 4.2 Android

| المتطلب | الحالة |
|---------|--------|
| package | `com.bancooom.app` |
| targetSdkVersion | **35** |
| أذونات | CAMERA, LOCATION (عند الاستخدام عبر plugins) |
| App Links (HTTPS) | **غير مُكوَّن** — scheme `bancooom` فقط |

### 4.3 المتجر / الخصوصية

| البند | الحالة |
|-------|--------|
| سياسة خصوصية URL عام | **تحقق يدوي** — يجب أن يطابق جمع البيانات الفعلي (Clerk، موقع، صور، push) |
| Data safety (Play) | **OPS** — يملأه المشغّل عند الرفع |
| Push (FCM/APNs) | **OPS** — plugin موجود؛ شهادات لم تُختبر على جهاز |

**حكم الامتثال:** **PASS WITH RESERVATIONS** للإعدادات داخل المستودع؛ **NO GO** لمتجر عالمي حتى إغلاق روابط HTTPS العميقة + نماذج المتجر + اختبار جهاز.

---

## 5) الاعتماد النهائي للإصدار | Production Sign-off

### 5.1 معايير القرار

| المعيار | مستوفى؟ |
|---------|---------|
| Critical = 0 في الكود | **نعم** |
| بناء mobile + typecheck + lint محلياً | **نعم** (هذه الجلسة) |
| CI أخضر على `f2dcab7` | **غير مُثبت هنا** — مطلوب من المشغّل |
| Staging smoke + DB | **لا** |
| EAS + متاجر | **لا** |

### 5.2 العدّادات (صادقة)

- **Critical:** 0  
- **High:** 4 — DB verify، Clerk smoke، EAS/device، متاجر/توقيع  
- **Medium:** 4 — webhook مراقبة، Universal/App Links، build mono كامل غير مُعاد، persona matrix  
- **Low:** 3  

### 5.3 القرار الرسمي

```
┌─────────────────────────────────────────────────────────────┐
│  CODE FREEZE → origin/main     :  GO WITH FIXES             │
│  STAGING VALIDATION            :  PENDING (ops secrets)     │
│  PRODUCTION DEPLOY (unsupervised):  GO WITH FIXES (runbook) │
│  GLOBAL STORE PUBLISH          :  NO GO                     │
└─────────────────────────────────────────────────────────────┘
```

**التوقيع الهندسي:** الكود على `f2dcab7` جاهز للتسليم للتشغيل. **لا** يُعتمد نشر متاجر أو إنتاج حرج بدون إغلاق الـ High الأربعة.

---

## 6) النشر إلى بيئة الإنتاج | Production Deployment

> **لم يُنفَّذ نشر حي هذه الجلسة.** الخطوات أدناه runbook — نفّذها المشغّل مع الأسرار.

### 6.1 أسرار مطلوبة (بدون قيم)

راجع [STAGING-REQUIRED-SECRETS.md](./STAGING-REQUIRED-SECRETS.md). الأهم:

- `DATABASE_URL`, Clerk keys, `OBJECT_STORAGE_*`, `OPENAI_API_KEY` (إن وُجد AI)
- `ERROR_ALERT_WEBHOOK`, `BANCO_API_URL`, `CLERK_BEARER_TOKEN` (للتحقق)
- EAS + Apple + Google signing

### 6.2 Replit (محفوظ — لا حذف)

1. تأكد env production على Replit (storage `replit` أو `s3`).
2. `pnpm install` → build api-server + تطبيقات الويب حسب الـ workflow الحالي.
3. تحقق: `GET /api/healthz` → 200؛ `GET /api/readyz` → 200 مع DB.
4. شغّل `scripts/staging-p0-smoke.mjs` عند توفر JWT.

### 6.3 AWS

1. املأ `deploy/aws/env/.env.production.example` → secrets manager / EB env.
2. `OBJECT_STORAGE_PROVIDER=s3` + مفاتيح S3.
3. Docker/compose من `deploy/aws/` — healthcheck على `/api/readyz`.
4. OpenAI: `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`, `OPENAI_MAX_COMPLETION_TOKENS`.

### 6.4 Google Cloud

1. Cloud Run / Cloud Build من `deploy/gcp/`.
2. **لا** تضبط `OBJECT_STORAGE_PROVIDER=gcs` — استخدم `s3` (HMAC) أو `replit`.
3. نفس فحوص health وstaging smoke.

### 6.5 Mobile (EAS)

1. `eas login` + credentials (Android keystore, Apple).
2. Preview: `eas build --profile preview` (APK داخلي).
3. Production: `eas build --profile production` (AAB + iOS).
4. اضبط `EXPO_PUBLIC_*` و`EXPO_PUBLIC_ROUTER_ORIGIN` في EAS secrets.
5. TestFlight / Play internal قبل الإنتاج العام.

### 6.6 ترتيب موصى به

```
Secrets → DB migrate/push → API deploy → healthz/readyz
       → staging smoke (Clerk) → EAS preview على جهاز
       → مراقبة webhook → production promote → متاجر (داخلي أولاً)
```

### 6.7 Rollback

راجع [RELEASE-ROLLBACK-PLAYBOOK.md](./RELEASE-ROLLBACK-PLAYBOOK.md) و [MIGRATION-ROLLBACK-PLAYBOOK.md](./MIGRATION-ROLLBACK-PLAYBOOK.md).

---

## 7) ما يجب على المشغّل فوراً

1. `gh run list --branch main` — تأكيد CI أخضر على `f2dcab7`.
2. تشغيل Wave A من [STAGING-REQUIRED-SECRETS.md](./STAGING-REQUIRED-SECRETS.md).
3. `node scripts/verify-upload-claims-schema.mjs` على DB حقيقي.
4. `node scripts/staging-p0-smoke.mjs`.
5. `eas build` preview + جهاز فعلي.
6. قرار منتج: نطاق Universal/App Links قبل الإطلاق العام.

---

## 8) مراجع

- [BANCO-STORE-FINAL-PRODUCTION-READINESS-REPORT.md](./BANCO-STORE-FINAL-PRODUCTION-READINESS-REPORT.md)
- [RELEASE-CANDIDATE-FINAL.md](./RELEASE-CANDIDATE-FINAL.md)
- [OPEN-ITEMS-BACKLOG.md](./OPEN-ITEMS-BACKLOG.md)
- [STAGING-EAS-DEVICE-RUNBOOK.md](./STAGING-EAS-DEVICE-RUNBOOK.md)
- `deploy/aws/`, `deploy/gcp/README.md`

---

*هذه الوثيقة لا تدّعي نجاحاً تشغيلياً لم يُقاس. أي PASS أعلاه مُسمّى بمصدره: كود، فحص ثابت، أو بوابة محلية.*
