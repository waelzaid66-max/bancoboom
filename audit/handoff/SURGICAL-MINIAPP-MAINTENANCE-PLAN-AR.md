# خطة صيانة جراحية ممنهجة — ميني-آب × ميني-آب · بدون Redesign · بدون Conflict

**تاريخ:** 2026-07-19  
**المستوى:** أعلى دقة تشغيلية بعد قراءة التحقيق + الجرد + الميلي + الحارس + كود العزل الحي  
**Tip العمل:** `origin/cursor/discover-enter-fix-4322` (اطبع HEAD حي)  
**أدوار:** Cursor = جراحة كود · Replit = تأكيد/شوت فقط · Owner = حكم قبول  
**قانون Owner:** الهيدر الكويس اتكسر لما اتصغّر — الأزرار تفضل جوه · ممنوع تصغير hits تاني

---

## 0) جملة واحدة

نصلّح **بالراحة · وحدة وحدة**: كل ميني-آب يفتح على **قسمه الصحيح فقط**، بمحتواه وفلاترِه وهيدره، مع فحص فصل نظيف — **بلا إعادة تصميم · بلا melt · بلا دفعة ملفات متضاربة · بلا لمس Website/W3**.

---

## 1) ما استوعبناه من كل الفحوصات السابقة (ملزم)

| مصدر | الحكم المأخوذ |
|------|----------------|
| تحقيق الضرر | melt تاريخي أُصلح · كارثة ENTER/أسود = Cursor سوء قراءة · لا نعيدها |
| MUST-KEEP | كروت Discover · Stay وردي · SECTION_ROUTE · W4 · MOB-05/07 · void=0 · country label · CI/#38 · FI#28 |
| جرد الهيدر | تصغير `iconBtn` 12→8 خرّج الأزرار · **أُصلح** · حارس يمنع الرجوع |
| بروتوكول الميلي | مصدر الحقيقة = dp · عتبة ≤2 · hit≥44 · ورقة عيب قبل أي commit |
| حارس 29/29 | يمنع melt / ENTER / StaysHomeHeader / flexGrow / flag-only / iconBtn=8 |
| كود حي | كل قسم = route منفصل + `category` مقفول + `lockCategory` في FilterSheet |

أي خطوة في هذه الخطة تخالف سطراً أعلاه = **مرفوضة**.

---

## 2) عقد الفصل النظيف (Separation Contract)

### 2.1 الخريطة المعتمدة (لا تُغيَّر)

| بوابة Discover | Route | المكوّن | قفل المحتوى |
|----------------|-------|---------|-------------|
| كرت سيارات | `/section/car` | `SectionSearchApp` | `category="car"` |
| كرت عقارات | `/section/real-estate` | `SectionSearchApp` | `category="real_estate"` |
| كرت مصانع/مرافق | `/section/factories` | `SectionSearchApp` | `category="facilities"` |
| كرت مواد | `/section/materials` | `SectionSearchApp` | `category="materials"` |
| بوابة Stay | `/section/booking` | `BookingStaysApp` | إقامة/تأجير (rose) — **ليس** Search مشترك |
| خريطة Discover | `/section/real-estate?map=1` | نفس RE | latch map فقط — **لا** `update` على Search tab |

ملفات الـ shell (رفيعة · لا منطق إضافي):

- `app/section/car.tsx` · `real-estate.tsx` · `factories.tsx` · `materials.tsx` · `booking.tsx`  
- مسجّلة في `app/_layout.tsx` كـ Stack screens

### 2.2 قواعد العزل (PASS/FAIL)

