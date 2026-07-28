# مصفوفة ميزات موقع BANCO الشامل

**مرجع:** [`WEBSITE-MASTER-PLAN-AR.md`](./WEBSITE-MASTER-PLAN-AR.md)  
**التاريخ:** 2026-07-09  
**رموز:** ✅ موجود · 🎯 هدف موجة · ➡️ رابط لسطح آخر · ❌ خارج نطاق الويب · ⚠️ فجوة معروفة

---

## 1. تصفح المستهلك (P1)

| الميزة | موبايل | dealer | admin | banco-web | موجة | API رئيسي |
|--------|--------|--------|-------|-----------|------|-----------|
| Home feed | ✅ | — | — | 🎯 | W2 | `GET /v1/feed` |
| Trending / discover | ✅ | — | — | 🎯 | W2 | `GET /v1/search/trending` |
| بحث نصي + فلاتر | ✅ | — | — | 🎯 | W2 | `GET /v1/search` |
| Autocomplete | ✅ | — | — | 🎯 | W2 | `GET /v1/search/autocomplete` |
| Facets | ✅ | — | — | 🎯 | W3 | `GET /v1/search/facets` |
| خريطة + clusters | ✅ | — | — | 🎯 | W3 | `GET /v1/search/map` |
| Near me | ✅ | — | — | 🎯 | W3 | `near_lat/lng/radius_km` |
| تفاصيل إعلان | ✅ | — | — | 🎯 | W2 | `GET /v1/listings/{id}` |
| Similar listings | ✅ | — | — | 🎯 | W2 | `GET /v1/listings/{id}/similar` |
| SEO HTML | share | — | — | 🎯 canonical | W1–W2 | `GET /l/:id` (api) |
| حفظ إعلان | ✅ | — | — | 🎯 | W4 | `POST /v1/saves/toggle` |
| تواصل بائع | ✅ | — | — | 🎯 | W4 | `POST /v1/leads/contact` |
| تقرير إساءة | ✅ | — | — | 🎯 | W4 | `POST /v1/reports` |
| تعليقات Q&A | ✅ | — | — | 🎯 | W4 | comments API |
| حجز يومي | ✅ | — | — | 🎯 | W7 | bookings API |
| مشاركة رابط | ✅ | — | — | 🎯 | W1 | `/l/{id}` |

---

## 2. بائع فردي — إنتاج ومتابعة (P2)

