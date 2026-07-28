# تحليل شاشات المالك — Discover لا يدخل القسم + مربعات + هيدر طويل

**التاريخ:** 2026-07-19  
**الفرع:** `cursor/discover-enter-fix-4322`  
**الأساس:** `main@88e83ca` (MOB-05) + إصلاحات هذا الفرع  

---

## ماذا قال المالك (من الشاشات)

1. الضغط على قسم **لا يدخل** الميني-آب — يظهر **شريط اختيارات وسط الأيقونات**.
2. **مربعات** كبيرة (2×2) تبدو غير مصلحة.
3. هيدر **BOOM STAY** يأخذ تقريباً نصف الشاشة.
4. أين التقسيم الصحيح الذي اشتغل شهوراً؟

---

## التشخيص (حقائق كود)

| العرض في الشوت | السبب الحقيقي |
|----------------|---------------|
| `CategoryTabs` (All/Cars/RE/Factories) فوق «Browse by section» | إما Replit **قبل** `88e83ca` / MOB-05، أو معاينة قديمة. على `main` الحالي: `viewState !== "discover"` يخفي CategoryTabs + EngineChips. |
| شريط All/New/Used أو For Sale/Villa **بين** شبكة الأقسام وبطاقة Booking | نفس مزج كروم البحث مع Discover (بناء قديم). `SearchDiscover` **لا** يرسم EngineChips. |
| مربعات 2×2 كبيرة | بطاقات قسم مربعة (`sectionCard` ارتفاع ~118) — بدت كفلاتر وليست بوابات دخول. |
| هيدر Stay نصف الشاشة | Hero وردي/أسود ضخم (هوية + بحث + تبويبات عمودية). |

**التقسيم الصحيح الذي رجّعناه (W1 + هذا الفرع):**

- Discover = بوابات **ENTER** → `router.push("/section/…")`
- فلاتر القسم (engines / countries / terms) **داخل** الميني-آب فقط
- لا جسر `onBrowseSection` يذيب القسم في Search المشترك

---

## تصحيح لاحق (مهم — لا تعتمد الفقرات القديمة أعلاه)

المالك رفض صفوف ENTER والهيدر الأسود. الاسترجاع الحالي:

1. **Discover:** شبكة كروت صور 2×2 من `main` + `router.push(SECTION_ROUTE)`.
2. **Stay:** هيرو وردي + `SectionBackdrop` من `main` — `StaysHomeHeader` محذوف.
3. **Search host:** إخفاء CategoryTabs/engines على Discover (MOB-05).
4. **حارس CI:** يرفض ENTER ويرفض `StaysHomeHeader` ويفرض `flexGrow:0` + اسم الدولة.

---

## أوامر Replit (إلزامي قبل أي شوت جديد)

```bash
git fetch origin
git checkout main
git pull origin main
# بعد دمج هذا الـ PR:
git pull origin main
# يجب أن ترى SHA ≥ كوميت هذا الفرع (بعد الدمج)
git rev-parse --short HEAD
```

ثم Expo → Search Discover:

- [ ] لا CategoryTabs فوق البوابات
- [ ] لا EngineChips بين البوابات و Booking
- [ ] ضغط «سيارات / عقارات / …» يفتح `/section/*` بهيدر القسم
- [ ] Booking & Stays: هيدر أسود قصير + نتائج ظاهرة تحتها

---

## ما ليس غباء في المنتج — خلط معاينة

إذا ظهرت الشاشات القديمة بعد السحب: **الكاش/المعاينة على SHA قديم**.  
ليس ضياع شهور العمل — العزل موجود في `main` منذ W1/MOB-05؛ هذا الفرع يصلّح الشكل + يقوّي الدخول + يقصّر Stay.
