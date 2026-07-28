# بروتوكول فحص الشاشات والمسافات والأزرار بالميلي — أعلى دقة

**تاريخ:** 2026-07-19  
**الغرض:** فحص وإصلاح بصري **جراحي** بالميليمتر/الـ dp دون redesign ودون فقد MUST-KEEP.  
**ينفّذ بعد:** دمج #37 + شوت حقيقي يثبت العيب (انظر `INVESTIGATION-AND-REPAIR-PLAN-AR.md`).  
**Roles:** Cursor يصلح · Replit يصوّر/يقيس فقط · Owner يحكم.

---

## 0) وحدات القياس (لا تخلط)

| وحدة | المعنى | متى تستخدم |
|------|--------|------------|
| **dp** | وحدة React Native / StyleSheet | **مصدر الحقيقة في الكود** |
| **px منطقي** | نفس dp على الشاشة المنطقية | قراءة من الشوت بعد قصّ الإطار |
| **mm فيزيائي** | على الجهاز الحقيقي | حكم Owner بالعين + مسطرة على الشوت عند الحاجة |
| **hit area** | مساحة اللمس = حجم الزر المرئي + `hitSlop` | قبول/رفض الأزرار |

**تحويل عملي للشوتات (قاعدة عمل):**

```
scale = devicePixelRatio تقريباً (Expo: 2 أو 3 غالباً)
dp ≈ pixels_on_screenshot / scale
mm ≈ dp × (25.4 / 160)   ← عند 160dpi أساس Android
```

على iPhone حديثة: اعتبر **1 dp ≈ 0.16 mm** كتقريب حكم؛ **القبول النهائي = مطابقة جدول CANONICAL بالـ dp** ثم حكم العين بالميلي على الشوت.

**عتبة الخطأ المسموحة (جراحية):**

| نوع العنصر | انحراف مقبول عن CANONICAL | فوقها = FAIL |
|------------|---------------------------|--------------|
| padding / gap أفقي رئيسي | ≤ **2 dp** | > 2 dp |
| ارتفاع كرت / هيدر / شريط | ≤ **2 dp** | > 2 dp |
| زر أيقونة (مربع مرئي) | ≤ **2 dp** لكل ضلع | > 2 dp |
| hit area فعّالة | لا تقل عن **44×44 dp** | < 44 |
| انحراف محاذاة صف (baseline) | ≤ **1 dp** | > 1 dp |
| فراغ أسود / void غير مقصود | **0** | أي فراغ = FAIL |

لا «تقريب بالعين» بدون رقم. لا تغيير أكثر من **±4 dp** في PR واحد بدون أمر Owner إن كان السطح Discover/Stay.

---

## 1) طبقات الفحص (إلزامية بالترتيب)

```
L1 كود ثابت     → اقرأ StyleSheet + topPad + hitSlop من الملف
L2 حارس آلي     → section-miniapp-guard + typecheck
L3 شوت مرجعي    → نفس الجهاز/Expo/لغة/SHA
L4 قياس على الشوت → مسطرة شبكة + جدول أرقام
L5 حكم Owner    → PASS / FAIL / FIX-REQUEST
L6 إصلاح جراحي  → سطر واحد أو style واحد · لا redesign
L7 إعادة قياس   → نفس جدول L4 على tip جديد
```

تخطي أي طبقة = فحص مرفوض.

---

## 2) أدوات القياس المعتمدة

### 2.1 من الكود (Cursor — إلزامي قبل أي commit)

```bash
# ابحث عن أرقام السطح المستهدف فقط
rg -n "padding|gap|height|width|hitSlop|topPad|borderRadius|minHeight" \
  artifacts/banco-mobile/components/SearchDiscover.tsx

# ارفض topPad=67 خارج web-safe الحقيقي
rg -n 'Platform\.OS === "web" \? 67' artifacts/banco-mobile
```

املأ **ورقة قياس** (§5) من الأرقام المقروءة — لا من الذاكرة.

### 2.2 من الشوت (Replit / Owner)

1. Full Reload على SHA المثبت.  
2. صوّر **بدون قصّ** للحواف إن أمكن (أو قصّ ثابت موثّق).  
3. افتح الشوت على شبكة **8 dp** (أو 4 dp للمناطق الحرجة).  
4. قِس: هامش يسار/يمين · فجوة بين كرتين · ارتفاع الكرت · مربع الزر · المسافة تحت الشريط الآمن · المسافة فوق Tab bar/FAB.  
5. سجّل في الجدول: `عنصر | متوقع_dp | مقاس_dp | Δ | PASS/FAIL`.

