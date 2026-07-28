# تحقيق جنائي — البنوك والممولين / إنشاء حساب FI / نقل البيانات في الأدمن

> **تحديث:** حزمة أعمق v2 متوفرة في  
> [`00-FI-FORENSIC-MASTER-V2-AR.md`](./00-FI-FORENSIC-MASTER-V2-AR.md)  
> (آخر تعديلات Claude + كتالوج إخفاقات + مشاكل متبقية بعد فهم P0).  
> هذا الملف (v1) يبقى كخلفية تاريخية للفحص الأول.

**التاريخ:** 2026-07-19  
**النوع:** فحص فقط — لا تعديل كود  
**النطاق:** شغل Claude المتعلق بـ Banks & Financiers + FI Phase 2 + Admin Financing CRM  
**الحالة على `main` وقت الفحص:** بعد دمج website/mobile السابقة

---

## الحكم التنفيذي (سطر واحد)

الشغل **قوي في الطبقة الخلفية** (جداول + APIs + inbox بنكي + CRM أدمن)، لكنه **ناقص في الفصل والترتيب والمنتج**: الهب العام بيانات تسويقية ثابتة، مسار التسجيل يقدر يسقط البنك لـ dealer، موافقة التوثيق عمياء، وعمليات الأدمن لربط الحساب/الفروع/المقاعد **موجودة في API ومش موجودة في واجهة الأدمن**.

---

## مصفوفة الحالة

| المحور | الحالة | ملخص |
|--------|--------|------|
| دور `financial_institution` في DB/API | **DONE** | موجود ومُعرَّف |
| هب Banks & Financiers العام | **PARTIAL** | شاشة موجودة؛ المنتجات ثابتة/i18n؛ مش دليل بنوك حي |
| Inbox البنك (أعضاء المؤسسة فقط) | **DONE / PARTIAL** | UI + API حقيقيان؛ فلتر الحالة أضعف من ادعاء الكومنت |
| مسار إنشاء حساب FI منفصل | **PARTIAL / BROKEN** | خيار رابع موجود؛ CTA البنوك يتجاوز اختيار النوع ويقدر يحوّل لـ dealer |
| فورم/بيانات FI منفصلة | **PARTIAL** | نفس onboarding الأعمال + `activity_type=financial_institution`؛ مش فورم بنكي مستقل |
| موافقة توثيق (KYC) للأدمن | **MISSING / RISK** | Toggle `is_verified` فقط؛ مفيش عرض مستندات؛ مفيش حالات pending/rejected |
| فروع + مقاعد موظفين (Backend) | **DONE** | Schema + Admin API + Bank API |
| فروع + مقاعد + ربط owner (Admin UI) | **MISSING** | الـ hooks مولّدة؛ `admin-os` لا يستخدمها |
| Auto-handoff عند `forwarded` | **PARTIAL / RISK** | إشعار يعمل بشرط هش؛ ترتيب العمليات في الأدمن يقدر يفوّته |
| نقل آمن بين مؤسسات | **PARTIAL / RISK** | تغيير `intermediary_id` فقط؛ مفيش كيان transfer ولا موافقة منفصلة |
| بيانات بنوك حقيقية في الهب | **MISSING** | لا seed لـ `financing_intermediaries`؛ الهب العام مش بيستعلم دليل بنوك |

---

## سلسلة commits Claude ذات الصلة (الأهم)

| Commit | ماذا ادّعى | ما ثبت في الكود |
|--------|------------|-----------------|
| `06cd629` | نوع حساب رابع FI + gated verification | الدور موجود؛ البوابة الفعلية للـ inbox = owner/seat مش `is_verified` وحدها |
| `224ef4f` | هب Banks + CTA تسجيل | الهب + CTA موجودان؛ المنتجات static؛ CTA → onboarding مباشرة |
| `cbcd654` | Phase 2: فروع، مقاعد، auto-handoff، inbox | Backend قوي؛ Admin UI للفروع/المقاعد غائب |
| `a3820d2` | البنك يشوف النظام يعمل + ربط حساب | Inbox موبايل حقيقي؛ `owner_user_id` في API؛ الأدمن UI للربط غائب |
| `a6e945d` | إصلاح demote لـ dealer عند التوثيق | يحمي الدور **إذا كان FI مسبقاً**؛ لا يحمي مسار Banks CTA من فرد → onboarding → dealer |
| `36eec11` | توجيه فروع من inbox البنك | موجود على الموبايل للـ owner/manager |
| `83e93cc` | `branch_id` على FinancingRequest | موجود في الـ sidecar |

---

## ملفات التقارير التفصيلية

1. [`01-BANKS-HUB-REAL-DATA-AR.md`](./01-BANKS-HUB-REAL-DATA-AR.md) — الهب والبيانات الحقيقية  
2. [`02-FI-ACCOUNT-CREATION-PATH-AR.md`](./02-FI-ACCOUNT-CREATION-PATH-AR.md) — مسار إنشاء الحساب والفورم والتوثيق  
3. [`03-ADMIN-SAFE-TRANSFER-AR.md`](./03-ADMIN-SAFE-TRANSFER-AR.md) — عمليات الأدمن والنقل الآمن  
4. [`04-CLAIMS-VS-REALITY-MATRIX-AR.md`](./04-CLAIMS-VS-REALITY-MATRIX-AR.md) — ادعاءات Claude مقابل الواقع  
5. [`05-SEPARATION-FAILURES-AR.md`](./05-SEPARATION-FAILURES-AR.md) — إخفاقات الفصل والترتيب  

---

## ما لم يُنفَّذ في هذا الفحص

- لا تعديل كود  
- لا deploy  
- لا إصلاح demote / Admin UI / inbox filter  

---

## أولويات الإصلاح المقترحة (عند الطلب فقط)

1. **P0 فصل:** مسار Banks CTA يفرض `account_type=financial_institution` قبل/مع onboarding  
2. **P0 توثيق:** شاشة أدمن تعرض `companyDetails.documents` قبل Verify  
3. **P0 تشغيل:** UI أدمن لـ `owner_user_id` + branches + seats  
4. **P1 أمان:** inbox يشترط حالات `forwarded|contacted|closed` فقط  
5. **P1 منتج:** دليل بنوك حي أو إزالة وهم “بيانات حقيقية” من الهب العام  
6. **P2:** كيان/workflow نقل آمن بين مؤسسات مع تأكيد + audit إلزامي  
