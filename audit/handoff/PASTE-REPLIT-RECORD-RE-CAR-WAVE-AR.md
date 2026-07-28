# Replit — تسجيل فقط (لا تنفيذ) · موجة عقارات + سيارات + توريدات

**الدور:** اقرأ وافهم وسجّل في قناتكم / ملاحظات التشغيل.  
**ممنوع الآن:** كود · redesign · Expo rebuild إلا بعد أمر Owner صريح «نفّذ».  
**مصدر الحقيقة:** GitHub PR `#41` · فرع `cursor/section-g2-finish-4322` · tip بعد push هذه الموجة.

---

## 1) ماذا كان يكسر التجربة (من شوتات المالك + الكود)

| عرض المالك | السبب الحقيقي | المكان |
|------------|---------------|--------|
| ضغط كرت عقارات/سيارات يجيب **شريط** وسط Discover | melt قديم / معاينة قبل MOB-05 أو جسر criteria | `search.tsx` + `SearchDiscover.tsx` |
| عقارات جوه = **مربعات فلتر** مش شرايط | `listingMode` معروض/مطلوب + engines تمليك/إيجار/شقة/فيلا في **صف واحد** | `SectionSearchApp.tsx` |
| دول + فلاتر داخل الشرايط بايظة | دولة في نفس شريط العرض؛ FilterSheet يعيد عرض أنواع كـ engines | نفس + `FilterSheet.tsx` |
| استيراد سيارات ما يفتحش عالم الاستيراد | CTA كان `push(/section/car)` بلا `?engine=import` | `SearchDiscover.tsx` |
| Stay/Car طبقات ناقصة | Car بلا شريط ماركات/أصل؛ RE بلا مصفوفة سوق تحت الأنواع | `SectionSearchApp.tsx` |
| توريدات ناقصة جوه الميني-آب | `showMaterial` ميت · خامة فقط في الورقة الممسوحة · بلا شريط خامة/مصفوفة | `FilterSheet.tsx` + `SectionSearchApp.tsx` |

**العقد الصحيح (ثابت):**
- Discover = بوابات صورة 2×2 → `router.push(SECTION_ROUTE…)` **ENTER**
- كل الفلاتر/engines/دول **داخل** الميني-آب فقط
- Stay منفصل (`BookingStaysApp`) · لا توحيده مع Section

---

## 2) أين التعديلات (مسارات)

```
artifacts/banco-mobile/components/search/SectionSearchApp.tsx   ← جسم RE + Car
artifacts/banco-mobile/components/search/FilterSheet.tsx        ← ربط ورقة الفلاتر
artifacts/banco-mobile/components/SearchDiscover.tsx            ← ENTER + car?engine=import
artifacts/banco-mobile/lib/searchParams.ts                      ← CLEAR propertyType
artifacts/banco-mobile/app/section/real-estate.tsx              ← shell رفيع (بدون منطق)
artifacts/banco-mobile/app/section/car.tsx                      ← shell رفيع
artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs     ← حارس انتكاس
audit/handoff/SURGICAL-WAVE-WORKING-REF-AR.md
audit/handoff/PASTE-REPLIT-RECORD-RE-CAR-WAVE-AR.md             ← هذا الملف
```

**لا تلمس:** website · Banks live directory · AuthZ FI invent · Discover redesign كروت.

---

## 3) كيف تتركّب الطبقات (عقارات)

```
C1 Header (back · عنوان · بحث · فلتر)
C2 Search bar (اختياري)
C3 Primary strip: sort · الكل/تمليك/إيجار · مطلوب
C4 Type strip: شقة/فيلا/أرض…  → criteria.propertyType
C5 Market matrix: دول + عملات (+ المزيد → picker)
C6 Rental terms strip (لما إيجار)
C7 resultsArea
C8 FilterSheet: سوق · refinements · أنواع propertyType · مطلوب · إيجار · سعر…
```

**سيارات (توسعة طبقات بنفس المنطق):**
```
C3 Primary: دولة · sort · معروض/مطلوب · engines سيارات
C4 Brand strip: كل الماركات + quick brands
C5 Origin strip: الكل / محلي / مستورد
C6 results · FilterSheet brands/fuel/year…
```

