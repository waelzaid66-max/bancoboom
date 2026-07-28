# تقرير 03 — الأدمن: CRM التمويل ونقل البيانات بأمان

**الحالة الكلية:** PARTIAL / RISK  
**الملفات:**  
- `artifacts/admin-os/src/pages/financing.tsx`  
- `artifacts/admin-os/src/pages/users.tsx`  
- `artifacts/api-server/src/services/FinancingService.ts`  
- `artifacts/api-server/src/routes/v1/admin.ts`  
- OpenAPI: `/v1/admin/financing/*` و `/v1/financing/inbox*`

---

## 1) ما يعمل فعلياً في واجهة الأدمن (حقيقي، مش shell)

| عملية | UI | API | Auth | Audit |
|-------|----|-----|------|-------|
| قائمة طلبات التمويل | نعم | `GET .../financing/requests` | `manage_financing` | قراءة |
| تغيير حالة الطلب | نعم (select فوري) | PATCH | نعم | `financing_request_update` |
| تعيين وسيط/مؤسسة | نعم (select فوري) | PATCH `intermediary_id` | نعم | نعم |
| ملاحظات CRM | نعم | PATCH notes | نعم | نعم |
| تصدير CSV | نعم | export endpoint | نعم | يشمل PII مشترٍ |
| CRUD وسطاء (اسم/إيميل/هاتف/نشط) | نعم | intermediaries CRUD | نعم | نعم |

**الحكم:** CRM الأساسي **تشغيلي وحقيقي** على DB.

---

## 2) ما ادّعاه Phase 2 ولم يظهر في Admin UI

| قدرة Backend/OpenAPI | موجودة في API؟ | موجودة في `admin-os`؟ |
|----------------------|----------------|------------------------|
| ربط `owner_user_id` بحساب FI | نعم | **لا** — لا matches في `admin-os/src` |
| إنشاء/عرض فروع | نعم | **لا** |
| إنشاء/عرض مقاعد موظفين | نعم | **لا** |
| Generated hooks للفروع/المقاعد | نعم (`api-client-react`) | **غير مستخدمة** |

بدون ربط owner من الأدمن، **auto-handoff والـ inbox البنكي لا يشتغلان في الإنتاج** حتى لو الكود جاهز.

---

## 3) “نقل آمن للبيانات” — ماذا يوجد؟

### الموجود
- تغيير `financing_requests.intermediary_id` (إعادة توجيه لمؤسسة أخرى)
- تغيير `branch_id` من طرف البنك (owner/manager)
- سجل audit metadata على أغلب Mutations
- صلاحية `manage_financing` على مسارات الأدمن
- عضوية المؤسسة على مسارات البنك (غير العضو → FORBIDDEN / NOT_FOUND)

### غير الموجود (فجوة أمان/تشغيل)
| متطلب “نقل آمن” | الواقع |
|-----------------|--------|
| كيان Transfer منفصل (من → إلى، سبب، موافقة) | لا |
| تأكيد مزدوج قبل النقل | لا — select فوري في UI |
| تاريخ تسليم immutable | لا — audit عام async فقط |
| منع النقل لو الطلب closed | غير موثّق كقاعدة صارمة في UI |
| موافقة المؤسسة المستقبِلة | لا |
| فشل العملية لو فشل الـ audit | لا — `setImmediate` best-effort |

**الخلاصة:** فيه “تغيير تعيين” محمي بصلاحية، **مش** workflow نقل آمن بالمعنى التشغيلي/الامتثالي.

---

## 4) مخاطر محددة (مثبتة)

### R1 — Auto-handoff هش
الإشعار للمؤسسة يطلق فقط عندما `status` يصبح `forwarded` **وفي نفس التحديث** يوجد intermediary فعّال.  
لو الأدمن: عيّن المؤسسة أولاً → ثم لاحقاً غيّر الحالة (أو العكس بترتيب خاطئ في تحديثين)، الإشعار قد **يُفوَّت**.

### R2 — Inbox أوسع من الادعاء
الكومنت يقول: فقط الطلبات اللي Banco عملها forward.  
الاستعلام يشترط `intermediaryId` فقط؛ فلتر الحالة اختياري.  
→ طلب معيّن بحالة `new` أو حتى `rejected` **ممكن يظهر** في inbox البنك.

### R3 — Verify أعمى
`users.tsx` يقلب `is_verified` بدون عرض مستندات KYC.

### R4 — CSV فيه بيانات حساسة
التصدير يشمل اسم/هاتف المشتري وملاحظات — يحتاج ضوابط تشغيل (من يستخرج؟ أين يُخزَّن؟).

### R5 — لا تأكيد قبل Reject/Forward
تغيير الحالة من الـ select ينفّذ فوراً.

---

## 5) نموذج البيانات الحقيقي

| الاسم الشائع | الجدول الفعلي |
|--------------|----------------|
| Institution | `financing_intermediaries` (+ اختياري `owner_user_id`) |
| Branch | `financing_branches` |
| Employee | `financing_seats` (manager/agent) |
| Finance request | `lead_history` (`action_type=finance_request`) + sidecar `financing_requests` |
| Terms | `payment_options` mode `bank_finance` |

لا يوجد جدول اسمه `institutions`.

---

## 6) الحكم

| الطبقة | الحكم |
|--------|-------|
| API أدمن Phase 2 | DONE تقريباً |
| UI أدمن Phase 2 (ربط/فروع/مقاعد) | **MISSING** — أكبر فجوة تشغيل |
| CRM الطلبات | DONE / PARTIAL (بدون تأكيدات) |
| نقل آمن | PARTIAL / RISK |
| توثيق FI من الأدمن | MISSING / RISK |
