# بوابات الجاهزية — موقع BANCO (قابلة للتوقيع)

**مرجع:** [`WEBSITE-PRE-START-PLAYBOOK-AR.md`](./WEBSITE-PRE-START-PLAYBOOK-AR.md)

نسخة: 2026-07-09

---

## A. اتفاق المنتج

- [ ] A1 — القرارات D1–D10 في PRE-START مقبولة
- [ ] A2 — الموقع تكميلي للموبايل وليس بديلاً
- [ ] A3 — عزل تشغيلي: سقوط CDN لا يوقف التطبيق
- [ ] A4 — إنشاء إعلان على الويب ضمن النطاق (W5)
- [ ] A5 — dealer-os و admin-os يبقيان منفصلين
- [ ] A6 — العمل في `BANCO-CA-OOM` فقط؛ ريبو التطوير لاحقاً كـ remote
- [ ] A7 — لا لمس مرآات GitHub الأخرى

**توقيع المالك:** _______________ **تاريخ:** _______________

---

## B. جاهزية الكود والـ CI (قبل W0)

- [ ] B1 — `origin/main` محدث وموثّق في `DUAL_REPO_STATUS.md`
- [ ] B2 — آخر CI ناجح 5/5 على SHA كود مُختبَر (أو فشل billing موثّق)
- [ ] B3 — `pnpm install --frozen-lockfile` PASS
- [ ] B4 — `pnpm run typecheck` PASS
- [ ] B5 — `pnpm run lint` PASS
- [ ] B6 — `node scripts/production-confidence-check.mjs` 13/13
- [ ] B7 — `node scripts/verify-gcp-docker-build-config.mjs` PASS
- [ ] B8 — `pnpm --filter @workspace/banco-mobile run test:icons` PASS
- [ ] B9 — `pnpm --filter @workspace/banco-mobile run test:lib` PASS
- [ ] B10 — `pnpm --filter @workspace/banco-mobile run test:resilience` PASS

**من نفّذ:** _______________ **تاريخ:** _______________

---

## C. جاهزية API (قبل W1 deploy / W2 browse)

- [ ] C1 — `GET /api/healthz` → 200 على بيئة الهدف
- [ ] C2 — `GET /api/readyz` → 200 (DB متصل)
- [ ] C3 — `GET /l/{known-listing-id}` → 200 + og:title
- [ ] C4 — `CLERK_PUBLISHABLE_KEY` متوفر لبيئة الويب
- [ ] C5 — استراتيجية same-origin `/api/` أو `NEXT_PUBLIC_API_BASE_URL` مكتوبة
- [ ] C6 — `GET /v1/search?limit=1` عام بدون auth → 200

---

## D. جاهزية Google Cloud (قبل prod ويب + API)

- [ ] D1 — APIs مفعّلة (Run, Build, AR, SQL, Secret Manager)
- [ ] D2 — Cloud Build trigger → `deploy/gcp/cloudbuild.deploy.yaml`
- [ ] D3 — Build context `.` (جذر الريبو)
- [ ] D4 — Artifact Registry `banco` في المنطقة المختارة
- [ ] D5 — Cloud SQL PG16 + `pg_trgm`
- [ ] D6 — أسرار Secret Manager حسب `SECRET_MANAGER_MAPPING.md`
- [ ] D7 — Runtime SA + `cloudsql.client` + secret accessor
- [ ] D8 — **خطة CDN لـ banco-web** محددة (GCS/Firebase/Cloudflare)
- [ ] D9 — Uptime check على `/` و `/api/healthz` (Monitoring)

مرجع: `deploy/gcp/reports/06-READINESS_CHECKLIST_GONOGO.md`

---

## E. جاهزية aws-virgen

- [ ] E1 — `aws-virgen` main مزامَن مع الأساسي
- [ ] E2 — tag `v1.0.0-rc.2` على virgen

---

## F. جاهزية فريق / وكلاء

