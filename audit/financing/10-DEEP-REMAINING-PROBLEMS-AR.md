# تقرير 10 — المشاكل الحقيقية المتبقية (فهم عميق + أدلة)

**النوع:** فحص فقط  
**الطبقات:** (1) ما على `main` الآن · (2) ما يغلقه PR #28 · (3) ما يبقى حتى بعد الدمج  

---

## 0) كيف تقرأ هذا التقرير

- **مشكلة حقيقية** = تكسر رحلة مستخدم، أمان، امتثال، أو تشغيل أدمن — ليس ذوق UI.  
- **ليست مشكلة** = سلوك موثّق متعمد (مثل agent يرى الطلبات غير الموجَّهة).  
- أدلة المسارات نسبية لجذر المستودع على `main` ما لم يُذكر غير ذلك.

---

## 1) مشاكل Critical ما زالت على `main` (قبل دمج P0)

### C1 — مسار تسجيل البنك يُنتج dealer
- **الملف:** `artifacts/banco-mobile/app/business/banks.tsx` (~489) → `router.push("/business/onboarding")`
- **السلسلة:** فرد → CTA → onboarding يرسل `business` غالباً بلا `account_type` → `UserService` يضع `dealer` (ما لم يكن الدور مرتفعاً مسبقاً)
- **الأثر:** بنك يعمل تحت دور بائع؛ فصل الحسابات ينهار
- **P0:** يُغلق بـ `intent=fi` + فرض `account_type`

### C2 — لا تشغيل أدمن لـ Phase 2 على main
- **API موجود:** branches/seats/owner  
- **Admin UI:** `financing.tsx` على main **لا** يستدعي `useGetFinancingBranches` / seats / owner
- **الأثر:** auto-handoff والإشعارات لا تصل لبشر حقيقيين إلا بتعديل DB/API يدوي
- **P0:** يضيف UI أساسي (ما زال UUID خام)

### C3 — KYC أعمى على main
- Verify = `is_verified` boolean بدون مستندات في الواجهة
- **P0:** يعرض `company_details.documents` قبل التبديل

---

## 2) مشاكل Critical/High تبقى حتى بعد دمج P0

### R1 — AuthZ: الوكيل يتجاوز نطاق الفرع على PATCH  ⟵ جديد في العمق v2

**المشكلة:**  
`listInstitutionRequests` يقيّد الوكيل بفرعه (+ غير الموجَّه).  
`updateInstitutionRequest` عند تغيير **status** لا يعيد فحص `branch_id` مقابل مقعد الوكيل.

**الدليل:**
```ts
// list — يقيّد الوكيل
if (membership.role === "agent" && membership.branch_id) { ... }

// update — فقط intermediary + (فرع عند تغيير branchId)
if (!existing || existing.intermediary_id !== membership.intermediary_id) NOT_FOUND
if (params.status !== undefined) set.status = params.status  // بلا فحص فرع
```
`artifacts/api-server/src/services/FinancingService.ts` (~636–642 list · ~685–691 update)

**سيناريو الهجوم/الخطأ:** وكيل فرع A يعرف `leadId` لطلب موجَّه لفرع B → يستدعي PATCH `contacted`/`closed` بنجاح → يلمس بيانات مشتري (اسم/هاتف) خارج نطاقه.

**لماذا لم يُغلق في P0:** P0 ركّز فصل تسجيل + UI أدمن + فلتر list؛ لم يراجع AuthZ PATCH.

---

### R2 — لا آلة حالات (state machine) لطلبات البنك

أي عضو مؤسسة يستطيع إرسال `contacted` أو `closed` بغض النظر عن الحالة الحالية (بما فيها إعادة فتح `closed`).  
الـ Zod يقيّد القيم المسموحة فقط، لا الانتقالات.

**الأثر:** فوضى CRM بنكي، تقارير كاذبة، إمكانية العبث بعد الإقفال.

---

