# أوامر Copilot تحت Cursor — ابحث عن المشاكل الآن (لا تكتب ميزات)

**من:** Cursor (قائد الجودة)  
**إلى:** GitHub Copilot على نفس الريبو  
**الهدف:** تفرغ Cursor لإصلاحات حقيقية؛ أنت تمسح وتوثّق فقط.  
**مستوى الدقة:** أعلى مستوى — برنامج دولي سيُسلَّم لشركة كبيرة وملايين مستخدمين. كل حرف مهم. لا تخمين. لا اختراع بيانات. لا مسح ميزات.

---

## قواعد حديدية (اقرأها كاملة قبل أي أداة)

1. **NO-WIPE** — لا تحذف ملفات/جداول/مسارات أقسام. إضافات وتقارير فقط.
2. **Website isolation** — لا تلمس `artifacts/banco-website` إلا للقراءة إن لزم؛ لا تعدّل شكل الموبايل ليطابق الويب.
3. **حقائق فقط** — كل عيب = ملف + سطر/رمز + دليل. إن لم تجد دليلاً اكتب «غير مؤكد».
4. **لا تبدأ W3 FI security** — ممنوع حتى أمر Start صريح بعد دمج #28.
5. **لا توسّع نطاق** — لا «تحسينات عامة». ابحث، سجّل، اقترح PR صغير إن طُلب لاحقاً.
6. **SVG/i18n** — أي ملاحظة أيقونات عبر `@/components/icons`؛ أي نص جديد يحتاج en+ar.

---

## SHA / فرع العمل

- اقرأ أولاً: `main` الحالي + فرع `cursor/discover-enter-fix-4322` إن مفتوح.
- بعد دمج إصلاح Discover: افحص `HEAD ≥` كوميت الدمج.
- سجّل في تقريرك: `git rev-parse HEAD` ورسالة الكوميت.

---

## مهام المسح (بالترتيب — لا تتخطَّ)

### CP-A — عزل الأقسام / Discover (حرج)

تحقق من هذه الحقائق في الكود (واذكر المسار):

| # | حقيقة يجب أن تكون صحيحة | أين تتحقق |
|---|--------------------------|-----------|
| A1 | `SearchDiscover` يدفع `SECTION_ROUTE` عبر `router.push` | `components/SearchDiscover.tsx` |
| A2 | لا يوجد `onBrowseSection` يذيب Discover في Search | `SearchDiscover.tsx` + `app/(tabs)/search.tsx` |
| A3 | `CategoryTabs` / `EngineChips` مخفية عندما `viewState === "discover"` | `search.tsx` |
| A4 | زر `filter-toggle` مخفي على Discover | `search.tsx` |
| A5 | لا JSX لـ `<CategoryTabs` أو `<EngineChips` داخل `SearchDiscover` | guard test + ملف Discover |
| A6 | بوابات القسم صفوف دخول (`sectionPortal` / `sectionList`) وليست شبكة فلاتر تذيب المعايير | `SearchDiscover.tsx` |
| A7 | شاشات Stack مسجّلة: `section/car|real-estate|factories|materials|booking` | `app/_layout.tsx` |

شغّل إن أمكن:

```bash
cd artifacts/banco-mobile && node --test tests/section-miniapp-guard.test.mjs
```

النتيجة المتوقعة: **7/7 pass**. إن فشل اختبار — انسخ الفشل حرفياً في التقرير.

### CP-B — Stay / BOOM STAY هيدر

| # | تحقق |
|---|------|
| B1 | `BookingStaysApp` يستخدم `StaysHomeHeader` |
| B2 | لا Hotels في تبويبات النوع |
| B3 | العقود محفوظة: `stays-back`, `stays-save-search`, `stays-filter-toggle`, `stays-type-*`, `stays-search-*` |
| B4 | الهيدر مضغوط (ليس نصف الشاشة) — راجع الأنماط في `StaysHomeHeader.tsx` |

### CP-C — انحدارات معروفة (لا تصلح إلا بتذكرة واضحة)

امسح فقط وسجّل الحالة (مفتوح/مصلح/غير مؤكد):

- MOB-07: `exploreOnMap` يحقن `real_estate` في معايير Search المشترك
- MOB-08: شاشات Legal إنجليزية فقط
- FI: F-SEC-01/02/03 — **لا تلمس**؛ موجّه لـ W3 بعد #28
- Banks: صدق النسخ / لا شيفرون ميت (MOB-05)

### CP-D — اختبارات وتحذيرات

```bash
# من جذر الريبو إن وُجدت السكربتات:
pnpm --filter @workspace/banco-mobile run test:section-guard
# أو:
cd artifacts/banco-mobile && node --test tests/section-miniapp-guard.test.mjs
```

أدرج أي `TODO`/`FIXME`/`onBrowseSection`/`browseSection` متبقية في الموبايل.

---

## صيغة التقرير المطلوبة (ملف واحد)

أنشئ أو حدّث:

`audit/handoff/COPILOT-SCAN-REPORT-DISCOVER-ENTER-AR.md`

بالهيكل:

```
# تقرير مسح Copilot — Discover / أقسام / Stay
SHA: …
التاريخ: …
## ملخص تنفيذي (5 أسطر كحد أقصى)
## جدول العيوب
| ID | الشدة | الملف | الدليل | مقترح إصلاح صغير |
## اختبارات (pass/fail + لصق المخرج)
## ما لم يُمس (NO-WIPE / website / W3)
## أسئلة للمالك فقط إن لزم (نعم/لا)
```

---

## ممنوع عليك الآن

- فتح PR كبير أو إعادة تصميم
- تعديل website
- دمج فروع
- اختراع بيانات listings
- الرد بأعذار بدل مسارات ملفات

## مسموح

- تقرير الحقائق أعلاه
- تعليقات مراجعة على PR `cursor/discover-enter-fix-4322` إن وُجد
- قائمة PR صغيرة مقترحة لاحقاً (عنوان + ملف واحد) بدون تنفيذ

---

## بعد أن ينتهي Cursor من الدمج

أعد المسح على `main` الجديد وأثبت بجدول «قبل/بعد» لنفس بنود A1–A7 و B1–B4.
