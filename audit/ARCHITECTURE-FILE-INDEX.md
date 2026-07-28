# فهرس البنية والملفات — BANCO OOM

**آخر تحديث:** 2026-07-10  
**الفرع المرجعي للموبايل:** `fix/mobile-master-stabilize` @ `d919ca5`  
**القاعدة:** هذا الفهرس يصف **ما يوجد** و**من يعتمد على من** — ليس قائمة مهام عشوائية.

---

## 0) مصدر الحقيقة الواحد (اقرأ بالترتيب)

| # | ملف | متى تقرأه |
|---|-----|-----------|
| 1 | [`mobile/MOBILE-PUBLISH-SUCCESS-GATE.md`](./mobile/MOBILE-PUBLISH-SUCCESS-GATE.md) | أي قرار نشر متجر |
| 2 | [`mobile/ARCHITECTURE-DEEP-UNDERSTANDING-AR.md`](./mobile/ARCHITECTURE-DEEP-UNDERSTANDING-AR.md) | فهم الطبقات L0–L7 |
| 3 | [`maintenance/MASTER-MAINTENANCE-READINESS-PLAN.md`](./maintenance/MASTER-MAINTENANCE-READINESS-PLAN.md) | موجات الصيانة التاريخية + المتبقي |
| 4 | [`production-readiness/FULL-READINESS-STATUS-PLAN.md`](./production-readiness/FULL-READINESS-STATUS-PLAN.md) | نسبة الجاهزية الصادقة |
| 5 | [`production-readiness/OPEN-ITEMS-BACKLOG.md`](./production-readiness/OPEN-ITEMS-BACKLOG.md) | ما بقي مفتوحاً فقط |

**بوابة محلية (بدون أسرار):** `pnpm run confidence` → `scripts/production-confidence-check.mjs`

---

## 1) طبقات الكود (L0 → L2)

### L0 — عقود ومخطط (لا HTTP)

| مسار | يملك | يعتمد على |
|------|------|-----------|
| `lib/search-contract/` | `SearchCriteria`, `buildSearchParams`, engines, CLEAR, map params | taxonomy |
| `lib/taxonomy/` | 4 شركات UI → 3 API cats + industrial groups | — |
| `lib/api-spec/openapi.yaml` | مسارات `/v1/*` الرسمية | — |
| `lib/api-client-react/` | عميل مولّد من OpenAPI | api-spec |
| `lib/db/` | Drizzle schema, migrations, `ensureSchemaPatches` | — |
| `lib/design-tokens/` | ألوان/خطوط مشتركة (ويب) | — |

### L1 — API (مصدر الحقيقة)

| مسار | يملك | لا يستورد |
|------|------|-----------|
| `artifacts/api-server/src/services/SearchService.ts` | بحث، خريطة، autocomplete، material gate | mobile/web |
| `artifacts/api-server/src/controllers/searchController.ts` | parse موحّد list/map | — |
| `artifacts/api-server/src/services/feedVisibility.ts` | C-03 رؤية عامة | — |
| `artifacts/api-server/src/services/uploadClaims.ts` | C-01 claims | — |
| `artifacts/api-server/src/validators/schemas.ts` | `INDUSTRIAL_SUBTYPES`, enums | — |

### L2 — عملاء

| مسار | دور | عقد مشترك |
|------|-----|-----------|
| `artifacts/banco-mobile/` | تطبيق المتجر (أولوية) | search-contract, api-client-react, taxonomy |
| `artifacts/banco-web/` | parity ويب consumer (غير حاجز) | نفس العقد |
| `artifacts/admin-os/` | إدارة | api-client |
| `artifacts/dealer-os/` | بائع | api-client |
| `artifacts/landing/` | دليل/هبوط | منفصل |

**ملفات موبايل حرجة للعزل:**

| ملف | دور |
|-----|-----|
| `app/(tabs)/search.tsx` | criteria، خريطة، autocomplete، تبديل الشركات |
| `components/search/FilterSheet.tsx` | فلاتر متقدمة، سنوات، تقسيط |
| `components/search/SearchResultsMap.tsx` | خريطة، bookable RE-only |
| `components/SearchDiscover.tsx` | Discover، CTA خريطة |
| `tests/lib-hardening.test.mjs` | إثباتات عزل ثابتة |

---

## 2) طبقة التدقيق (`audit/`)

