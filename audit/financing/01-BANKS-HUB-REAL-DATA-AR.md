# تقرير 01 — هب البنوك والممولين: بيانات حقيقية أم واجهة؟

**الحالة الكلية:** PARTIAL  
**الملف الرئيسي:** `artifacts/banco-mobile/app/business/banks.tsx`  
**الدخول:** `SearchDiscover` → `router.push("/business/banks")`

---

## 1) ماذا يظهر للمستخدم العام؟

| عنصر | مصدر البيانات | حقيقي؟ |
|------|----------------|--------|
| عنوان/وصف الهب | i18n | نصوص فقط |
| 4 بطاقات منتجات (عقار / سيارات / أعمال / شخصي) | ثابت `PRODUCTS[]` في الكود (سطور 42–63) | **لا** — تسويق hardcoded |
| CTA “سجّل كمؤسسة مالية” | يوجّه لـ onboarding أو Profile | مسار حقيقي، بيانات بنوك لا |
| Inbox الطلبات | `GET /v1/financing/inbox` | **نعم** — لكن فقط لأعضاء مؤسسة مربوطة |

**الخلاصة:** الهب العام **مش دليل بنوك حي**. لا يوجد استعلام لقائمة `financing_intermediaries` على الموبايل العام.

---

## 2) متى تظهر بيانات حقيقية؟

فقط إذا المستخدم:
1. حسابه مربوط كـ `financing_intermediaries.owner_user_id`، **أو**
2. عنده صف في `financing_seats`

عندها `InstitutionInboxSection` يستدعي:
- `useGetInstitutionInbox({ limit: 30 })` — تحديث كل 30 ثانية
- `useUpdateInstitutionRequest()` — contacted / closed / branch

Backend: `FinancingService.listInstitutionRequests`  
الجداول: `lead_history` + `financing_requests` + `listings` + `users` + فروع المؤسسة

---

## 3) بيانات seed مقابل إنتاج

| مصدر | ماذا فيه | هل يغذّي الهب؟ |
|------|----------|----------------|
| `api-server/src/seed.ts` — `BANK_FINANCE_PARTNERS` وغيرها | أسماء شركاء داخل `payment_options` على إعلانات تجريبية | لا — دي خطط تمويل على listing مش دليل بنوك |
| `financing_intermediaries` | دليل أدمن؛ لا seed إدراج وُجد في الفحص | يغذّي CRM الأدمن + inbox بعد الربط فقط |
| خطة `bank_featured` في seed | `audience: "company"` مش `financial_institution` | لا تناسب FI |

---

## 4) الفجوة مع توقع “بيانات حقيقية”

| التوقع | الواقع |
|--------|--------|
| قائمة بنوك/ممولين حقيقية في القسم | غير موجودة في الهب العام |
| منتجات تمويل لكل بنك | بطاقات ثابتة واحدة لكل الأنواع |
| البنك يشوف طلبات حقيقية | نعم — بعد ربط owner/seat + forward من الأدمن |
| الزائر يشوف “طبيعة” السوق البنكي | يرى صفحة تسويقية + inbox مخفي |

---

## 5) الحكم

- **مش وهم كامل:** طبقة الطلبات البنكية حقيقية end-to-end بعد الربط.  
- **مش منتج مكتمل:** القسم العام يبدو كبوابة بنوك بينما بياناته التسويقية ثابتة ولا يوجد دليل مؤسسات حي.