| # | قاعدة | FAIL إن… |
|---|-------|----------|
| I1 | Discover يدفع `SECTION_ROUTE` فقط | ظهر `onBrowseSection` أو تحديث criteria مشترك |
| I2 | لا CategoryTabs داخل الميني-آب | ظهر اختيار فئة يغيّر القسم |
| I3 | FilterSheet فيه `lockCategory` | يمكن تغيير الفئة من الفلاتر |
| I4 | كل mount = `useSearchMiniApp` خاص بالقسم | حالة قسم تتسرب لقسم آخر |
| I5 | Search tab على Discover بلا كروم فئات (MOB-05) | CategoryTabs/filter على Discover |
| I6 | Stay = rose `SectionBackdrop` | هيدر أسود / `StaysHomeHeader` |
| I7 | تحت الهيدر: chips ثم نتائج · `hScroll.flexGrow:0` | فراغ أسود يبلع الشاشة |
| I8 | هيدر قسم: iconBtn **12** · H **16** · أزرار `flexShrink:0` | أزرار خارج الشريط |
| I9 | Website معزول | أي تعديل website في موجة الموبايل |
| I10 | حارس 29/29 أخضر بعد كل وحدة | أي انتكاس |

### 2.3 ماذا يوجد «صح زي ما هو» داخل كل ميني-آب (لا invent)

| ميني-آب | محتوى صحيح متوقع | فلاتر/engines متوقعة |
|---------|-------------------|----------------------|
| **Car** | نتائج سيارات فقط · عنوان سيارات | engines سيارات · origin إن وُجد · sort chip |
| **Real Estate** | عقارات فقط · map إن `?map=1` | engines عقار · rentalTerm إن rent · map pill مضغوط |
| **Factories** | مرافق/صناعي facilities | engines/industrial chips القسم · empty→RFQ إن مفعّل |
| **Materials** | مواد | engines مواد · empty→demand إن مفعّل |
| **Booking/Stay** | هيرو وردي · taxonomy إيجار السوق | tabs مدة الإيجار · **لا** category tabs · badge rentalTerm |

لا نضيف بوابات ENTER · لا نغيّر شكل الكروت · لا نوحّد Stay مع SectionSearchApp.

---

## 3) تعريف «الوحدة الجراحية» (وحدة واحدة = PR slice واحد)

```
وحدة = (ميني-آب واحد) OR (ملف شاشة واحد لعيب topPad) OR (سطر style واحد مثبت)
```

### 3.1 دورة الوحدة (إلزامية — بالراحة)

```
U0  اختر وحدة من الطابور فقط — لا تقفز
U1  اقرأ العقد §2 + MUST-KEEP — هل الوحدة تلمسه؟ إن نعم: نطاق أدق
U2  إثبات: شوت أو rg يثبت العيب (ملف:سطر)
U3  ورقة عيب ميلي (SCREEN-MM §5) إن كان بصرياً
U4  غيّر أقل كود ممكن — ممنوع JSX reorder / مكون جديد / «تحسين شكل»
U5  حارس 29/29 + typecheck للمسار الملموس
U6  Conflict check (§5) — لا يلمس وحدتين في نفس الـ commit إن تعارضتا
U7  Push tip → Replit شوت الوحدة فقط → Owner PASS/FAIL
U8  إن FAIL: نفس الوحدة فقط — لا توسعة نطاق
U9  علّم الوحدة ✅ في هذا الملف → انتقل للتالية
```

### 3.2 حجم التغيير المسموح داخل الوحدة

| مسموح | ممنوع |
|-------|--------|
| رقم style واحد / تعبير topPad واحد | redesign هيدر/كروت |
| hitSlop / flexShrink / minWidth | جسر melt جديد |
| تعليق يوضح ليه (سطرين) | تعديل 5 ميني-آبات دفعة |
| توسيع حارس بسطر assert | فتح W3 / Banks live |
| i18n مفتاح ناقص مثبت | Website / search-contract |

---

## 4) طابور الوحدات (ممنهج · بلا تداخل)

> نفّذ بالرقم. وحدة جديدة لا تُفتح قبل ✅ السابقة إلا بأمر Owner صريح.

### المرحلة Gate — قبل أي صيانة جديدة

| ID | الوحدة | من | قبول |
|----|--------|-----|------|
| **G0** | دمج #37 (تنظيف i18n/boom + هيدر 12) إلى main بعد شوتات الهوية | Owner | main أخضر · guard 29/29 |
| **G1** | Replit confirm tip: Discover كروت · 5 بوابات تفتح routes الصحيحة | Replit | جدول §6 لكل بوابة |

