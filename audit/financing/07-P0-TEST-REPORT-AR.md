# تقرير 07 — فحص واختبار إصلاحات P0

**الفرع:** `cursor/fi-separation-p0-4322`  
**الالتزامات:** `9b082dc` (P0) · `3dd14bb` (إصلاح Typecheck)  
**PR:** #28  
**التاريخ:** 2026-07-19

---

## بيئة الاختبار

| العنصر | الحالة |
|--------|--------|
| تثبيت محلي (`pnpm install` / vitest) | غير متاح — egress npm محظور في بيئة الوكيل |
| CI GitHub Actions على PR #28 | مصدر الحقيقة للاختبار التنفيذي |
| مراجعة ثابتة للمسارات | منفَّذة على الكود في الفرع |

---

## نتائج CI

### قبل الإصلاح (`9b082dc`)

| الفحص | النتيجة |
|-------|---------|
| API tests (Postgres) | ✅ PASS |
| Mobile regression (static) | ✅ PASS |
| ESLint (scripts) | ✅ PASS |
| GCP config gate | ✅ PASS |
| Build consumer web | ✅ PASS |
| Typecheck & build | ❌ FAIL |

**سبب الفشل:** في `artifacts/admin-os/src/pages/financing.tsx` استدعاءات `useGetFinancingBranches` / `useGetFinancingSeats` مرّرت `{ enabled }` بدون `queryKey` المطلوب من `UseQueryOptions`.

**الإصلاح:** `3dd14bb` — إضافة `queryKey: getGetFinancingBranchesQueryKey(id)` و `getGetFinancingSeatsQueryKey(id)`.

### بعد الإصلاح (`3674de9`) — كلها خضراء

| الفحص | النتيجة |
|-------|---------|
| API tests (Postgres) | ✅ PASS |
| Mobile regression (static) | ✅ PASS |
| ESLint (scripts) | ✅ PASS |
| GCP config gate | ✅ PASS |
| Build consumer web | ✅ PASS |
| Typecheck & build | ✅ PASS |

---

## تحقق ثابت لمسارات P0

### 1) دور المؤسسة المالية (لا demotion إلى dealer)

`UserService.ts`: إذا `account_type === financial_institution` أو `activity_type === financial_institution` → `patch.role = "financial_institution"` (ما لم يكن الدور company/enterprise).

### 2) مسار Banks → Onboarding FI

- `banks.tsx`: CTA → `/business/onboarding?intent=fi`
- `onboarding.tsx`: `fiIntent` يفرض نشاط/نوع حساب FI؛ النجاح يستخدم `fiSuccess*` ويوجّه لهب البنوك

### 3) Inbox البنك + Auto-handoff

`FinancingService.ts`:

- Inbox الافتراضي: `inArray(effectiveStatus, ["forwarded", "contacted", "closed"])`
- Auto-handoff عند `status → forwarded` أو تعيين `intermediaryId` والحالة forwarded

### 4) أدمن KYC + Ops

- `company_details` (مستندات) معرّضة على AdminUser
- `users.tsx`: حوار مراجعة KYC قبل verify
- `financing.tsx`: `owner_user_id` + InstitutionOpsDialog (فروع/مقاعد) مع `queryKey` صحيح بعد `3dd14bb`

---

## ما لم يُختبر يدوياً في هذه الجلسة

لا يوجد جهاز/جلسة مستخدم حقيقية هنا. التحقق اليدوي المقترح يبقى كما في تقرير 06:

1. Register من الهب → role = `financial_institution`
2. أدمن Users → Review KYC يظهر المستندات
3. أدمن Financing → owner + branch/seat
4. Forward طلب → يظهر في inbox البنك فقط بالحالات المسموحة

---

## الخلاصة

- منطق P0 موجود ومتسق في الكود.
- عائق Typecheck أُصلح في `3dd14bb`.
- CI على `3674de9` **أخضر بالكامل** — جاهز للمراجعة/الدمج بعد التحقق اليدوي المقترح.
