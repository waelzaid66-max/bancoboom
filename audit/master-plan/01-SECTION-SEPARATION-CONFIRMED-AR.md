# 01 — تأكيد فصل الأقسام · عقد التوسع الآمن

**الحالة على `main` (بعد #25):** فصل Discover → ميني-آب **مُستعاد ومؤكد في الكود**.  
**الثقة:** عالية على المسار · متوسطة على أن Replit سحب `main`.

---

## 1) إثبات الوجود الآن (checklist تحقق)

| فحص | الدليل على main | نتيجة متوقعة |
|------|-----------------|--------------|
| `SECTION_ROUTE` موجود | `SearchDiscover.tsx` ~32–37 | car / real-estate / factories / materials |
| كروت Discover تدفع route | `router.push(SECTION_ROUTE[cat])` ~123 | لا `onBrowseSection` للكروت |
| Stack مسجّل | `_layout.tsx` `section/car`…`booking` | لا 404 |
| صفحات رقيقة | `app/section/*.tsx` | mount `SectionSearchApp` أو Booking |
| عقد مكتوب | `.agents/memory/banco-section-pages.md` | invariants |

**اختبار يدوي بعد Replit pull:**  
Discover → عقارات → يجب **ألا** ترى شريط All/Cars/RE للتبديل الحر (هذا شكل التاب المشترك فقط).

---

## 2) العقد الصارم (لا يُكسر — يحمي توسعات المستقبل + شغل Claude)

| # | القاعدة | لماذا |
|---|---------|--------|
| I1 | Discover **فقط** `router.push('/section/…')` | منع الذوبان |
| I2 | كل قسم = `useSearchMiniApp` **مستقل** | لا حالة مشتركة |
| I3 | `SectionSearchApp` additive — تاب Search لا يمر عبره | حماية المحرك العام |
| I4 | Reset بالـ mount/unmount | لا effects إعادة ضبط هشة |
| I5 | Dirty vs baseline عند الدخول | لا badges وهمية |
| I6 | `FilterSheet.lockCategory` في الميني-آب فقط | لا تسريب فلاتر |
| I7 | فلاتر القسم تُبوَّب بـ `category ===` gates | منع fuel على عقارات إلخ |
| I8 | تسجيل `Stack.Screen` إلزامي لكل slug | وإلا 404 صامت |
| I9 | `onBrowseSection` **deprecated** — ممنوع إعادة ربط Discover به | خطر melt معلوم |
| I10 | Booking استثناء هوية (BOOM STAY) لكن نفس عزل route | لا يُذاب في Search |

---

## 3) ماذا بقي بعد التأكيد؟ (ليس ذوباناً — مخاطر توسع)

| المتبقي | خطر إن تُرك | إجراء مخطط (لاحقاً بعد موافقتك) |
|---------|-------------|----------------------------------|
| تاب Search ما زال يبدّل الأقسام داخله | ازدواجية مربكة | قرار منتج: الإبقاء كـ «بحث عام» أو تقييد |
| `browseSection` ما زال يُمرَّر من `search.tsx` | إعادة melt لو Discover رجع له | موجة صيانة وقائية: عزل/حذف بعد موافقة |
| `exploreOnMap` يحقن عقارات | إحساس «كل شيء عقارات» | ضبط لاحق |
| FilterSheet مشترك ضخم | قسم سادس بلا gates = تسريب | checklist إضافة قسم أدناه |

---

## 4) كيف نضيف قسماً سادساً لاحقاً بدون ضرر؟ (Playbook — لا تنفّذ الآن)

**قبل أي كود:** تعتمد أنت هذا الـ checklist سطراً سطراً.

| خطوة | ملفات | ممنوع |
|------|-------|--------|
| 1 | إضافة بطاقة + `SECTION_ROUTE` في `SearchDiscover.tsx` | استدعاء `onBrowseSection` |
| 2 | `app/section/<slug>.tsx` | تعديل منطق تاب Search ليعتمد القسم الجديد |
| 3 | `Stack.Screen` في `_layout.tsx` | نسيان التسجيل |
| 4 | engines + category type | فلاتر بلا gate في FilterSheet |
| 5 | `FilterSheet` gates للقسم الجديد فقط | نسخ فلاتر سيارات لعقارات |
| 6 | i18n en+ar | مفاتيح ناقصة |
| 7 | create taxonomy إن لزم | كسر publish lifecycle |
| 8 | OpenAPI + SearchService إن فلاتر جديدة | تغيير خوارزمية الترتيب دون اختبار |
| 9 | اختبار عزل: proof-isolation + device QA | دمج مع موجة شكل أخرى |

**حماية شغل Claude:** أي قسم جديد لا يلمس `FinancingService` / banks inbox / owner seats إلا بقرار منفصل.  
**حماية شغل الحالي:** لا refactor لـ `useSearchMiniApp` أثناء إضافة قسم — فقط seed props.

---

## 5) حكم التأكيد التام

| سؤال | الجواب |
|------|--------|
| هل الفصل موجود على main؟ | **نعم** (#25) |
| هل يكفي للتوسع المستقبلي؟ | **نعم بشرط الالتزام بـ I1–I10 + playbook** |
| هل Replit بالضرورة يراه؟ | **لا** — يحتاج pull |
| هل تاب Search يلغي الفصل؟ | **لا** — سطح موازٍ؛ خطر منتج لا انحدار كامل |

**الخلاصة:** الفصل **مؤكد كعقد معماري على main**. التوسع الآمن = اتباع playbook وليس «نضيف كارت ونفلتر في السيرش».
