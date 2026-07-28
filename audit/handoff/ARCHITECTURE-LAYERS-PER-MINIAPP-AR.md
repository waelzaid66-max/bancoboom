# خريطة الطبقات الإنشائية — كل قسم / كل شاشة (قبل أي حرف إصلاح)

**تاريخ:** 2026-07-19  
**الاعتراف:** إصلاحات `topPad` / هيدر وحدها = شغل على **طبقة واحدة** · المصيبة إن التطبيق مبني **طبقات فوق بعض** · المربعات والكروت ليها دقة إنشائية خاصة · كسر طبقة يبوّظ اللي تحتها/فوقها.  
**قاعدة:** افهم الطبقات → وافق Owner → لمس طبقة واحدة مسمّاة فقط → أعد قياس كل الطبقات الظاهرة.

---

## 0) خطأ المنهج السابق (لن يُعاد)

| غلط | ليه كارثة |
|-----|-----------|
| إصلاح pad/هيدر كأن الشاشة مسطّحة | الهيدر طبقة فوق شريط chips فوق نتائج فوق nav |
| توحيد أرقام بين Stay و Section | Stay له بطل (hero) مختلف إنشائياً عن هيدر Section |
| «تصغير» عشان الزحمة | كسر صف الأزرار داخل طبقة الهيدر |
| redesign المربعات لما تبان غريبة في الشوت | المربعات مبنية: صورة→scrim→watermark→badge→label→chevron |

---

## 1) سلم التطبيق (من برّه لجوه)

```
L-APP     Expo Router Stack / Tabs
L-HOST    Search tab host (search.tsx) — Discover أو نتائج مشتركة
L-PORTAL  بوابات Discover (مربعات الأقسام + Stay + map…)
L-SHELL   ملف route رفيع: app/section/car.tsx … يمرّر category فقط
L-MINI    جسم الميني-آب (SectionSearchApp | BookingStaysApp)
L-CHROME  طبقات الواجهة داخل الميني-آب (هيدر→بحث→chips→…)
L-DATA    useSearchMiniApp + criteria مقفولة + API
L-OVERLAY FilterSheet / Pickers / Map overlay / BottomNav
```

**قانون:** لا تصلح `L-CHROME` وأنت فاكر إنك بتصلح `L-PORTAL`.  
لا تصلح `L-DATA` بتغيير شكل المربع.

---

## 2) Discover — إنشائية المربعات (L-PORTAL)

الملف: `SearchDiscover.tsx`  
المضيف: `search.tsx` يعرض Discover لما مفيش criteria نشطة (MOB-05 يخفي كروم الفئات).

### 2.1 طبقات كرت القسم الواحد (من تحت لفوق — لازم تفضل بنفس الدقة)

```
[0] sectionCardWrap     عرض 47% · شبكة gap 12 · pad شبكة 16
[1] sectionCard          ارتفاع 118 · radius 20 · pad 14 · ظل
[2] sectionPhoto         cover كامل
[3] sectionScrim         LinearGradient سينمائي (3 وقفات)
[4] sectionWatermark    شعار BANCO خافت فوق الـ scrim
[5] sectionBadge         36×36 أيقونة القسم
[6] sectionLabelRow     خط تمييز 3×15 + عنوان
[7] sectionChevron       سهم RTL/LTR
```

بوابة Stay (عرض كامل) **نفس عائلة الطبقات** (صورة→scrim→watermark→badge→label) لكن مش نفس ارتفاع شبكة 2×2.

### 2.2 ممنوع على طبقة المربعات
- صفوف ENTER بدل الشبكة  
- تغيير height/radius/gap بدون أمر Owner + قياس  
- وضع EngineChips/CategoryTabs جوه Discover  

---

## 3) ميني-آب القسم العام (Car / RE / Factories / Materials)

**Shell:** `app/section/*.tsx` → `SectionSearchApp({ category, titleKey, subtitleKey })`  
**جسم:** `SectionSearchApp.tsx`

### 3.1 عمود الشاشة من فوق لتحت (طبقات واجهة)