*إن لم يُدمَج #37 بعد: الصيانة الجراحية تتم على فرع #37 فقط — لا على main المتلوّث.*

---

### المرحلة A — فصل شيك الميني-آبات (صفر redesign)

كل وحدة A = **تحقق فصل + إصلاح جراحي فقط إن FAIL**.

| ID | الميني-آب | فحص كود (Cursor) | فحص شوت (Replit) | إصلاح مسموح إن FAIL |
|----|-----------|------------------|------------------|---------------------|
| **A1** | Car | route→`category=car` · lockCategory · لا melt | هيدر داخل · chips · نتائج سيارات · لا void | style هيدر/void فقط |
| **A2** | Real Estate | `real_estate` · `?map=1` latch · لا update Search | نفس + map pill | latch/style فقط |
| **A3** | Factories | `facilities` على `/section/factories` | عنوان مرافق · نتائج القسم | props/shell فقط إن غلط |
| **A4** | Materials | `materials` | عنوان مواد · نتائج القسم | نفس |
| **A5** | Booking/Stay | لا StaysHomeHeader · rose · lockCategory | هيرو وردي · أزرار داخل · tabs مدة | ممنوع أسود · ممنوع ENTER |
| **A6** | Discover host | SECTION_ROUTE كامل · MOB-05 · لا ENTER rows | 2×2 صور · بوابات صحيحة | ممنوع redesign كروت |
| **A7** | Separation audit نهائي | `node --test …guard` 29/29 + rg لا onBrowseSection | — | حارس فقط |

**Conflict freeze أثناء A:**  
لا تُفتح وحدات B (topPad صفحات أخرى) · لا W3 · لا Banks live · لا listings create.

---

### المرحلة B — صفحات خارج الميني-آب (بعد A7 ✅)

ملف بملف · نفس دورة U0–U9 · عيب معروف: `Platform.OS === "web" ? 67`.

ترتيب مقترح (لا يُخلط مع Search):

| ID | ملف | إصلاح وحيد |
|----|-----|------------|
| B1 | `profile.tsx` | topPad حقيقي |
| B2 | `banks.tsx` | topPad حقيقي |
| B3 | `onboarding.tsx` | topPad حقيقي |
| B4 | `wallet.tsx` | topPad |
| B5 | `plans.tsx` | topPad |
| B6 | `invoices.tsx` + `[id]` | topPad |
| B7 | `rfq/*` | topPad |
| B8 | `rentals/hub` + `bookings` | topPad |
| B9 | `business/*` (supply, investments, …) | topPad ملف×ملف |
| B10 | `listings/*` + `listing/[id]` | topPad |

كل ملف = commit منفصل مفضّل · شوت الهيدر فقط.

---

### المرحلة C — حرف/نص عند الإثبات فقط

| ID | موضوع | شرط |
|----|--------|-----|
| C1 | Legal AR (MOB-08) | شوت يثبت نقص عربي |
| C2 | Banks honesty | موجود — لا «دليل شركاء حي» بدون Start |

---

### المرحلة D — كبيرة ومفصولة تماماً (لا وسط UI)

| ID | موضوع | شرط البدء |
|----|--------|-----------|
| D1 | W3 FI AuthZ | Owner يقول **Start** |
| D2 | Banks live directory | قرار منتج + عقد بيانات |
| D3 | EAS / أسرار / smoke إنتاج | OPS Owner |
| D4 | Website | مسار منعزل charter |

---

## 5) فحص التعارض (Conflict Check) قبل كل commit

أجب بنعم/لا. أي «نعم» على ممنوع = أوقف.