| الميزة | موبايل | dealer | admin | banco-web | موجة | API رئيسي |
|--------|--------|--------|-------|-----------|------|-----------|
| **إنشاء إعلان** | ✅ wizard | ✅ sheet | — | 🎯 | **W5** | `POST /v1/listings` |
| تعديل إعلان | ✅ | ✅ | — | 🎯 | W5 | `PATCH /v1/listings/{id}` |
| حذف إعلان | ✅ | ✅ | — | 🎯 | W5 | `DELETE /v1/listings/{id}` |
| إعلاناتي | ✅ mine | ✅ listings | إشراف | 🎯 | W5 | `GET /v1/me/listings/manage` |
| Bump / تجديد | ✅ | ✅ | — | 🎯 | W5 | `POST /v1/listings/{id}/bump` |
| رفع صور | ✅ | ✅ | — | 🎯 | W5 | uploads/* |
| مقاييسي | ✅ profile | ✅ dashboard | — | 🎯 | W5 | `GET /v1/me/metrics` |
| تحليلات بائع | ✅ analytics | ✅ analytics | — | 🎯 | W5 | `GET /v1/dealer/analytics` |
| Leads | ✅ requests | ✅ leads | admin | 🎯 | W5 | `GET /v1/dealer/leads` |
| Boost مدفوع | ✅ | ✅ ads | admin | 🎯/➡️ | W6 | `POST /v1/dealer/listings/boost` |
| Onboarding تاجر | ✅ | ✅ inline | — | ➡️ | — | `PATCH /v1/me` |
| شركة / ملف | ✅ edit | ✅ company | — | 🎯 | W6 | companies API |

---

## 3. تاجر B2B (P3) — dealer-os

| الميزة | موبايل | dealer | banco-web | ملاحظة |
|--------|--------|--------|-----------|--------|
| Dashboard KPIs | ✅ supply-hub | ✅ `/dashboard` | ➡️ `/market/` | لا تكرار UI |
| إعلانات + bulk | ✅ | ✅ | ➡️ | bulk dealer فقط |
| **استيراد CSV** | ❌ | ✅ `/import` | ➡️ | dealer فقط |
| Leads | ✅ | ✅ | ➡️ | |
| RFQ inbox بائع | ✅ `GET /v1/rfqs` | ⚠️ `rfqs/mine` | ➡️ + إصلاح | G2 |
| Global supply | ✅ | ✅ | ➡️ عرض عام W6 | |
| Investments | ✅ | ✅ | ➡️ | |
| Wallet | ✅ | ✅ | ➡️ W7 | |
| Subscription | ✅ | ✅ | ➡️ | |
| Analytics | ✅ | ✅ | ➡️ | |
| Ads management | ✅ | ✅ | ➡️ | |
| Privacy/Terms | ✅ legal | ✅ public | ➡️ | |

---

## 4. مشتري B2B — RFQ (P4)

| الميزة | موبايل | banco-web | موجة |
|--------|--------|-----------|------|
| إنشاء RFQ | ✅ | 🎯 | W6 |
| RFQs الخاصة بي | ✅ | 🎯 | W6 |
| عرض RFQ + عروض | ✅ | 🎯 | W6 |
| قبول عرض | ✅ | 🎯 | W6 |

---

## 5. إدارة المنصة (P5) — admin-os فقط

| صفحة admin | API | banco-web |
|------------|-----|-----------|
| overview | `/v1/admin/overview` | ➡️ `/admin/` |
| users | admin users | ➡️ |
| listings moderation | admin listings | ➡️ |
| moderation queue | admin moderation | ➡️ |
| reports | admin reports | ➡️ |
| support | admin support | ➡️ |
| revenue / analytics | admin | ➡️ |
| fraud / monitoring / alerts | admin | ➡️ |
| plans / promo / settings | admin | ➡️ |

**لا تُبنى في banco-web** — أمان وعزل.

---

## 6. تشغيل وإنتاج (P6)

| نشاط | أين اليوم | هدف الويب |
|------|-----------|-----------|
| CI typecheck/build | `.github/workflows/ci.yml` | job `build-website` منفصل W0 |
| نشر API | GCP/AWS docker | بدون تغيير |
| نشر static web | `Dockerfile.web` + CDN | banco-web bucket منفصل |
| Health API | `/api/healthz` | مستقل |
| Health web | nginx-health | synthetic على `/` و `/search` |
| Rollback web | — | إصدار CDN -1 |
| Observability | OBSERVABILITY-RUNBOOK | تنبيهات CDN منفصلة |
| Smoke | `scripts/staging-p0-smoke.mjs` | إضافة smoke ويب W1 |

---

## 7. موبايل فقط (يبقى في التطبيق — لا يُعاد بناؤه على الويب v1)

| ميزة | سبب |
|------|-----|
| Push notifications | native |
| AI assistant كامل | `POST /v1/me/ai/assistant` |
| كاميرا / فيديو / crop متقدم | native UX |
| Biometrics / haptics | native |
| Cinematic intro | native |
| Invoices UI كامل | 🎯 W7 أو تطبيق |
| Offline drafts | native storage |

---

## 8. فجوات يجب إصلاحها (عبر المشروع)

| ID | الوصف | الملفات | موجة إصلاح |
|----|--------|---------|------------|
| G1 | taxonomy إنشاء في موبايل فقط | `listingCreateTaxonomy.ts` | W2–W5 |
| G2 | RFQ dealer vs mobile API | `dealer-os/pages/rfqs.tsx` | W0 أو W6 |
| G3 | landing بدون api-client | `landing/App.tsx` | W2 |
| G4 | CI يبني landing مع core | `ci.yml` | W0 |

---

## 9. تعيين موجات → أدوار

| موجة | P1 مشتري | P2 بائع | P3 تاجر | P4 RFQ | P5 admin | P6 ops |
|------|----------|---------|---------|--------|----------|--------|
| W0 | — | — | — | — | — | ✅ |
| W1 | SEO | — | رابط | — | رابط | deploy |
| W2 | browse | — | — | — | — | smoke |
| W3 | map | — | — | — | — | — |
| W4 | auth+hفظ | — | — | — | — | — |
| W5 | — | **إنتاج كامل** | جزئي | — | — | E2E |
| W6 | B2B عرض | شركة | ➡️ماركت | RFQ | — | — |
| W7 | رسائل | wallet | wallet | — | — | — |
| W8 | unify | unify | — | — | — | — |

---

*يُحدَّث هذا الملف عند إغلاق كل موجة أو تغيير نطاق المنتج.*
