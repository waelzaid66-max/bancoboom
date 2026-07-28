# خطة موقع BANCO الشامل — نسخة كاملة (إنتاج + مستخدمون + إعلانات)

**التاريخ:** 2026-07-09 (تحديث شامل)  
**النطاق:** تخطيط واتفاق — لا تنفيذ كود حتى الموافقة  
**مساحة العمل:** `BANCO-CA-OOM`

> **ابدأ من هنا قبل أي تنفيذ:** [`WEBSITE-PRE-START-PLAYBOOK-AR.md`](./WEBSITE-PRE-START-PLAYBOOK-AR.md)  
> **قوائم التحقق:** [`WEBSITE-READINESS-GATES.md`](./WEBSITE-READINESS-GATES.md)

**مراجع:**

| وثيقة | الغرض |
|--------|--------|
| [`WEBSITE-SEPARATION-AND-COMPATIBILITY-PLAN.md`](./WEBSITE-SEPARATION-AND-COMPATIBILITY-PLAN.md) | معمارية فنية + OpenAPI |
| [`WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md`](./WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md) | فحص قبل كل PR |
| [`WEBSITE-FEATURE-MATRIX.md`](./WEBSITE-FEATURE-MATRIX.md) | جدول تغطية مفصل لكل ميزة |
| [`WEBSITE-PRE-START-PLAYBOOK-AR.md`](./WEBSITE-PRE-START-PLAYBOOK-AR.md) | ترتيب الأفكار + بوابات Go + كفاءة |
| [`WEBSITE-READINESS-GATES.md`](./WEBSITE-READINESS-GATES.md) | قوائم توقيع قبل كل موجة |

---

## 0. الرؤية — «بوابة BANCO» الشاملة

موقع واحد للجمهور (`banco.com` أو ما يعادله) **لا يدمج** الكود داخلياً، لكنه **يجمع التجربة** عبر مسارات واضحة:

```
                         ┌─────────────────────────┐
                         │   banco-web + landing    │
                         │   (بوابة + مستهلك)      │
                         └───────────┬─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
  /browse /search            /workspace (بائع)          روابط خارجية
  /listing /cars             إعلاناتي · إنشاء           /market/ → dealer-os
  SEO / حفظ                  مقاييس · leads            /admin/ → admin-os
         │                           │
         └─────────────┬─────────────┘
                       ▼
              api-server /api/v1/*
              (مصدر واحد — لا يعتمد على الويب)
```

**المبدأ:** المستخدم يرى منظومة واحدة؛ المطور يحافظ على **artifacts منفصلة** قابلة للفك والنشر بمفردها.

---

## 1. القواعد الذهبية (ثابتة)

### 1.1 الموبايل أولاً

- الويب **يدعم** اكتشاف الإعلانات، SEO، المشاركة، وإدارة خفيفة من المتصفح.
- التطبيق يبقى الأفضل لـ: إشعارات push، كاميرا/فيديو، مساعد AI، حجز يومي متقدم، تجربة offline.
- **لا breaking changes** على OpenAPI من أجل الويب فقط.

### 1.2 عزل تشغيلي

| حدث | الموبايل | API | dealer-os | admin-os |
|-----|----------|-----|-----------|----------|
| CDN الويب معطل | ✅ يعمل | ✅ | ✅ | ✅ |
| build الويب فاشل في CI | ✅ إصدار EAS | ✅ | ✅ | ✅ |
| API معطل | ❌ | — | ❌ | ❌ |

- لا `import` من `banco-mobile`.
- نشر الويب ≠ نشر API.
- تنبيهات مراقبة الويب **منفصلة**.

---

## 2. الأدوار والأشخاص (من يستخدم ماذا)