- [ ] F1 — قراءة PRE-START + MASTER + FEATURE-MATRIX
- [ ] F2 — WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST معلّق على قالب PR
- [ ] F3 — قالب PR ويب يتضمن «mobile smoke بدون تغيير mobile»

---

## G. بوابات إغلاق موجات (يُملأ أثناء التنفيذ)

### G-W0 (عزل CI)

- [x] job `ci-website` منفصل بـ path filter (`ci-website.yml`)
- [x] `banco-web` / `landing` خارج typecheck في `ci.yml` (`typecheck` يستثني الويب)
- [x] `verify-website-boundaries.mjs` + ESLint `lint:website` في CI website
- [x] `artifacts/landing/.env.example`
- [x] PR mobile-only: لا يشغّل website job (path filters)

### G-W1 (scaffold + SEO)

- [x] `artifacts/banco-web` typecheck في CI website
- [x] 4 hub pages AR + EN mirrors تحت `/en/*`
- [x] preview URL على PR (landing artifact + GCS اختياري)
- [x] `sitemap.xml` يشمل روابط hubs السريعة من `HUB_DEFINITIONS`
- [x] `manifest.webmanifest` محايد (EN) للـ PWA
- [ ] `/l/:id` smoke PASS على staging (rewrite موجود في `next.config.ts`)
- [x] `/en/listing/[id]` mirror + hreflang يطابق مساراً حقيقياً (2026-07-11)

### G-W2 (بحث)

- [x] `lib/search-contract` + tests + `mobile-web-parity.test.mjs`
- [x] `/search` + `/en/search` + `/listing/[id]`
- [x] تصفح بدون Clerk (live خلف `NEXT_PUBLIC_WEB_SEARCH_LIVE`)
- [x] واجهة بحث EN كاملة (فلاتر، facets، pagination، near-me، copy URL)
- [x] بطاقات إعلان + تفاصيل إعلان + not-found تتبع تفضيل اللغة (`localStorage` + `/en/*`)
- [x] خريطة بحث (mock/live/disabled) منسوخة AR/EN — خلف `NEXT_PUBLIC_WEB_SEARCH_MAP`

### G-W3 (خريطة + فلاتر متقدمة — staging code)

- [x] مكوّنات الخريطة (panel، surface، canvas، Google) موحّدة اللغة
- [x] `pnpm run ops:website-ci` — mirror محلي لـ `ci-website.yml` (**9/9 PASS 2026-07-11**)
- [x] Docker `deploy/aws/Dockerfile.banco-web` + `ci-website-docker.yml`
- [ ] خريطة حية على staging (`MAP=true` + Google key) — بعد API FRESH
- [x] FilterSheet parity مع الموبايل (W3.1): `natural_gas`/`cvt`، industry/origin في facets، inventory gating

### G-W4 (Clerk + حفظ + leads)

- [x] `@clerk/nextjs` + middleware على `/workspace` و `/saved`
- [x] حفظ إعلان (`ListingSaveButton`) + صفحة `/saved`
- [x] تواصل من الويب (`POST /v1/leads/contact`) للمستخدم المسجّل
- [x] `/sign-in` + `/sign-up` (AR + EN)
- [x] إبلاغ عن إساءة + أسئلة/أجوبة على صفحة الإعلان (2026-07-11)
- [x] تقييمات البائع (`GET/POST /v1/sellers/{id}/reviews`) (2026-07-11)

### G-W5 (إنتاج بائع)

- [x] `/workspace` — metrics (`GET /v1/me/metrics`)
- [x] `/workspace` — اختصارات سريعة (overview quick links) (2026-07-11)
- [x] `/workspace/analytics` — تحليلات الأداء (2026-07-11)
- [x] `/workspace/listings` — إعلاناتي (`GET /v1/me/listings/manage`)
- [x] `/workspace/listings/new` — إنشاء (`POST /v1/listings` + uploads)
- [x] `/workspace/listings/[id]/edit` — تعديل (`PATCH`)
- [x] bump/delete من لوحة الإعلانات
- [x] `/workspace/leads` — `GET /v1/dealer/leads`
- [ ] E2E staging: create listing → يظهر في search + mobile