### R3 — الحلقة التشغيلية: التوثيق ≠ الربط ≠ الظهور في inbox

```
[تسجيل FI] → [رفع مستندات] → [أدمن Verify]
        │
        └── لا شيء من هذا ينشئ intermediary أو يضبط owner_user_id

[أدمن Financing: لصق UUID] → [inbox يظهر]
```

**ادّعاءات مضلِّلة:**
- تعليق `profile.tsx` / `UserService`: الميزات مقفولة حتى التوثيق  
- نسخ `fiSuccessBody`: بعد التوثيق ستُربَطوا  

**الواقع:** البوابة = عضوية (`owner_user_id` أو seat) فقط — **بدون** `is_verified`.

**حتى بعد P0:** تظهر المستندات، لكن Verify ما زال لا يكمل الربط.

---

### R4 — ربط owner/seat هش بشرياً

| فجوة | تفاصيل |
|------|--------|
| UUID خام | لا picker / بحث مستخدم |
| Users لا يعرض id | يعرض `account_number`؛ البحث لا يشمل UUID |
| Owner عند Edit فقط (P0) | إنشاء وسيط جديد ثم edit منفصل |
| لا unique على owner | نفس المستخدم يملك أكثر من وسيط → `.limit(1)` عشوائي نسبياً |
| لا delete seat/branch | خطأ تعيين مقعد = دائم حتى تدخل DB |

---

### R5 — مسح مستندات KYC عند إعادة حفظ الملف

`UserService` يعيد بناء `companyDetails` كاملة. إن أُرسلت بيانات عمل بدون مصفوفة `documents`، تُفقد الروابط السابقة.

**الأثر:** امتثال — وثائق اختفت بعد «تحديث بيانات».

---

### R6 — Forward لوسيط غير نشط

تعيين `intermediary_id` يتحقق من الوجود فقط، لا `isActive`.  
العضوية لاحقاً ترفض غير النشط → إشعارات قد تُرسل / طلب «معلّق» بلا inbox.

---

### R7 — الهب العام ما زال brochure

- `PRODUCTS` ثابتة في `banks.tsx`  
- لا استعلام `financing_intermediaries` للمستهلك  
- لا seed لمؤسسات  
- نسخ «شركاء موثّقون» + chevrons ميتة  

**هذا ليس باقٍ من سهو صغير — هو فجوة منتج مركزية** إن كان الوعد «دليل بنوك».

---

### R8 — لا كيان «نقل آمن»

الموجود: تغيير `intermediary_id` / `branch_id` + audit metadata اختياري.  
المفقود: طلب نقل، موافقة الطرف المستلم، سبب إلزامي، منع النقل بعد closed، سجل تسليم غير قابل للتلاعب، فشل الإشعار = فشل العملية (حالياً fire-and-forget).

---

### R9 — اشتراك / باقة FI

- OpenAPI يقبل audience FI (بعد `4e5ccf6`)  
- Seed: `bank_featured` → `company`  
- `SubscriptionService.BUSINESS_ROLES` = dealer/company/enterprise فقط  

مؤسسة مالية بلا مسار baseline اشتراك متماسك.

---

### R10 — اختبارات Phase 2 شبه غائبة

`FinancingService.test.ts`: CRUD وسيط + upsert طلب + not-found.  
**صفر** لـ: inbox، seats، branches، handoff، agent AuthZ، inactive intermediary.

---

### R11 — فجوات UX موبايل بعد العضوية

| فجوة | أثر |
|------|-----|
| لا مدخل Inbox من البروفايل | موظف لا يكتشف السطح |
| Join CTA دائم | ضوضاء فوق inbox |
| إخفاء أخطاء غير 403 | تشخيص صعب |
| لا cursor/filter في UI | لا يتوسّع مع الحجم |
| Profile FI بلا `intent=fi` | مسار ثانٍ أضعف من الهب (حتى بعد P0) |

---

## 3) مصفوفة «قبل / بعد P0 / متبقي»