| # | الدور | الهدف اليومي | السطح الأساسي | السطح على الويب (هدف) |
|---|------|--------------|---------------|------------------------|
| P1 | **مشتري / متصفح** | بحث، حفظ، تواصل | موبايل | `banco-web` تصفح عام |
| P2 | **بائع فردي** | إنشاء/تعديل إعلان، متابعة أداء | موبايل | `banco-web` **مساحة عمل** `/workspace` |
| P3 | **تاجر / شركة B2B** | إعلانات جماعية، RFQ، توريد، محفظة | موبايل `business/*` + **dealer-os** | `/market/` (dealer-os) — مكتب كامل |
| P4 | **مشتري B2B (RFQ)** | طلب تسعير | موبايل `rfq/*` | `banco-web` إنشاء RFQ (W6) |
| P5 | **فريق BANCO** | إشراف، إيرادات، احتيال | **admin-os** | `/admin/` فقط — داخلي |
| P6 | **تشغيل / DevOps** | نشر، صحة، rollback | CI + runbooks | مراقبة منفصلة لكل سطح |

---

## 3. مصفوفة التغطية الشاملة

> التفاصيل سطراً بسطر في [`WEBSITE-FEATURE-MATRIX.md`](./WEBSITE-FEATURE-MATRIX.md)

### 3.1 ملخص حسب المجال

| المجال | موبايل | dealer-os | admin | banco-web (هدف نهائي) |
|--------|--------|-----------|-------|------------------------|
| **تصفح / بحث / خريطة** | ✅ | — | — | W2–W3 |
| **تفاصيل إعلان + SEO** | ✅ + share `/l/` | — | — | W2 + canonical |
| **إنشاء إعلان** | ✅ wizard كامل | ✅ sheet | — | **W5** (ويب كامل) |
| **إعلاناتي / تعديل / حذف / bump** | ✅ `listings/mine` | ✅ `/listings` | إشراف | **W5** `/workspace/listings` |
| **مقاييس البائع** | ✅ profile + analytics | ✅ dashboard | — | **W5** `/workspace` |
| **Leads** | ✅ `business/requests` | ✅ `/leads` | admin | **W5** |
| **Boost / إعلانات مدفوعة** | ✅ PromoteButton | ✅ `/ads` | admin ads | W6 (أو رابط ماركت) |
| **محفظة / اشتراك / فواتير** | ✅ | ✅ wallet/sub | admin revenue | W7 أو إبقاء ماركت/تطبيق |
| **RFQ بائع (لوحة)** | ✅ `rfq-inbox` | ⚠️ API mismatch | — | W6 + إصلاح dealer |
| **RFQ مشتري** | ✅ create/mine | — | — | W6 |
| **توريد عالمي** | ✅ | ✅ | — | W6 عرض + رابط ماركت |
| **استثمارات** | ✅ | ✅ | — | W6 |
| **شركات / موردين** | ✅ directory | ✅ company | admin users | W4 browse + W6 B2B |
| **رسائل** | ✅ | — | — | W7 أو deep link تطبيق |
| **مساعد AI** | ✅ | — | — | W7+ أو تطبيق فقط |
| **حجز يومي** | ✅ bookings | — | — | W7 |
| **استيراد CSV** | — | ✅ `/import` | — | يبقى dealer-os فقط |
| **إدارة منصة** | — | — | ✅ admin-os | لا يدخل banco-web |

### 3.2 ما يعنيه «شامل» عملياً

1. **للمستهلك:** كل ما في تبويبات الموبايل (feed، بحث، حفظ، تفاصيل) على الويب.  
2. **للبائع:** إنشاء ومتابعة الإعلانات **من المتصفح** (ليس deep link فقط).  
3. **للتاجر:** dealer-os كمكتب B2B كامل — الويب يوجّه ولا يعيد بناء الاستيراد الجماعي.  
4. **للإدارة:** admin-os منفصل — روابط من landing hub فقط.  
5. **للتشغيل:** runbooks + CI + مراقبة لكل سطح.

---

## 4. رحلات المستخدم (User Journeys)

### 4.1 مشتري — من Google إلى تواصل

```
بحث Google → /cars أو /search?q=...
  → نتائج (نفس params الموبايل)
  → /listing/[id] (JSON-LD)
  → [اختياري] تسجيل Clerk
  → حفظ / POST /v1/leads/contact
  → أو: «افتح في التطبيق» deep link
```

**APIs:** `GET /v1/search`, `GET /v1/listings/{id}`, `POST /v1/leads/contact`, `POST /v1/saves/toggle`