### 2.3 من الجهاز (اختياري عالي الدقة)

- `measureInWindow` على `testID` معروف (`stays-back`, `section-back`, `section-filter-toggle`…).  
- لا تغيّر UI لإضافة أدوات قياس دائمة بدون أمر Owner.

---

## 3) جدول CANONICAL — مسافات وأزرار (مصدر من الكود الحي)

> أي إصلاح يجب أن **يقترب من هذا الجدول** أو يوثّق انحرافاً مقصوداً بأمر Owner.  
> الملفات: `SearchDiscover.tsx` · `search.tsx` · `SectionSearchApp.tsx` · `BookingStaysApp.tsx`.

### 3.1 Discover — شبكة الأقسام

| عنصر | القيمة CANONICAL | ملف |
|------|------------------|------|
| هامش أفقي الشبكة | `paddingHorizontal: 16` | SearchDiscover |
| فجوة بين الكروت | `gap: 12` | SearchDiscover |
| عرض الكرت | `47%` + `flexGrow: 1` | sectionCardWrap |
| ارتفاع كرت القسم | **118** | sectionCard |
| نصف قطر الكرت | **20** | sectionCard |
| padding داخل الكرت | **14** | sectionCard |
| شارة أيقونة | **36×36** · radius **12** | sectionBadge |
| خط التمييز | **3×15** | sectionAccent |
| عنوان القسم | fontSize **16** Bold | sectionLabel |
| ممنوع داخل الكرت | نص ENTER / بوابة نصية | حارس |
| padding سفلي المحتوى | `paddingBottom: 200` (يحمي من FAB) | content |

### 3.2 Safe area / topPad (قاعدة حديدية)

| سطح | الصيغة الصحيحة | ممنوع |
|-----|----------------|--------|
| Search / Section / Stay | `Math.max(insets.top, Platform.OS === "web" ? 12 : 0)` | `web ? 67` |
| Stay hero | `paddingTop: topPad + 8` | هيدر أسود / StaysHomeHeader |
| Section header | `paddingTop: topPad + 10` | سحق العنوان بالأيقونات |
| Search host Discover | `topPad + 6` | — |
| Search host غير Discover | `topPad + 12` | — |
| profile / banks / onboarding | ⚠️ ما زال بعضها `web ? 67` → مرحلة S2.1 **ملف بملف** | تغيير تخطيط الصفحة |

### 3.3 أزرار الهيدر (Section / Stay)

| عنصر | مرئي | hitSlop | hit فعّال تقريباً |
|------|------|---------|-------------------|
| Section header H-pad | **16** (مثل Search host) | — | H12 = خطر خروج أزرار |
| backBtn | `padding: 8` · `flexShrink: 0` · أيقونة 22 | **12** | ≥ 44 ✓ |
| iconBtn (بحث/فلتر) | **`padding: 12`** · `flexShrink: 0` · أيقونة 18 | (المنطقة) | ≥ 44 ✓ — **ممنوع 8** |
| عنوان الهيدر | `minWidth: 0` · ينكمش | — | الأزرار لا تُضغط |
| Stay back / actions | 36×36 · `flexShrink: 0` | 12 على back | داخل الهيرو الوردي |
| مسح بحث / أيقونات ثانوية | — | **8** | ارفع لـ 12 إن الشوت يثبت صعوبة اللمس |
| Market country | يجب **علم + label** | — | علم فقط = FAIL |

> Owner: تصغير `iconBtn` 12→8 خرّج الأزرار من الهيدر. الحارس يرفض الرجوع لـ 8.

### 3.4 شريط الفلاتر / chips

| عنصر | CANONICAL |
|------|-----------|
| `hScroll.flexGrow` | **0** (أي شيء غير 0 = فراغ أسود محتمل) |
| chipStrip padding | H **12** · Top **8** · Bottom **2** · gap **8** |
| stripChip | padH **14** · padV **7** · radius **18** |
| sortChip | **34×34** · radius **17** |
| chipStripDivider | 1×20 |
| map CTA | مضغوط كهوست Search — ليس حبة عملاقة |

### 3.5 Search bar داخل القسم

