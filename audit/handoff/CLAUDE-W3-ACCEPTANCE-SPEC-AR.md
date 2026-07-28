# Claude — مواصفات قبول W3 (أمان FI) — مستند تنفيذي · لا كود

**من:** Claude / Fable 5 (مالك W3) · **إلى:** Cursor + المالك · **التاريخ:** 2026-07-19  
**ينفَّذ فقط بعد:** `Start W3 — Claude owns F-SEC-01/02/03 + docs/isActive. Base = origin/main after W2/#28. Go.`  
**القاعدة:** كل بند = طبقة واحدة · إضافة فحص أمان · **لا حذف ميزة** · اختبار سالب واحد على الأقل.  
**الملفات المستهدفة (نطاق W3):** `api-server/src/services/FinancingService.ts` · `UserService.ts` (بند docs) — **لا لمس لأي ملف آخر بلا إعلان.**

---

## W3-01 — AuthZ فرع الوكيل على PATCH (F-SEC-01 · OPEN-03 · Critical)

| بند | مواصفة |
|-----|--------|
| الملف/الدالة | `FinancingService.updateInstitutionRequest` |
| الضرر الحالي | الدالة تفحص `membership.intermediary_id` فقط؛ لا تعيد فحص `existing.branch_id` مقابل مقعد الوكيل عند تغيير `status`. |
| اتجاه الإصلاح | بعد جلب `existing`: إن `membership.role === "agent"` فارفض ما لم يكن `existing.branch_id === membership.branch_id` **أو** `existing.branch_id === null` (نفس منطق `listInstitutionRequests`). المالك/المدير بلا قيد فرع. |
| **الحالة السالبة (اختبار)** | seat(agent, branch=A) + طلب `branch_id=B` → `PATCH status=contacted` → **NOT_FOUND (404)** (عدم تسريب) أو **FORBIDDEN (403)**. |
| الحالة الموجبة | agent على طلب فرعه أو غير موجَّه → **200**. owner/manager على أي طلب → **200**. |
| NO-WIPE | توجيه الفرع (owner/manager) + inbox + الفلتر الحالي يبقوا كما هم. |

## W3-02 — آلة حالات الطلب (F-SEC-02 · OPEN-05)

| بند | مواصفة |
|-----|--------|
| الملف/الدالة | نفس `updateInstitutionRequest` |
| الضرر | أي عضو يقدر يرسل `contacted`/`closed` بغضّ النظر عن الحالة الحالية (بما فيه إعادة فتح `closed`). |
| اتجاه الإصلاح | خريطة انتقالات مسموحة: `forwarded → contacted` · `contacted → closed` · (اختياري `forwarded → closed`). رفض العكسي وأي قفزة غير قانونية. |
| **الحالة السالبة** | طلب `status=closed` → `PATCH status=contacted` → **INVALID_DATA (400)**. |
| الموجبة | `forwarded → contacted → closed` يمرّ. |
| NO-WIPE | `contacted`/`closed` تبقى متاحة ضمن الانتقال الشرعي فقط. |

## W3-03 — دور المالك عند الربط (F-SEC-03)

| بند | مواصفة |
|-----|--------|
| الملف/الدالة | `FinancingService.updateIntermediary` (فرع `ownerUserId`) |
| الضرر | يتحقق أن المستخدم **موجود** فقط — لا يشترط `role === "financial_institution"`. |
| اتجاه الإصلاح | عند ضبط `ownerUserId`: تحقّق أن دور المستخدم `financial_institution`؛ ارفض غيره. (**قرار المالك:** هل نشترط `is_verified` أيضاً؟ افتراضي: لا نشترطه في هذا البند حتى تقرر.) |
| **الحالة السالبة** | ربط `owner_user_id` لمستخدم دوره `individual` → **INVALID_DATA/FORBIDDEN (رفض)**. |
| الموجبة | ربط مستخدم دوره `financial_institution` → **نجاح**. |
| NO-WIPE | admin owner-link UI (#28) يبقى؛ فقط يُضاف الفحص. |

## W3-04 — منع مسح مستندات KYC (F-SEC-07 · امتثال)

| بند | مواصفة |
|-----|--------|
| الملف/الدالة | `UserService.updateUserProfile` (كتابة `companyDetails`) — **يحتاج فحصاً سطرياً أولاً** لتأكيد أنه replace كامل. |
| الضرر | إعادة بناء `companyDetails` كاملة → إرسال بيانات عمل بلا `documents` يمسح الروابط السابقة. |
| اتجاه الإصلاح | دمج (merge) حقل `documents` بدل الاستبدال الأعمى إن لم يُرسَل. |
| **الحالة السالبة** | حفظ ملف عمل بدون `documents` → المستندات السابقة **تبقى** (لا تُمسح). |
| NO-WIPE | باقي حقول `companyDetails` تُحدَّث طبيعياً. |

## W3-05 — رفض forward لوسيط غير نشط (F-SEC-05/R6 · تشغيل)

| بند | مواصفة |
|-----|--------|
| الملف/الدالة | مسار تعيين `intermediary_id` (admin forward) في `FinancingService` |
| الضرر | يتحقق من الوجود فقط لا `isActive` → إشعار يُرسل لكن العضوية ترفض لاحقاً = طلب «معلّق» بلا inbox. |
| اتجاه الإصلاح | فحص `isActive=true` عند التعيين؛ فشل واضح خلاف ذلك. |
| **الحالة السالبة** | forward لوسيط `isActive=false` → **يفشل بوضوح** (لا إشعار صامت). |
| NO-WIPE | forward لوسيط نشط يعمل + auto-handoff كما هو. |

---

## اختبارات القبول الإجمالية (تتحول لاختبارات API لاحقاً)

1. agent فرع A لا يعدّل طلب فرع B → 403/404.  
2. `closed → contacted` مرفوض.  
3. ربط owner لمستخدم غير-FI مرفوض.  
4. حفظ ملف بلا documents لا يمسحها.  
5. forward لوسيط inactive يفشل بوضوح.  
6. **NO-WIPE:** كل اختبارات `FinancingService.test` الحالية + inbox/branch/handoff تبقى **خضراء**.

## ملاحظة تغطية صادقة
تغطية FI الحالية = وسيط/upsert فقط (بند OPEN-14). W3 يضيف الاختبارات السالبة أعلاه — أول تغطية حقيقية لـinbox/AuthZ. **لن أعلن «FI آمن للإنتاج» قبل مرور الستة خضراء.**

— Claude / Fable 5 · جاهز للتنفيذ فور `Start W3`
