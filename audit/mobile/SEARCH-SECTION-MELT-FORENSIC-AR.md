# أوديت جنائي — ذوبان فصل أقسام السيرش + مشاكل شاشة العقارات

**التاريخ:** 2026-07-19  
**النطاق:** `artifacts/banco-mobile` فقط  
**الحالة:** تسجيل مشاكل + أدلة Git — **بدون إصلاح في هذا المستند**  
**مرجع صورة المالك:** تاب Search على Replit Expo (`*.expo.worf.replit.dev`) — Real Estate محدد + خطأ تحميل نتائج  

---

## 0) توضيح مهم (ويب ≠ موبايل)

| مسار العمل | أين الكود | هل لمس SearchDiscover / فصل الأقسام؟ |
|------------|-----------|--------------------------------------|
| مشروع الويب (Phases 1–9) | `artifacts/banco-web` + `audit/website` | **لا** — ميثاق no-touch يمنع لمس الموبايل |
| هيدر Boom Stay (PR #23) | `BookingStaysApp` + `StaysHomeHeader` فقط | **لا** — لم يلمس Discover ولا `search.tsx` ولا `SectionSearchApp` مسار الدخول |
| ذوبان الفصل | `SearchDiscover` + `(tabs)/search.tsx` + `_layout` | **نعم — كوميت Replit منفصل أقدم** |

الويب لم يُبنَ «فوق ارتفاكت التطبيق» لمسار الأقسام. مصيبة الفصل موثّقة أدناه بتاريخ **2026-07-13** قبل موجات الويب.

---

## 1) الحكم

**الفصل سايح.** الصورة المرفقة = **تاب السيرش المشترك** بعد فلتر `real_estate` — وليست ميني-آب `/section/real-estate`.

لذلك يظهر:
- شريط أقسام قابل للتبديل (All / Cars / Real Estate / Factories…)  
- بحث عام «Search cars, property, machines…»  
- شيبس تمليك/إيجار داخل نفس الشاشة  
- خطأ API فوق نفس السطح  

الشغل على `SectionSearchApp` + `app/section/*` **موجود لكنه مقطوع من Discover**.

---

## 2) سجل المشاكل المرصودة من الصورة + الكود

| # | المشكلة | الدليل | الشدة |
|---|---------|--------|-------|
| P1 | كروت Discover لا تفتح ميني-آب | `SearchDiscover.goToResults` → `onBrowseSection` بدل `router.push(SECTION_ROUTE)` | Critical |
| P2 | الأقسام تُفلتر داخل `(tabs)/search` | `search.tsx` `browseSection` + `CategoryTabs` دائماً ظاهرة | Critical |
| P3 | يمكن القفز من عقارات لسيارات بنفس الشاشة | `CategoryTabs onChange={selectCategory}` | Critical |
| P4 | `SECTION_ROUTE` محذوف | غير موجود في الكود الحالي؛ كان في `ae7b679` | Critical |
| P5 | `section/*` غير مسجّلة في `_layout` | `app/_layout.tsx` بلا `Stack.Screen` للـ section | Critical |
| P6 | `SectionSearchApp` + تحسينات (RFQ/sort/M4) بلا مسار Discover | ملفات حية، دخول Discover ميت | High — «شغل مخفي» |
| P7 | خطأ «Couldn't load results…» | `viewState === "error"` في `search.tsx` + `search.errorTitle` | High (API/شبكة منفصلة عن الفصل لكن تظهر على السطح الذائب) |
| P8 | Egypt/markets + rental terms على نفس شاشة السيرش المشتركة | `showRentalTerms` block في `search.tsx` ~881–963 | Medium (شكل مزدحم/فارغ بصرياً مع خطأ النتائج) |
| P9 | `CompanyOffers` اختفى من Discover | حُذف في `93b650b` ثم مرة أخرى في `c49b3b9` | High |
| P10 | بوابات Business اختفت مؤقتاً ثم رُمّمت جزئياً | `d30a356` أعاد booking/hubs بصرياً **دون** SECTION_ROUTE | High |
| P11 | Booking فقط ما زال portal حقيقي | `router.push("/section/booking")` | ملاحظة (استثناء) |
| P12 | Explore on map يجبر عقارات | `exploreOnMap` → `category: "real_estate"` | Medium — يغذي إحساس «كل حاجة عقارات» |

---

## 3) الصورة = أي شاشة بالضبط؟

مطابقة 1:1 مع `(tabs)/search.tsx` بعد اختيار Real Estate:

| عنصر في الصورة | مكانه في الكود |
|----------------|----------------|
| تبويب Search أحمر في البوتوم بار | `(tabs)/search` |
| شريط All / Cars / Real Estate / Factories | `CategoryTabs` ~816 |
| فلتر بعدد 1 | `activeFilterCount` (category ≠ all) |
| All / For Sale / For Rent / Villa… | `EngineChips` تحت التبويبات |
| Egypt أحمر + أسواق | صف `MARKET_COUNTRIES` عند `showRentalTerms` |
| Furnished / New-law | صف `rentalTerms` |
| Couldn't load results… | overlay `viewState === "error"` |

**ليس** هذا شكل `/section/real-estate` (`SectionSearchApp` + `MiniAppBottomNav` + قفل كاتيجوري بدون تبديل All/Cars).

---

## 4) الجدول الزمني الجنائي (بالحرف)

| التاريخ | المؤلف | Hash | الرسالة | الأثر على الفصل |
|---------|--------|------|---------|-----------------|
| 2026-07-12 | Replit Agent | `36e7285` | Add section-specific search pages… | **بناء الفصل** |
| 2026-07-13 | Replit Agent | `ae7b679` | Enhance search discovery… | آخر حالة سليمة: `SECTION_ROUTE` + push |
| **2026-07-13 13:24 UTC** | **Bancoeg** `57826563-Bancoeg@users.noreply.replit.com` | **`93b650b`** | **Auto-seed DB on startup…** | **الذوبان:** مسح SECTION_ROUTE، رجوع onBrowseSection، شطب section من `_layout`، حذف CompanyOffers + بوابات business من Discover — داخل كوميت seed ملوّث النطاق |
| 2026-07-13 14:21 | Replit Agent | `c49b3b9` | Extract shared search logic… | استمرار الذوبان؛ حذف إضافي لـ CompanyOffers (−204 سطر Discover) |
| 2026-07-15 | Banco Group | `d30a356` | restore the lost Discover portals… | رمم Booking + hubs **شكلياً**؛ **لم يُرجع** SECTION_ROUTE للأربعة |
| 2026-07-15→18 | Banco Group / agents | `f2ee2b5` `fb3de92` `83e93cc` | M4 / RFQ / sort على sections | حسّنوا `SectionSearchApp` **بدون إعادة ربط Discover** → شغل مخفي أكثر |

**لا يوجد كوميت Cursor website** يلمس `SearchDiscover` أو `(tabs)/search` أو مسارات section.

«كلود أخفى مميزات» بالمعنى العملي: وكلاء Replit (Bancoeg + Replit Agent) في `93b650b`/`c49b3b9` قطعوا مسارات الدخول؛ تحسينات لاحقة على الميني-آب بقيت يتيمة.

---

## 5) ماذا كان عند التسليم بالفصل (قبل الذوبان)

من `ae7b679` + ذاكرة `.agents/memory/banco-section-pages.md`:

- كروت → `router.push('/section/car|real-estate|factories|materials|booking')`
- كل صفحة `useSearchMiniApp` مستقل + `lockCategory`
- لا CategoryTabs للتبديل الحر داخل الميني-آب
- `_layout` يسجّل `section/*` بـ `slide_from_right`

---

## 6) اتجاه الإصلاح (لم يُنفَّذ هنا)

1. استعادة `SECTION_ROUTE` + `router.push` لكروت الأربعة من حالة `ae7b679`  
2. إعادة `Stack.Screen` لـ `section/*` في `_layout`  
3. الإبقاء على Booking → `BookingStaysApp`  
4. عدم جعل `browseSection`/CategoryTabs بوابة Discover  
5. تشخيص منفصل لخطأ API («Couldn't load results») على البيئة الحية  

---

## 7) أوامر تحقق سريعة

```bash
# هل SECTION_ROUTE موجود؟
rg "SECTION_ROUTE" artifacts/banco-mobile/components/SearchDiscover.tsx

# هل الـ layout يسجّل section؟
rg "section/" artifacts/banco-mobile/app/_layout.tsx

# كوميت الذوبان
git show 93b650b --stat | head -40
git show ae7b679:artifacts/banco-mobile/components/SearchDiscover.tsx | rg SECTION_ROUTE
```

---

**الخلاصة للمالك:** الصورة تثبت أنك على السيرش المشترك الذائب وليس ميني-آب العقارات. السبب الجذري مسجّل: `93b650b` (Bancoeg / Replit، 13 يوليو). مشروع الويب وهيدر Stay ليسا مصدر هذه المصيبة.
