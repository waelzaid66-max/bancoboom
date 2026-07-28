# تقرير 04 — ادعاءات Claude مقابل الواقع

**منهج:** كل صف = ادعاء من رسالة commit أو ذاكرة منتج → تحقق كود → حكم.

---

## A) الحسابات والهوية

| # | الادعاء | الدليل المزعوم | الواقع | الحكم |
|---|---------|----------------|--------|-------|
| A1 | نوع حساب رابع FI | `06cd629` | enum + openapi + profile chooser موجودون | **DONE** |
| A2 | Features مقفولة وراء KYC | نفس الـ commit | Inbox يُقفل بعضوية intermediary/seat؛ `is_verified` منفصل وضعيف في الأدمن | **PARTIAL** |
| A3 | Onboarding لا ينزّل FI لـ dealer | `a6e945d` | صحيح **إذا الدور FI مسبقاً**؛ مسار Banks CTA يكسر التوقع | **PARTIAL** |
| A4 | نشاط “بنك” صادق في الفورم | `a6e945d` | `activity_type=financial_institution` موجود | **DONE** |

---

## B) هب البنوك

| # | الادعاء | الواقع | الحكم |
|---|---------|--------|-------|
| B1 | بوابة Banks & Financiers | `/business/banks` موجودة | **DONE** |
| B2 | منتجات تمويل | 4 بطاقات static من i18n | **PARTIAL** (مش بيانات بنوك) |
| B3 | تسجيل كمؤسسة | CTA موجود؛ يتجاوز تعيين النوع | **BROKEN ترتيب** |
| B4 | البنك يشوف النظام يعمل | Inbox حقيقي بعد الربط | **DONE** مشروط |

---

## C) Phase 2 تمويل

| # | الادعاء (من `cbcd654`) | الواقع | الحكم |
|---|------------------------|--------|-------|
| C1 | فروع institutions | جدول + API | **DONE** backend |
| C2 | مقاعد موظفين | جدول + API | **DONE** backend |
| C3 | Auto-handoff عند forward | إشعار in-app؛ شرط هش | **PARTIAL / RISK** |
| C4 | Inbox فقط الطلبات forwarded | فلتر intermediary؛ الحالة اختيارية | **PARTIAL** (أضعف من الادعاء) |
| C5 | Admin branches/seats | API نعم؛ UI أدمن لا | **PARTIAL** |
| C6 | ربط حساب FI بالوسيط | `owner_user_id` في API؛ UI أدمن لا | **PARTIAL** |
| C7 | توجيه فرع من البنك | UI موبايل owner/manager | **DONE** bank-side |

---

## D) رحلة طلب التمويل

| # | الخطوة | الواقع | الحكم |
|---|--------|--------|-------|
| D1 | مشتري يطلب تمويل من الإعلان | `contactLead(finance_request)` | **DONE** |
| D2 | حفظ خطة/ملاحظة المشتري المختارة | UX فقط؛ لا تُمرَّر لـ trackLead | **MISSING** |
| D3 | أدمن يراجع المخاطر | CRM list/status | **PARTIAL** (مفيش شاشة risk منفصلة) |
| D4 | Forward → إشعار البنك | مشروط | **PARTIAL** |
| D5 | بنك contacted/closed | موجود | **DONE** |

---

## E) ما يُحسب كـ “شغل قوي فعلاً”

1. Schema إضافي نظيف (intermediaries / branches / seats / sidecar)  
2. OpenAPI + zod + generated clients متزامنة نسبياً  
3. Inbox بنكي حي على الموبايل مع أدوار owner/manager/agent  
4. CRM أدمن للطلبات حقيقي (مش mock)  
5. إصلاح demote الحقيقي في `a6e945d`  
6. إشعارات deep-link إلى `/business/banks`

---

## F) ما يُحسب كـ “إخفاق فصل/ترتيب”

1. هب عام يبدو “سوق بنوك” وهو تسويق ثابت  
2. CTA تسجيل لا يضبط نوع الحساب  
3. فورم واحد لكل الأعمال بما فيها البنوك  
4. نجاح onboarding يدفع لإنشاء إعلان بيع  
5. أدمن لا يشغّل Phase 2 (ربط/فروع/مقاعد) رغم جاهزية الـ API  
6. Verify بدون مستندات  
7. “نقل آمن” = تغيير حقل بدون workflow

---

## نسبة إنجاز تقديرية (منتج، مش سطور كود)

| طبقة | تقدير |
|------|-------|
| Backend FI Phase 2 | ~85% |
| Mobile bank inbox | ~80% |
| Mobile public banks hub | ~40% |
| FI onboarding journey | ~45% |
| Admin operability Phase 2 | ~25% |
| Safe transfer / compliance | ~20% |
| KYC approval workflow | ~15% |