### موبايل — بوابات وإثباتات

| ملف / سكربت | دور |
|-------------|-----|
| `mobile/MOBILE-STABILIZE-PROGRESS.md` | سجل M01–M31 |
| `mobile/SECTION-ISOLATION-STRICT-2026-07-10.md` | عزل حقل/زر/خريطة |
| `mobile/FULL-DEEP-VERIFICATION-2026-07-10.md` | أدلة اختبار |
| `mobile/LIVE-DEPLOY-PROBE.md` | STALE vs FRESH |
| `mobile/NEXT-OPS-REPLIT-REDEPLOY.md` | redeploy تشغيلي |
| `mobile/scripts/proof-isolation.mjs` | فحص تسرّبات بين الشركات |
| `mobile/scripts/proof-create-fields.mjs` | حقول إنشاء ↔ تصنيف |
| `mobile/scripts/probe-live-deploy.mjs` | exit 0/2 freshness |
| `mobile/scripts/pre-redeploy-code-gate.mjs` | static branch signals قبل redeploy |
| `mobile/scripts/post-redeploy-verify.mjs` | سلسلة بعد redeploy |
| `mobile/scripts/ops-next-step.mjs` | code gate + probe + تعليمات |

### صيانة تاريخية (`maintenance/`)

| موجة | ملف |
|------|-----|
| 1 | `WAVE-1-UPLOAD-CI-EAS.md` |
| 2 | `WAVE-2-SEARCH-INDUSTRIAL.md` |
| 3 | `WAVE-3-SEARCH-RE-EAS.md` |
| 4 | `WAVE-4-SEARCH-TAXONOMY.md` |
| 5 | `WAVE-5-SEARCH-GEO-MAPS.md` |
| R1 | `WAVE-R1-FURNISHED-RENTAL-HUB.md` |
| B0–B4 | `WALLET-BILLING-FINANCE-AUDIT.md`, `WAVE-B1…B4` |
| Mobile stabilize | `WAVE-MOBILE-STABILIZE-ISOLATION.md` |

### جاهزية إنتاج (`production-readiness/`)

21 تقرير `PHASE-*.md` — فهرس في [`production-readiness/README.md`](./production-readiness/README.md).

### أمان (`fixes/`)

`C-01-upload-idor.md`, `C-02-like-wildcard.md`, `C-03-deleted-users-visibility.md`, `H-03-acl-owner-clerk-id.md`

### موقع (`website/`)

تخطيط فقط — **لا يحجب الموبايل** (O17 SKIP).

---

## 3) سكربتات التشغيل (`scripts/`)

| سكربت | يحتاج أسرار | دور |
|--------|-------------|-----|
| `production-confidence-check.mjs` | لا | بوابة محلية شاملة |
| `staging-p0-smoke.mjs` | نعم | JWT + API حي |
| `verify-upload-claims-schema.mjs` | DATABASE_URL | جدول C-01 |
| `verify-gcp-docker-build-config.mjs` | لا | scaffold GCP |
| `website-*` | اختياري | CI ويب منفصل |

---

## 4) نشر (`deploy/`)

| مسار | دور |
|------|-----|
| `deploy/aws/Dockerfile.banco-web` | حاوية ويب |
| `deploy/gcp/` | scaffold GCP (موثّق في WAVE-P2) |

**Replit الحالي:** `https://banco-ca-oom.replit.app` — قد يكون **STALE** حتى redeploy الفرع.

---

## 5) ذاكرة الوكلاء (`.agents/memory/`)

| ملف | محتوى |
|-----|--------|
| `banco-category-grouping.md` | 4 شركات → 3 API + industrial_type |

---

## 6) اتجاه الاعتماديات (ممنوع عكسه)

```
banco-mobile / banco-web
        ↓
search-contract → taxonomy + api-client-react
        ↓ HTTP
api-server → lib/db
```

---

## 7) ما يُغلق بالكود vs ما يبقى OPS

| مغلق (L1–L2) | مفتوح (L3+) |
|--------------|-------------|
| M01–M31 + عزل strict `d919ca5` | Redeploy Replit |
| P0 أمان | staging smoke |
| proofs + 34 mobile + 33 contract | Device QA |
| | EAS / متاجر |

---

*عند إضافة ملف معماري جديد: حدّث هذا الفهرس + المرجع في MASTER §5.*