| عنصر | CANONICAL |
|------|-----------|
| margins | H **16** · Top **10** |
| padding | H **14** · V **10** |
| radius | **12** |
| input font | **15** |

### 3.6 قواعد زر عام (كل الشاشات)

1. **مرئي ≥ 32×32** للأيقونة-فقط؛ **مفضّل 36×36**.  
2. **لمس فعّال ≥ 44×44** عبر حجم + hitSlop.  
3. المسافة بين مركزَي زرّين متجاورين ≥ **48 dp** إن أمكن؛ إن ضاق الهيدر: صغّر padding الأيقونة **قبل** تصغير العنوان.  
4. لا تعتمد على اللون وحده — الحدود/التباين باقية.  
5. RTL: استخدم `start`/`end` و`rowDir` — ممنوع `left`/`right` الثابت على أزرار الهيدر.

---

## 4) مصفوفة شاشات حرجة — ماذا تقيس بالضبط

لكل شوت: املأ الأعمدة الخمسة. لا PASS بدون أرقام.

### P-DISCOVER

| # | القياس | متوقع |
|---|--------|--------|
| D1 | هامش يسار/يمين للشبكة | 16 dp |
| D2 | فجوة أفقية بين كرتين | 12 dp |
| D3 | ارتفاع كرت القسم | 118 dp |
| D4 | محتوى الكرت = صورة+عنوان+شارة — **لا ENTER** | نعم |
| D5 | لا CategoryTabs تحت Discover | نعم |
| D6 | فراغ أسود غريب تحت الشبكة؟ | لا |
| D7 | تداخل آخر كرت مع FAB/Tab؟ | لا (pad سفلي كافٍ) |

### P-SECTION (car / RE / factories / materials)

| # | القياس | متوقع |
|---|--------|--------|
| S1 | topPad = insets حقيقي (ليس 67) | نعم |
| S2 | صف الهيدر: back · عنوان · search · filter بمحاذاة واحدة | Δ ≤ 1 dp |
| S3 | العنوان غير مسحوق / غير مقطوع | نعم |
| S4 | chip strip بلا void أسود | flexGrow 0 |
| S5 | country = علم + اسم | نعم |
| S6 | sort chip موجود في الشريط | 34×34 |
| S7 | map pill مضغوط إن ظاهر | ≈ هوست Search |
| S8 | أزرار back/search/filter قابلة للمس بسهولة | hit ≥ 44 |

### P-STAY

| # | القياس | متوقع |
|---|--------|--------|
| B1 | هيرو **وردي/SectionBackdrop** — ليس أسود كامل | نعم |
| B2 | `stays-back` ظاهر وقابل للمس | hitSlop 12 |
| B3 | لا ملف/مكوّن StaysHomeHeader | نعم |
| B4 | شريط chips flexGrow 0 | نعم |
| B5 | CTA فارغ / rentalTerm badge إن ينطبق | كما MUST-KEEP |

### P-SEARCH-HOST

| # | القياس | متوقع |
|---|--------|--------|
| H1 | Discover: لا كروم فئات | نعم |
| H2 | paddingTop Discover = topPad+6 | نعم |
| H3 | نتائج: topPad+12 + CategoryTabs | نعم |

### P-PROFILE / BANKS / ONBOARDING (مرحلة S2 — لا تُخلط مع Discover)

| # | القياس | متوقع بعد الإصلاح الجراحي |
|---|--------|---------------------------|
| X1 | لا `topPad = 67` | `Math.max(insets.top, web?12:0)` |
| X2 | أزرار الغلاف hitSlop ≥ 8 | ويفضّل 12 للأيقونات الصغيرة |
| X3 | لا تغيير تخطيط الغلاف/الشبكة إلا بأمر Owner | — |

---

## 5) ورقة عيب (نسخ لصق لكل FAIL)

```
DEFECT_ID: UI-MM-___
SHA: <short>
SCREEN: Discover | Stay | Section/<id> | Search | Profile | Banks | …
LANG: AR | EN
SHOT: <filename>

ELEMENT:
CODE_FILE: <path>
CODE_LINE_OR_STYLE: <name>

EXPECTED_DP: …
MEASURED_DP: …
DELTA_DP: …
MM_NOTE: <اختياري حكم عين>

HIT_VISIBLE: …×…
HIT_SLOP: …
HIT_EFFECTIVE: …×…   (≥44؟)

MUST_KEEP_TOUCHED: no | yes→which
ALLOWED_FIX: single style | single file pad | …
FORBIDDEN: redesign | wide revert | new component | Replit code

OWNER: PASS | FAIL | FIX-REQUEST
```