| سؤال | مطلوب |
|------|--------|
| هل الـ diff يلمس أكثر من ميني-آب واحد بدون سبب حارس مشترك؟ | لا |
| هل يغيّر شكل Discover cards أو Stay palette؟ | لا |
| هل يعيد `onBrowseSection` أو يحدّث criteria من Discover؟ | لا |
| هل يصغّر `iconBtn` تحت 12؟ | لا |
| هل يلمس `banco-website` / search-contract؟ | لا |
| هل يفتح W3/Banks live؟ | لا |
| هل يحذف اختبار حارس؟ | لا |
| هل MUST-KEEP ما زال محفوظاً سطراً سطراً؟ | نعم |

---

## 6) شيكليست قبول ميني-آب (انسخ لكل من A1–A5)

```text
MINIAPP: car | real_estate | factories | materials | booking
SHA: …
CODE:
  [ ] shell props category صحيح
  [ ] lockCategory موجود
  [ ] لا category tabs
  [ ] hScroll flexGrow 0
  [ ] header iconBtn 12 / H16 / buttons inside (غير Stay) أو Stay rose
SHOT:
  [ ] فتح من Discover يصل للـ route الصحيح
  [ ] العنوان/الهوية = القسم
  [ ] أزرار الهيدر داخل الشريط
  [ ] لا فراغ أسود تحت الهيدر
  [ ] نتائج/engines تخص القسم فقط
  [ ] رجوع لا يلوّث Search tab criteria
GUARD: 29/29 PASS
OWNER: PASS | FAIL → (عيب واحد فقط للإعادة)
```

---

## 7) أوامر مرجعية سريعة (كل وحدة)

```bash
# فصل + انتكاس
node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs

# تأكيد لا جسر melt
rg -n "onBrowseSection|browseSection" artifacts/banco-mobile

# تأكيد routes
rg -n "SECTION_ROUTE|section/car|section/booking" artifacts/banco-mobile/components/SearchDiscover.tsx

# تأكيد قفل الأقسام في الـ shells
sed -n '1,20p' artifacts/banco-mobile/app/section/*.tsx
```

---

## 8) حالة التنفيذ الحي (حدّث بعد كل وحدة)

| ID | حالة | Tip/SHA | ملاحظة |
|----|------|---------|--------|
| G0 | ✅ merge #39 | `0696c66` | FI mobile finish على main |
| G1 | ▶️ Replit | — | شوتات تأكيد بصري |
| G2 | ▶️ كود | `cursor/section-g2-finish-4322` | لا وميض engine chips · Stay trim · مصفوفة سوق تحت الشريط |
| A1–A5 | ✅ كود | hard-lock category على Section + Stay | شوتات Replit للتأكيد البصري |
| A6 | ✅ كود | SECTION_ROUTE + كروت + لا melt (حارس) | — |
| A7 | ✅ كود | guard **35/35** + hard locks + no fake 67 | — |
| B* | ✅ كود | **صفر** `web ? 67` تحت `banco-mobile` (كل الشاشات) | شوتات هيدر عشوائية للتأكيد |
| C* | ⏸ | Legal/AR عند إثبات شوت | — |
| D* | ⏸ | — | Start فقط |

---

## 9) مراجع مترابطة (اقرأ بهذا الترتيب عند الشك)

1. **هذا الملف** — خطة الصيانة الجراحية  
2. `PAGE-BY-PAGE-HEADER-VOID-INVENTORY-AR.md` — جرد هيدر/void  
3. `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md` — قياس ميلي  
4. `INVESTIGATION-AND-REPAIR-PLAN-AR.md` — MUST-KEEP + جناة  
5. `ROLES-CURSOR-VS-REPLIT-AR.md` · `REPLIT-RUN-FULL-NOW-AR.md`  
6. حارس: `artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs`

---

## 10) تعهد التنفيذ

- نشتغل **بالراحة** · وحدة واحدة ظاهرة في الـ commit message.  
- كل ميني-آب يفتح **قسمه** كما العقد §2.  
- فصل شيك = I1–I10 خضر + شيكليست §6.  
- أي طلب «خلّي الشكل أحلى» وسط الصيانة = **رفض** حتى أمر Owner مستقل بعنوان redesign.

— Cursor · Surgical Mini-App Maintenance Plan · Highest precision · No redesign · No conflict