| المشكلة | main | بعد #28 | متبقي؟ |
|---------|------|---------|--------|
| CTA→dealer | مكسور | يُصلح | — |
| نجاح→إنشاء إعلان | مكسور | يُصلح | — |
| Inbox status default ضعيف | جزئي | يُصلح | — |
| Handoff ترتيب | جزئي | يُصلح | — |
| Admin owner/branches/seats UI | غائب | أساسي | تحسين اكتشاف |
| KYC docs UI | غائب | موجود | workflow حالات |
| Agent PATCH scope | مكسور | لم يُمس | **نعم** |
| State machine | غائب | لم يُمس | **نعم** |
| Verify→link | غائب | لم يُمس | **نعم** |
| دليل بنوك حي | غائب | لم يُمس | **نعم** |
| Safe transfer | غائب | لم يُمس | **نعم** |
| FI subscription | ناقص | لم يُمس | **نعم** |
| Docs wipe | موجود | لم يُمس | **نعم** |
| اختبارات Phase 2 | ضعيفة | لم تُمس | **نعم** |

---

## 4) أولويات مقترحة للإصلاح لاحقاً (تجهيز — لا تنفيذ هنا)

### P0 (أمان/فصل متبقٍ)
1. فرض نطاق فرع الوكيل على **كل** تحديثات inbox (status + قراءة تفصيلية إن وُجدت)  
2. آلة حالات: `forwarded→contacted→closed` فقط (+ رفض العكس)  
3. (إن لم يُدمَج بعد) دمج PR #28 كما هو

### P1 (تشغيل/امتثال)
4. عند Verify لمؤسسة: wizard ربط owner أو إنشاء intermediary  
5. User picker بدل UUID؛ عرض id/account في Users  
6. منع مسح documents؛ دمج لا استبدال أعمى  
7. رفض forward لوسيط `!isActive`  
8. اشتراط `role=financial_institution` (+ اختياري verified) عند owner/seat  
9. PATCH/DELETE للفروع والمقاعد  

### P2 (منتج)
10. دليل بنوك حي أو إزالة وهم الشركاء من الهب  
11. كيان نقل آمن  
12. باقة/baseline FI + إدراج الدور في Subscription  
13. مدخل Inbox في البروفايل؛ إخفاء Join للأعضاء  
14. اختبارات تكامل Phase 2 + AuthZ  

---

## 5) ما ليس مشكلة حقيقية (تجنّب إيجابيات كاذبة)

| ملاحظة | لماذا ليست باقاً |
|--------|------------------|
| Agent يرى الطلبات غير الموجَّهة | موثّق في الكومنت كتصميم |
| CRM الأدمن بالإنجليزية جزئياً | جودة i18n لا تكسر الرحلة |
| Auto-handoff fire-and-forget | متعمد حتى لا يفشل فعل الأدمن — لكنه يضعف «النقل الآمن» كمنتج منفصل |
| بطاقات PRODUCTS كـ marketing فقط | مشكلة منتج إن وُعدت كدليل؛ إن قُبلت كـ brochure تصبح مقبولة بعد تصحيح النسخ |

---

## 6) الخلاصة العميقة

الطبقة التي بناها Claude **قوية كوسيط CRM + inbox عضوية**.  
الطبقة التي انهارت هي **الصدق التشغيلي**: الواجهة تعد بتوثيق وشركاء وربط تلقائي، بينما النظام الحقيقي يحتاج أدمن يلصق UUID، والوكيل يستطيع تجاوز فرعه على PATCH، ولا يوجد نقل آمن ولا دليل حي.

P0 (Cursor) يغلق أسوأ فجوات **الفصل الظاهرة** ويفتح تشغيل أدمن أساسي.  
**لا يغلق** أمان الوكيل، ولا آلة الحالات، ولا الجسر Verify→Link، ولا الدليل العام، ولا الاشتراك، ولا النقل الآمن.
