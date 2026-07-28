# تقرير 08 — أين آخر تعديلات Claude؟ خريطة زمنية كاملة

**النوع:** فحص وتجهيز فقط — لا كود  
**مرجع المؤلف في Git:** `Banco Group <waelzaid66@gmail.com>` + Co-Authored-By Claude في بعض الرسائل  
**قاعدة الدمج الحالية:** شغل Claude الخاص بـ FI **موجود على `main`**. إصلاحات Cursor P0 **ليست على main** (PR #28 مفتوح).

---

## 1) الحكم السريع

| سؤال | الجواب |
|------|--------|
| أين آخر شغل Claude على البنوك/FI؟ | على `main` — آخر commits متخصصة: `36eec11` ثم `83e93cc` / `6f940d3` (فرع/سعر فائدة) |
| هل Claude أنهى المنتج؟ | **لا** — أنهى طبقة Backend + سطح inbox مشروط، وترك فجوات فصل/تشغيل/أمان |
| أين إصلاحات Cursor؟ | فرع `cursor/fi-separation-p0-4322` / PR #28 — لم تُدمَج بعد |
| أين تقارير الفحص السابقة؟ | PR #27 (حزمة 00–05) + هذا الفرع v2 يعمّقها |

---

## 2) سلسلة commits Claude ذات الصلة (مرتبة زمنياً تقريباً)

| Commit | التاريخ التقريبي | العنوان | الطبقة |
|--------|------------------|---------|--------|
| `06cd629` | قبل Phase 2 | نوع حساب رابع FI | هوية |
| `224ef4f` | | هب Banks & Financiers + CTA تسجيل | موبايل عام |
| `26c80e9` | | استعادة ما مُسح: FI account type + غيره | استعادة |
| `cbcd654` | 2026-07-16 | **FI Phase 2** — branches, seats, auto-handoff, inbox API | Backend أساسي |
| `a3820d2` | 2026-07-17 | Inbox UI داخل الهب + `owner_user_id` في API | موبايل + API |
| `a6e945d` | 2026-07-17 | إصلاح demote عند التوثيق + نشاط بنك | هوية |
| `4e5ccf6` | | sweep: FI plan audience في OpenAPI + مفاتيح i18n | عقود/نسخ |
| `36eec11` | 2026-07-18 | **آخر سطح بنكي كبير** — branch-routing UI في inbox | موبايل بنك |
| `83e93cc` | | `branch_id` على FinancingRequest + quick-sort أقسام | بيانات |
| `6f940d3` | | نسبة الربح/الفائدة عند إنشاء الإعلان | تمويل/إعلان |

> **آخر تعديلات Claude الجوهرية على تجربة البنك:** `36eec11` (توجيه الفرع داخل inbox).  
> **آخر لمسات تمويل محيطة:** `6f940d3` / `83e93cc`.  
> بعدها شغل Cursor = تقارير (#27) ثم P0 (#28) — ليس Claude.

---

## 3) خريطة الملفات التي لمسها Claude (قلب FI)

### Backend / Schema
- `lib/db/src/schema/index.ts` — `financing_intermediaries.owner_user_id`, `financing_branches`, `financing_seats`, `branch_id`
- `artifacts/api-server/src/services/FinancingService.ts` — membership, inbox, handoff, admin branches/seats
- `artifacts/api-server/src/routes/v1/financing.ts` + `admin.ts`
- `artifacts/api-server/src/controllers/financingController.ts`
- `artifacts/api-server/src/validators/schemas.ts`
- `lib/api-spec/openapi.yaml` + عملاء مولَّدون
- `artifacts/api-server/src/services/UserService.ts` — demote fix + نشاط بنك

### Mobile
- `artifacts/banco-mobile/app/business/banks.tsx` — هب عام + `InstitutionInboxSection`
- `artifacts/banco-mobile/constants/i18n.ts` — مفاتيح banks/inbox
- `artifacts/banco-mobile/lib/notificationRouting.ts` — deep-link تمويل → banks
- `artifacts/banco-mobile/app/business/onboarding.tsx` — نشاط FI في الشبكة (بدون `intent=fi` على main)
- `artifacts/banco-mobile/app/(tabs)/profile.tsx` — اختيار نوع FI

### Admin (ما فعله Claude هنا)
- CRM تمويل موجود سابقاً/مترجم (`993746c` وغيره)
- **لم يبنِ** UI لـ owner / branches / seats في `admin-os` (الـ API فقط)

---

## 4) ما هو «آخر commit» لكل سطح؟

| السطح | آخر commit Claude مؤثر | الحالة على main الآن |
|-------|------------------------|----------------------|
| Schema Phase 2 | `cbcd654` | موجود |
| Bank inbox API | `cbcd654` → تحسينات لاحقة | موجود |
| Bank inbox UI | `a3820d2` + `36eec11` | موجود |
| ربط owner في API | `a3820d2` | موجود |
| ربط owner في Admin UI | — | **غائب على main** (موجود فقط في PR #28) |
| إصلاح demote الجزئي | `a6e945d` | موجود |
| فرض مسار Banks→FI | — | **غائب على main** (PR #28) |
| KYC docs في الأدمن | — | **غائب على main** (PR #28) |
| فلتر inbox الحالات | ادعاء في كومنت `cbcd654` | **ضعيف على main**؛ مُشدَّد في PR #28 |

---

## 5) علاقة PR الحالية

```
main  ←── Claude FI (مدموج)
  │
  ├── PR #27  docs forensic v1 (00–05)     OPEN / فحص فقط
  ├── PR #28  Cursor P0 fixes             OPEN / إصلاحات
  └── هذا الفرع  deep forensic v2 (08+)   فحص أعمق فقط
```

---

## 6) ماذا يعني «آخر تعديلات Claude» عملياً؟

Claude توقّف عند:

1. بنك **مربوط يدوياً** يرى inbox ويعيد توجيه فرع.  
2. أدمن يقدر يغيّر حالة الطلب ووسيط عبر CRM.  
3. ادّعاء منتج («شركاء موثّقون»، «بعد التوثيق نربطكم») **أوسع من التنفيذ**.

لم يُغلق:

- دليل بنوك حي  
- فصل تسجيل كامل من الهب  
- تشغيل أدمن لـ Phase 2  
- نقل آمن ككيان  
- AuthZ صارم على PATCH الوكيل  
- باقة/اشتراك FI حقيقي  

التفاصيل في التقارير `09` و `10`.