| ترتيب | طبقة | ماذا فيها | ملاحظة إنشائية |
|------:|------|-----------|----------------|
| C0 | `container` flex1 | خلفية | |
| C1 | **Header band** | back · عنوان+أيقونة قسم · search · filter | أزرار داخل الشريط · عنوان ينكمش |
| C2 | **Search bar** (اختياري) | يظهر عند فتح البحث | تحت الهيدر مباشرة |
| C3 | **Suggestions** (اختياري) | تحت شريط البحث | |
| C4 | **Chip strip** `hScroll flexGrow:0` | دولة · sort · mode/engines | **كسر flexGrow = فراغ أسود يبلع النتائج** |
| C5 | صفوف ثانوية (origin / rental…) | حسب القسم | لا تُخلط بين الأقسام |
| C6 | **resultsArea** flex1 | قائمة / empty / error | |
| C7 | **Map overlay** | فوق النتائج إن map | pill مضغوط |
| C8 | **FilterSheet** | `lockCategory` + `shownCategories={[category]}` | |
| C9 | Pickers (سوق/موقع/سيارة) | مودال | |
| C10 | **MiniAppBottomNav** | أسفل | يفتحّت عند البحث |

### 3.2 طبقة البيانات (تحت الواجهة — مش شكل)

```
seed(category المقفل) → criteria
update/commit/applyPatch → يعيد فرض category (anti-melt)
facets/engines = مرئية لهذا الـ category فقط
clearAll → baseline القسم · مش DEFAULT all
```

كل قسم = **نفس هيكل الطبقات** · **محتوى C4/C5/C6 مختلف** حسب `category` — هذا هو «كل قسم فيه طبقاته» من غير ما نعيد تصميم الهيكل.

| قسم | قفل بيانات | فرق واجهة متوقع (محتوى لا هيكل) |
|-----|------------|----------------------------------|
| car | `category=car` | engines سيارات · brands |
| real_estate | `real_estate` | rentalTerm · map latch `?map=1` |
| factories | `facilities` | industrial chips مرافق |
| materials | `materials` | materials engines/origin |

---

## 4) ميني-آب Stay (مش نسخة من Section)

**Shell:** `app/section/booking.tsx` → `BookingStaysApp`  
**مهم:** طبقة البطولة **Hero وردي** (`SectionBackdrop`) — ليست هيدر Section الرمادي.

| ترتيب | طبقة Stay |
|------:|-----------|
| S0 | container |
| S1 | **Hero** (backdrop + watermark + dim عند البحث) |
| S2 | صف hero: back · wordmark B-OOM STAY · save · filter |
| S3 | pill «Where to?» / حقل بحث |
| S4 | chip strip (دولة · مدة إيجار…) `flexGrow:0` |
| S5 | resultsArea + StayCard |
| S6 | FilterSheet lock real_estate |
| S7 | MiniAppBottomNav |

استبدال S1 بهيدر أسود = كسر إنشائي كامل (حصل قبل كده — ممنوع).

---

## 5) كيف تُصلح «جراحة + إنشاء» صح

```
1) سمّ الطبقة: مثال «Car · C4 chip strip» أو «Discover · مربع [2] photo»
2) اقرأ الطبقات فوقها وتحتها — هل الإصلاح هيزحزحهم؟
3) غيّر رقم/شرط داخل الطبقة المسمّاة فقط
4) أعد فحص:
   - الطبقة نفسها
   - الطبقة الأعلى (هيدر/أزرار)
   - الطبقة الأدنى (نتائج/void)
   - بوابة Discover إن المخرج كان منها
5) حارس 29/29 + شوت
6) موافقة Owner قبل طبقة تانية
```

### أمثلة

| عيب | الطبقة | إصلاح | غلط |
|-----|--------|-------|-----|
| أزرار خرجت من الهيدر | C1 فقط | pad/flexShrink داخل C1 | تصغير كل الشاشة |
| فراغ أسود | C4↔C6 | `hScroll.flexGrow:0` | إعادة تصميم النتائج |
| مربع «مش دقيق» | L-PORTAL [0–7] | قياس height/gap/radius للمربع | ENTER rows |
| Stay باظ | S1–S3 | إبقاء hero الوردي | توحيد مع Section header |

---

## 6) طلب موافقة Owner (قبل أي كود جديد)

لن ألمس كود حتى توافق صراحةً على واحد مما يلي:

**أ)** اعتماد هذه الخريطة كقانون شغل فقط (توثيق) — لا كود الآن  
**ب)** فتح وحدة إنشائية مسمّاة، مثال: `Car · مراجعة C1→C6 بالشوت فقط`  
**ج)** فتح وحدة كود واحدة مسمّاة الطبقة، مثال: `Discover · تثبيت ارتفاع المربع 118 إن الشوت يثبت انحراف`  

اكتب مثلاً:  
`موافق أ`  
أو `موافق ب: Stay S1–S4 شوت`  
أو `موافق ج: …` مع اسم الطبقة.

— Cursor · Architectural layer map · No single-layer patching