### 4.2 بائع فردي — إضافة إعلان ومتابعة شغله (W5)

```
تسجيل دخول (Clerk web)
  → /workspace (لوحة: مقاييس من GET /v1/me/metrics)
  → /workspace/listings (GET /v1/me/listings/manage)
  → /workspace/listings/new (معالج إنشاء — نفس POST /v1/listings)
       → POST /v1/uploads/request-url → verify → createListing
  → /workspace/listings/[id]/edit (PATCH)
  → bump / boost → POST /v1/listings/{id}/bump أو dealer boost
  → /workspace/leads (GET /v1/dealer/leads)
```

**مرجع تنفيذ موبايل:** `artifacts/banco-mobile/app/listings/create.tsx`  
**مرجع تنفيذ ماركت:** `artifacts/dealer-os/src/components/listing-form-sheet.tsx`  
**قاعدة:** نفس الـ API + `@workspace/taxonomy` — **لا نسخ** `listingCreateTaxonomy.ts` يدوياً.

### 4.3 تاجر B2B — مكتب العمل الكامل

```
banco-web → زر «بانكو ماركت» → /market/ (dealer-os)
  → dashboard (GET /v1/dealer/stats)
  → listings + bulk + import CSV
  → RFQ / global-supply / investments
  → wallet / subscription
```

**لا ننقل dealer-os داخل banco-web** — نحسّن الربط والهوية الموحدة فقط.

### 4.4 فريق BANCO

```
landing أو VPN → /admin/ (admin-os)
  → overview, moderation, revenue, fraud, monitoring...
```

**API:** `/v1/admin/*` — `is_admin` فقط.

### 4.5 تشغيل إنتاج (P6)

| نشاط | أداة / مسار |
|------|-------------|
| نشر API | `deploy/gcp/cloudbuild.deploy.yaml`, `deploy/aws/Dockerfile.api` |
| نشر ويب | CDN منفصل؛ `deploy/aws/Dockerfile.web` (landing+market+admin) + **banco-web bucket منفصل** |
| صحة API | `GET /api/healthz`, `/api/readyz` |
| صحة ويب | synthetic `GET /` + `GET /search` |
| rollback ويب | إصدار static سابق على CDN — **بدون** لمس API |
| Runbook | `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md`, `deploy/gcp/reports/06-READINESS_CHECKLIST_GONOGO.md` |
| مراقبة | `audit/production-readiness/OBSERVABILITY-RUNBOOK.md` |

---

## 5. إنشاء الإعلانات على الويب — مواصفات W5

### 5.1 لماذا ليس «deep link فقط»

المستخدم طلب تغطية **إنتاج ومتابعة وإضافة إعلانات** — dealer-os يغطي التاجر على سطح المكتب، لكن **البائع الفردي** يحتاج مساراً على `banco-web` يعادل الموبايل.

### 5.2 خطوات المعالج (مطابقة للموبايل)

| خطوة | محتوى | API |
|------|--------|-----|
| 1 | فئة (سيارات / عقار / صناعة) | taxonomy |
| 2 | وسائط (صور؛ فيديو مرحلة لاحقة) | uploads |
| 3 | مواصفات (ماركة، موقع، industrial…) | taxonomy |
| 4 | سعر / عرض | body |
| 5 | مراجعة ونشر | `POST /v1/listings` |

### 5.3 قيود مقصودة (v1 ويب)

| ميزة | v1 ويب | لاحق / تطبيق |
|------|--------|--------------|
| قص صور native | crop بسيط CSS | تطبيق |
| فيديو | اختياري W5.1 | تطبيق أفضل |
| مسودة offline | localStorage | AsyncStorage في التطبيق |
| استيراد CSV | ❌ | dealer-os `/import` |

### 5.4 متابعة الشغل (Workspace)

صفحات `/workspace/*`:

| صفحة | API | مطابق موبايل |
|------|-----|--------------|
| نظرة عامة | `GET /v1/me/metrics` | profile metrics |
| إعلاناتي | `GET /v1/me/listings/manage` | `listings/mine` |
| تحليلات | `GET /v1/dealer/analytics` | `business/analytics` |
| طلبات التواصل | `GET /v1/dealer/leads` | `business/requests` |
| صندوق RFQ | `GET /v1/rfqs` | `business/rfq-inbox` |
| المحفظة | `GET /v1/wallet` | `wallet` (W7 أو تطبيق) |

---

## 6. الهوية والبيانات المشتركة

### 6.1 هوية بصرية (من المشروع — لا اختراع جديد)

| Token | قيمة | مصدر |
|-------|------|------|
| Primary | `#E8002D` | `banco-mobile/constants/colors.ts` |
| Dark bg | `#0a0a0a` | landing |
| Fonts | Inter + Cairo | موبايل / web CSS |
| Logo | `banco-logo.png` | كل artifact |

**موجة W0.5:** `lib/design-tokens` (CSS variables + TS) — يستهلكه landing، banco-web، ويُوحّد مع dealer/admin.

### 6.2 عقود البيانات

| طبقة | حزمة |
|------|------|
| API | `lib/api-spec/openapi.yaml` → codegen |
| React | `@workspace/api-client-react` |
| تصنيفات | `@workspace/taxonomy` |
| بحث | `lib/search-contract` (W2 — استخراج من mobile `searchParams.ts`) |

### 6.3 فجوات يجب إغلاقها قبل W5

| # | فجوة | إجراء |
|---|------|--------|
| G1 | `listingCreateTaxonomy.ts` في الموبايل فقط | نقل تدريجي إلى `@workspace/taxonomy` |
| G2 | dealer RFQ page يستدعي `rfqs/mine` بينما inbox البائع `GET /v1/rfqs` | إصلاح dealer-os + توثيق |
| G3 | landing لا يستخدم api-client بعد | توصيل عند W2 |

---

## 7. هيكل monorepo (نهائي)

```
artifacts/
├── banco-mobile/      # أساسي — لا كسر
├── api-server/          # JSON + seoRoutes
├── dealer-os/           # B2B /market/
├── admin-os/            # /admin/
├── landing/             # hub خفيف /
└── banco-web/           # Next.js — شامل تدريجياً

lib/
├── taxonomy/
├── api-spec/
├── api-client-react/
├── search-contract/     # W2
└── design-tokens/       # W0.5
```

---

## 8. خارطة الموجات الكاملة

| موجة | المدة | المحتوى | معيار القبول |
|------|-------|---------|--------------|
| **W0** | 1–2 أسبوع | عزل CI، ESLint boundaries، `.env.example`، design-tokens spike | PR موبايل لا يشغّل website job |
| **W0.5** | 3–5 أيام | `lib/design-tokens` + ربط landing/dealer colors | typecheck PASS |
| **W1** | 2–4 أسابيع | scaffold `banco-web` + hubs SEO (`/`, `/cars`, `/real-estate`, `/industrial`) | Lighthouse SEO ≥ 90 |
| **W2** | 3–5 أسابيع | بحث + تفاصيل + `search-contract` + golden tests | نفس params الموبايل |
| **W3** | 2–3 أسابيع | خريطة + facets + near me | تطابق geo مع الموبايل |
| **W4** | 2 أسابيع | Clerk + حفظ + leads عامة | تصفح بدون تسجيل |
| **W5** | 4–6 أسابيع | **مساحة عمل بائع** + إنشاء/تعديل إعلان + إعلاناتي + metrics + leads | E2E: create listing على ويب |
| **W6** | 3–4 أسابيع | RFQ، global-supply، investments (عرض + إنشاء خفيف) + ربط ماركت | تكامل dealer-os |
| **W7** | لاحق | رسائل ويب، محفظة، حجز — حسب قرار منتج | اختياري |
| **W8** | لاحق | Universal links، دمج landing في banco-web، إيقاف تدريجي | لا كسر share URLs |

**كل موجة:** checklist من [`WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md`](./WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md) + rollback.

---

## 9. CI/CD والإنتاج (للفريق والوكلاء)

### 9.1 GitHub Actions (مستهدف)

