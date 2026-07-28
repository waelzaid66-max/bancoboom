# تقرير 02 — مسار إنشاء حساب المؤسسة المالية (FI)

**الحالة الكلية:** PARTIAL / BROKEN في مسار Banks CTA  
**المراجع:**  
- `artifacts/banco-mobile/app/(tabs)/profile.tsx`  
- `artifacts/banco-mobile/app/business/onboarding.tsx`  
- `artifacts/banco-mobile/app/business/banks.tsx`  
- `artifacts/api-server/src/services/UserService.ts`  
- `.agents/memory/banco-business-verification.md`

---

## 1) ما المفروض يكون (حسب commits Claude)

من `06cd629` ورسالة المنتج:
- نوع حساب رابع: Individual / Business Pro / Company / **Financial Institution**
- Features التمويل مقفولة وراء verification (KYC / موافقة بنك)
- يمر عبر business onboarding

---

## 2) المسارات الموجودة فعلياً

### المسار A — من Profile (الأصح نسبياً)

1. المستخدم يختار `financial_institution` في شاشة نوع الحساب  
2. `updateMe({ account_type: "financial_institution" })`  
3. السيرفر يعيّن `role = financial_institution` (`UserService` 157–165)  
4. يوجَّه إلى `/business/onboarding`  
5. يملأ فورم الأعمال + يرفع مستندات

**حالة المسار A:** PARTIAL — الدور يتحفظ، لكن الفورم مش فورم بنكي مستقل.

### المسار B — من هب البنوك CTA (مكسور للفرد)

1. Signed-in يضغط “Register as Financial Institution”  
2. `router.push("/business/onboarding")` **مباشرة** — بدون إرسال `account_type`  
   (`banks.tsx` 486–490)  
3. Onboarding يرسل `business` فقط (activity / اسم / مدينة / مستندات)  
4. `UserService`: لو الدور الحالي مش FI/company/enterprise → **`patch.role = "dealer"`**  
   (سطور 170–181)

**النتيجة:** فرد يختار نشاط `financial_institution` في الفورم يقدر ينتهي:
- `role = dealer`
- `companyDetails.activity_type = financial_institution`

ده **فصل مكسور**: النشاط يقول بنك، الدور يقول تاجر.

`a6e945d` أصلح فقط حالة “كان FI مسبقاً واتعمل له demote” — **ما أصلحش** مسار CTA اللي ما بيعيّنش الدور أصلاً.

---

## 3) هل الفورم منفصل؟

| البند | الواقع |
|-------|--------|
| فورم FI مستقل بحقول بنكية (ترخيص، رقم سجل بنكي، نوع رخصة…) | **لا** |
| نفس onboarding الأعمال | **نعم** |
| `activity_type` يشمل `financial_institution` | **نعم** (بعد `a6e945d`) |
| حقول مشتركة | activity, business_name, owner_name, trade_name, city, phone, documents, ID photo |
| نجاح onboarding يدفع لـ `/listings/create` | **نعم** — مسار بائع، مش مسار بنك |

**الحكم:** البيانات “منفصلة” فقط بحقل نشاط + دور (لو اتضبط). **مش** رحلة منتج منفصلة للمؤسسة المالية.

---

## 4) التوثيق والموافقة

| الخطوة | موجود؟ | ملاحظات |
|--------|--------|---------|
| رفع مستندات من الموبايل | نعم | كلها في `companyDetails.documents[]` بدون metadata لكل ملف |
| حالة “قيد المراجعة” مخزّنة | لا | مشتقة: `isBusiness && !isVerified` |
| موافقة أدمن على مستندات | **ناقصة** | Users page: Verify/Unverify فقط؛ **لا يعرض المستندات** |
| حالات KYC (pending / needs_info / rejected) | لا | Boolean فقط |
| بوابة unlock للـ inbox | ربط `owner_user_id` أو seat | مش `is_verified` وحدها |

مرجع الذاكرة الرسمي:
> Admin review gap: toggles `is_verified` but does NOT render `companyDetails.documents`

---

## 5) مصفوفة الأدوار بعد التسجيل

| نقطة البداية | ماذا يرسل العميل | الدور الناتج المحتمل | هل يطابق توقع “بنك”؟ |
|--------------|------------------|----------------------|----------------------|
| Profile → FI | `account_type=financial_institution` ثم business | FI (محمي من demote) | نعم تقريباً |
| Banks CTA → onboarding | `business` فقط | غالباً **dealer** إن كان فرد | **لا** |
| فرد يكمل onboarding بنشاط بنك | activity FI بدون account_type | dealer + activity FI | **لا** |

---

## 6) الحكم

- البنية التحتية للنوع الرابع **موجودة وقوية**.  
- **الترتيب والفصل فاشلين في CTA البنوك + الفورم المشترك + شاشة النجاح البائعة**.  
- **موافقة التوثيق مش workflow موافقة** — مجرد toggle أعمى.