### G-W6 (B2B عرض)

- [x] `/workspace/b2b` — روابط عميقة لبانكو ماركت (لا تكرار UI) (2026-07-11)
- [ ] RFQ/create على الويب (لاحق — ماركت)

### G-W7 (رسائل + محفظة + حجز)

- [x] `/workspace/messages` — صندوق المحادثات (`GET /v1/conversations`) (2026-07-11)
- [x] `/workspace/messages/[id]` — محادثة + إرسال (`GET/POST /v1/conversations/{id}/messages`) (2026-07-11)
- [x] زر «محادثة» على الإعلان يفتح المحادثة في الويب (`POST /v1/conversations`) (2026-07-11)
- [x] `/workspace/wallet` — رصيد + سجل (`GET /v1/wallet`, `/v1/wallet/transactions`) (2026-07-11)
- [x] `/workspace/bookings` — ضيف/مضيف + تأكيد/رفض/إلغاء (2026-07-11)
- [x] حجز إقامة من صفحة الإعلان — تقويم كامل (نفس `BookingCard` في الموبايل) (2026-07-11)
- [x] شحن محفظة من الويب — `createTopup` + polling `confirmTopup` (نفس `wallet.tsx`) (2026-07-11)
- [x] نصوص وسلوك W7 مطابقة للموبايل (i18n + invalidate availability على الحجز) (2026-07-11)

### G-W8 (دليل المنصات — landing parity)

- [x] `/directory` + `/en/directory` — منسوخ من `landing/App.tsx` بدون import عبر الحدود (2026-07-11)
- [x] ترتيب البطاقات: التطبيق أولاً ثم الويب التكميلي ثم ماركت ثم الأدمن (2026-07-11)
- [x] `verify-website-boundaries.mjs` يمنع `banco-web` ↔ `landing` cross-import (2026-07-11)
- [x] sitemap + SEO static audit + staging smoke يشمل `/directory` (2026-07-11)
- [x] landing يعيد التوجيه إلى `{NEXT_PUBLIC_SITE_URL}/directory` عند ضبط `VITE_WEB_URL` (2026-07-11)
- [ ] تحقق حي على staging: زيارة جذر landing/nginx → يصل `/directory` على banco-web

### G-W9 (staging smoke — لا يمس الموبايل)

- [x] `website-rewrite-config-audit.mjs` يتحقق من `/l/:id` + `/api/*` في `next.config.ts` (2026-07-11)
- [x] Phase 7 staging pack — Docker flags + `ops:website-staging-prep` (2026-07-18)
- [ ] `BANCO_WEB_URL` + `BANCO_LISTING_SMOKE_ID` — smoke `/l/:id` على staging (OPS)
- [ ] E2E staging: create listing → يظهر في search + mobile (نفس G-W5)
- [ ] نشر banco-web CDN staging مع flags آمنة (`WEB_SEARCH_LIVE=false` أولاً) (OPS)

### G-W10 (soft-launch pack — كود)

- [x] `/api/healthz` alias + plug exempt (Phase 8)
- [x] `deploy/aws/env/.env.banco-web.production.example` — LIVE/MAP/MARKET off
- [x] `ops:website-soft-launch-prep` + [`WEBSITE-SOFT-LAUNCH-CHECKLIST-AR.md`](./WEBSITE-SOFT-LAUNCH-CHECKLIST-AR.md)
- [ ] نشر CDN إنتاج محدود + uptime على health/healthz (OPS)

---

## H. حكم Go / No-Go

| مرحلة | يتطلب | الحكم |
|-------|--------|-------|
| **بدء W0** | A* + B* | GO / NO-GO |
| **بدء W1** | + C* | GO / NO-GO |
| **نشر staging ويب** | + D8 | GO / NO-GO |
| **prod ويب عام** | + G-W2 + G-W5 كحد أدنى للشمول | GO / NO-GO |

**ملاحظات:**

_________________________________________________________________

**توقيع:** _______________ **تاريخ:** _______________