| Job | يشغّل عند | يحجب الموبايل؟ |
|-----|-----------|----------------|
| `build-core` | كل push | — |
| `mobile-regression` | كل push | — |
| `api-tests` | كل push | — |
| `build-website` | path: `landing/**`, `banco-web/**`, `lib/design-tokens/**` | **لا** |
| `deploy-website-preview` | PR على مسارات الويب | **لا** |

### 9.2 متغيرات البيئة (ويب)

| متغير | استخدام |
|--------|---------|
| `NEXT_PUBLIC_API_BASE_URL` أو same-origin `/api` | API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | auth |
| `NEXT_PUBLIC_SITE_URL` | canonical |
| `NEXT_PUBLIC_MARKET_URL` | رابط dealer-os |
| `NEXT_PUBLIC_ADMIN_URL` | رابط admin (فريق فقط) |
| `NEXT_PUBLIC_APP_ANDROID_URL` / `IOS` | تحميل التطبيق |
| `WEBSITE_DEPLOY_ENABLED` | تعطيل نشر |

**ملف مرجعي:** `artifacts/landing/.env.example` (W0)

### 9.3 تقارير يحتاجها المطورون والوكلاء

| تقرير | مسار |
|--------|------|
| هذه الخطة | `audit/website/WEBSITE-MASTER-PLAN-AR.md` |
| مصفوفة الميزات | `audit/website/WEBSITE-FEATURE-MATRIX.md` |
| فصل معماري | `audit/website/WEBSITE-SEPARATION-AND-COMPATIBILITY-PLAN.md` |
| GCP Go/No-Go | `deploy/gcp/reports/06-READINESS_CHECKLIST_GONOGO.md` |
| Replit/GCP/AWS | `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md` |
| نشر متاجر | `release/STORE_PUBLISHING_GUIDE.md` |
| EAS | `release/EAS_BUILD.md` |
| جاهزية إنتاج | `audit/production-readiness/BANCO-STORE-FINAL-PRODUCTION-READINESS-REPORT.md` |

---

## 10. نقطة البداية: `artifacts/landing`

| الآن | الهدف |
|------|--------|
| دليل 3 بطاقات (تطبيق، ماركت، أدمن) | يبقى **hub** حتى W8 |
| shadcn scaffold جاهز | يُستهلك في banco-web أو يُبسَّط |
| لا API في UI | يُربط في W1 للـ feed teaser اختياري |

**البوابة `/` تعرض:**

1. دخول التصفح العام → `banco-web`
2. تحميل التطبيق
3. بانكو ماركت → `/market/`
4. لوحة التحكم (فريق) → `/admin/`

---

## 11. ممنوعات (للوكلاء)

1. ❌ import من `banco-mobile`
2. ❌ دمج UI الـ admin داخل banco-web العام
3. ❌ جداول DB للويب فقط (v1–W6)
4. ❌ كسر `/l/:id` أو روابط المشاركة
5. ❌ لمس مرآات GitHub أو مستودع «banco done»
6. ❌ جعل نجاح CI الكلي يعتمد على build الويب قبل عزل W0

---

## 12. قرارات مطلوبة للموافقة

| # | قرار | التوصية |
|---|------|---------|
| D1 | Stack الموقع الشامل | Next.js (`artifacts/banco-web`) |
| D2 | إنشاء إعلان على الويب | **نعم — W5** (ليس deep link فقط) |
| D3 | مكتب B2B | يبقى dealer-os منفصل |
| D4 | landing | hub حتى دمج W8 |
| D5 | أولوية بعد W0 | W1 SEO hubs ثم W2 بحث ثم W5 workspace |

---

## 13. الخطوة التالية

بعد موافقتك على **القسم 12**:

1. تنفيذ **W0** (عزل CI + boundaries + env example)  
2. إنشاء **`WEBSITE-FEATURE-MATRIX.md`** كمرجع حي (موجود)  
3. scaffold **`banco-web`** فارغ  
4. عند وصول ريبو التطوير — ربط remote دون كسر العزل  

---

*نسخة 2.0 — تشمل إنتاج البائعين، متابعة الشغل، إضافة الإعلانات، والتشغيل — مع الحفاظ على عزل الموبايل.*