**توريدات / مواد (`/section/materials`):**
```
C3 Primary: sort · معروض/مطلوب · industrial types (مواد خام / آلات…)
C4 Material strip: الكل + حديد/ألومنيوم/… → criteria.material
C5 Origin strip: الكل / محلي / مستورد
C6 Market matrix: دول + عملات
C7 results · FilterSheet: industry (لما آلة) · material · origin (بدون تسريب أصل للمصانع)
```

**Stay / Booking (`/section/booking`):**
```
S1 Rose hero (B-OOM STAY · Where to?)
S2 Type strip: sort 34px · الكل / استوديو / شقة / فيلا / شاليه · مطلوب
S3 Market matrix: دول + عملات
S4 Rental strip: يومي / قانون جديد… → criteria.rentalTerm (نفس ورقة الفلاتر)
S5 results StayCard · map toggle · ?map=1 latch
S6 FilterSheet: أنواع Stay فقط · أنظمة إيجار · مطلوب · موقع · سعر
EXIT: باك / سوايپ / هاردوير → ريست فلاتر أوتوماتيك (لا ديالوج تأكيد)
```

**كروت النتائج (RTL):** StayCard + SmartAssetCard → بادجات/أزرار بـ`start`/`end` منطقي (عربي يمين/يسار صحيح).  
**عدّاد الفلاتر:** Section و Stay يعدّان الترتيب غير الافتراضي في البادج.

Deep-link: `/section/car?engine=import` · `/section/real-estate?map=1` · `/section/booking?map=1`

**تقارير Cursor المرفقة:** `CURSOR-BATCH-FULL-REPORT-AR.md` · `CURSOR-GAP-CLOSEOUT-AR.md` · `CURSOR-RECEIPT-CLAUDE-THREE-FILES-STAY-AR.md`

---

## 4) المطلوب من Replit لاحقاً (بعد أمر Owner فقط)

1. `git fetch` + checkout فرع PR أو main بعد الدمج · سجّل `git rev-parse --short HEAD`
2. `node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs` → يجب PASS
3. شوتات إثبات (تسجيل نتائج PASS/FAIL فقط):
   - [ ] Discover: ضغط صورة عقارات → شاشة قسم كاملة (هيدر عقارات) **لا** شريط على Discover
   - [ ] Discover: ضغط صورة سيارات → ميني-آب سيارات
   - [ ] عقارات: شريط عرض منفصل عن شريط أنواع + مصفوفة دول تحتها
   - [ ] عقارات: تمليك + شقة يشتغلوا مع بعض
   - [ ] عقارات: إيجار يظهر شريط أنظمة الإيجار
   - [ ] FilterSheet عقارات: نوع عقار + مطلوب متزامنين مع الشرايط
   - [ ] سيارات: شريط ماركات + أصل ظاهرين
   - [ ] Discover «استيراد سيارات» يفتح car مع engine=import
   - [ ] Discover مواد/توريدات → ميني-آب كامل: خامة + أصل + مصفوفة دول
   - [ ] FilterSheet مواد: خامة ظاهرة · مصانع بلا أصل (لا تسريب)
   - [ ] Stay: أنواع + مصفوفة دول + شريط أنظمة إيجار · فلتر الباج يحدّث
   - [ ] Stay: باك بعد فلتر → رجوع بلا ديالوج · دخول تاني نظيف
   - [ ] Stay: `/section/booking?map=1` يفتح خريطة · كارت → `?focus=booking`

---

## 5) مشاكل ما زالت خارج هذه الموجة (سجّلها · لا تحلّها)

- شوتات G0/G1 Replit على main بعد دمج #41
- Factories توسيع شريط صناعة (industry) بنفس نمط المواد — خفيف لاحقاً
- Banks / FI AuthZ (PR #40 جانبي — قرار Owner)
- Website

---

## 6) جملة تسجيل للقناة

> Cursor أرسل موجة RE+Car+Materials على `cursor/section-g2-finish-4322` / PR #41: دخول القسم من صورة Discover فقط · عقارات = شرايط عرض/أنواع + مصفوفة دول · سيارات = ماركات+أصل + `?engine=import` · توريدات = شريط خامة+أصل+مصفوفة سوق + FilterSheet showMaterial حي. Replit: **تسجيل وفهم فقط** — لا تنفيذ كود حتى أمر Owner.

— Cursor · Record-only brief · No Replit execute
