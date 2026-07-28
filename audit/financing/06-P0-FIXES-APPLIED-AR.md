# تقرير 06 — إصلاحات P0 المنفَّذة (بعد التحقيق)

**الفرع:** `cursor/fi-separation-p0-4322`  
**النوع:** إصلاحات فصل/تشغيل — ليست فحص فقط

---

## ما تغيّر

| # | الإصلاح | الملفات |
|---|---------|---------|
| 1 | نشاط بنك → دور `financial_institution` حتى بدون `account_type` | `UserService.ts` |
| 2 | CTA البنوك → `onboarding?intent=fi` + إرسال `account_type` | `banks.tsx`, `onboarding.tsx` |
| 3 | نجاح FI يوجّه لهب البنوك (مش إنشاء إعلان) | `onboarding.tsx` + i18n |
| 4 | Inbox البنك: فقط `forwarded\|contacted\|closed` | `FinancingService.ts` |
| 5 | Auto-handoff يعمل في ترتيب تعيين الوسيط بعد/قبل forward | `FinancingService.ts` |
| 6 | أدمن: مراجعة KYC بالمستندات قبل Verify | `AdminService` + OpenAPI + `users.tsx` |
| 7 | أدمن: ربط `owner_user_id` + فروع + مقاعد | `financing.tsx` |

---

## ما لم يُغلق بعد (متعمد)

- دليل بنوك حي في الهب العام (ما زال بطاقات تسويقية)
- workflow نقل آمن كامل (كيان Transfer + موافقات)
- حالات KYC مخزّنة (`pending` / `rejected`) — ما زال Boolean + شاشة مراجعة
- اشتراك/باقة `financial_institution` منفصلة

---

## تحقق مقترح

1. من الهب: Register → onboarding FI → role يصبح `financial_institution`
2. أدمن Users → Review KYC يظهر المستندات
3. أدمن Financing → Edit intermediary → owner UUID → Manage → branch/seat
4. Forward طلب → يظهر في inbox البنك فقط بحالات forwarded/contacted/closed