---

## 6) طريقة الإصلاح الجراحية (Cursor فقط)

### 6.1 خوارزمية

```
1. عيب مثبت بورقة §5 + شوت
2. حدّد style key واحد أو تعبير topPad واحد
3. تأكد MUST-KEEP (قائمة التحقيق) لا يُمس
4. غيّر الرقم/التعبير فقط — لا تعيد ترتيب JSX
5. شغّل: test:section-guard + typecheck للفلتر
6. ادفع tip → Replit يعيد نفس ورقة القياس
7. إن Δ ما زال > عتبة: كرّر خطوة واحدة — لا «إعادة تصميم»
```

### 6.2 أمثلة مسموحة

| عيب | إصلاح مسموح |
|-----|-------------|
| `topPad=67` على banks | استبدال بالصيغة الصحيحة في نفس الملف |
| زر صعب اللمس | رفع `hitSlop` 8→12 أو padding 8→10 |
| void أسود | تثبيت `flexGrow: 0` على hScroll |
| كرت أقصر من 118 | إعادة `height: 118` إن انحرف — لا اختراع ارتفاع جديد |
| تداخل FAB | زيادة `paddingBottom` فقط |

### 6.3 أمثلة ممنوعة (هذا ما دمّر الشاشات سابقاً)

| ممنوع | ليه |
|-------|-----|
| استبدال كروت الصور بصفوف ENTER | سوء قراءة شوت |
| هيدر أسود «premium» بدل الوردي | redesign |
| توحيد كل الشاشات على padding واحد عشوائي | يكسر CANONICAL |
| «نصلّح المسافات» بتغيير 10 ملفات دفعة | فقد إمكانيات وسط الضجيج |
| Replit يعدّل StyleSheet | دور تأكيد فقط |

---

## 7) أوامر تشغيل الفحص السريع (قبل/بعد)

```bash
cd artifacts/banco-mobile
pnpm run test:section-guard    # 29/29 إلزامي
pnpm exec tsc --noEmit         # أو سكربت typecheck المعتمد في CI

# جرد أزرار بلا hitSlop كافٍ (مراجعة يدوية للقائمة)
rg -n "Pressable|Touchable" app components -g '*.tsx' | head

# جرد topPad الخطِر
rg -n 'topPad|67' app components -g '*.tsx'
```

---

## 8) جدول قبول الشوت بالميلي (Replit يعبّئ)

لكل من P1–P6 (أو S### من مصفوفة الشوتات الكاملة):

| الحقل | قيمة |
|------|------|
| SYNC_SHA | |
| SCREEN | |
| GRID | 4dp / 8dp |
| MARGINS_H | measured / expected 16 |
| CARD_H | measured / expected 118 (Discover) |
| GAP | measured / expected 12 |
| HEADER_ALIGN | PASS/FAIL |
| BLACK_VOID | none / FAIL |
| BUTTONS | قائمة testID + hit PASS/FAIL |
| ENTER_ROWS | none مطلوبة |
| STAY_HEADER | rose / FAIL-black |
| OVERALL | PASS / FAIL |

**قاعدة:** شوت بدون أرقام مسافات للأزرار الحرجة = **مرفوض** حتى لو الشكل «تمام».

---

## 9) ترتيب التنفيذ مع خطة الإصلاح الكبرى

```
[0] دمج #37 بعد شوتات الهوية
[1] ثبّت CANONICAL هذا الملف كمرجع أرقام
[2] أي عيب مسافة/زر → ورقة §5 → إصلاح §6 → إعادة قياس §8
[3] S2.1 topPad=67 ملف بملف فقط
[4] لا تخلط مع W3 / Banks live / EAS
```

---

## 10) مراجع

- تحقيق + MUST-KEEP: `INVESTIGATION-AND-REPAIR-PLAN-AR.md`  
- سلسلة الضرر: `FULL-DAMAGE-CHAIN-AND-BRANCH-MATRIX-AR.md`  
- شوتات كاملة: `REPLIT-SCREENSHOT-MATRIX-FULL-ORDERED-AR.md`  
- تشغيل Replit الآن: `REPLIT-RUN-FULL-NOW-AR.md`  
- حارس: `artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs`

— Cursor · Screen MM Protocol
