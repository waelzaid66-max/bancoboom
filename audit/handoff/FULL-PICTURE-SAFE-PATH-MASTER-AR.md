# الصورة الكاملة — المشكلات · التصميم الغلط · الأقسام · البنية · مسار آمن بلا هدم

**تاريخ:** 2026-07-19  
**Tip:** اطبع `git rev-parse --short HEAD` (عند الكتابة ≈ `8de853b` على PR #37)  
**طلب المالك:** ارسم الصورة الكاملة · ادرس البنية عميقاً · خطط تفصيلية آمنة · اعرض النتائج عالياً · **كل المشاكل** · **بدون أي هدم** · نعدّل المسار بفهم · أصل الإصلاح كان بسيطاً لو اتفهم صح — التشطيب مش كبير؛ التنفيذ كان غلط.

**وضع الوثيقة:** فهم + خطة قرار · **لا كود هدم/rebuild** حتى Start على بند مسمّى.

---

## 0) الرسالة للمالك (حكم عالي)

| ما ظنّه الوكلاء | الحقيقة |
|-----------------|--------|
| التطبيق بايظ · لازم redesign / shrink / ENTER / هيدر جديد | التطبيق **غني ومبني** — معظم الكسر = انحدار أو تشطيب طبقة أو وصل مسار |
| «نصلّح الشكل» بتصغير الأزرار وقلب الهيرو | كسر طبقات إنشائية كانت شغّالة |
| Banks ناقصة ملف | Banks فيها إنشاءات ثقيلة (Claude FI) — الهب العام brochure فقط |
| مشكلة واحدة كبيرة | مشاكل **صغيرة متراكمة** من تنفيذ غلط فوق بنية صحيحة |

**جملتك صحيحة:**  
> أصلحك كان بسيط لو اتفهم صح — المشاكل التشطيب ما كانتش كبيرة تماماً — أنتم نفّذتم غلط.

**مسارنا من الآن:** فهم طبقات → لمس وحدة مسمّاة → حارس أخضر → تأكيد بصري · **ممنوع هدم · ممنوع redesign واسع · ممنوع توسيع طبقة قسم على قسم آخر.**

---

## 1) لوحة نتائج عاليه (Dashboard)

### 1.1 حالة العوالم (الآن)

| عالم | البنية | ما يراه المستخدم | الحكم |
|------|--------|------------------|--------|
| **Discover** | كروت 2×2 → `SECTION_ROUTE` | بوابات أقسام + Stay + Business hubs | ✅ عزل مُثبَّت + حارس |
| **Car / RE / Factories / Materials** | `SectionSearchApp` + `useSearchMiniApp` مقفول فئة | ميني-آب كامل بحث/فلاتر/نتائج | ✅ نواة سليمة · تشطيب هيدر مُثبَّت |
| **Stay / Booking** | `BookingStaysApp` منفصل · وردي · rent lock | هيرو + StayCard + taxonomy إيجار | ✅ رُمّم بعد redesign أسود خاطئ |
| **Search tab** | محرك مشترك + Discover overlay | قوي كمحرك · ثنائية مقصودة مع الميني-آب | ✅ MOB-05 يخفي كروم على Discover |
| **Banks / FI** | `/business/banks` خارج stack الخمسة | brochure عام + inbox مخفي للأعضاء | ⚠️ إنشاءات صحيحة · عرض عام ناقص |
| **Business B2B** | supply / investments / RFQ… | عوالم منفصلة | ⚠️ خارج موجة الأقسام — لا تُخلط |
| **Admin financing** | CRM + فروع/مقاعد (P0) | تشغيل يدوي | ⚠️ حلقة Verify→link ما زالت بشرية |
| **Website** | منفصل بميثاق | لا يُلمس من موجات الموبايل | 🔒 |

### 1.2 تصنيف كل ما نراه (بدون خلط)

| النوع | المعنى | أمثلة |
|-------|--------|-------|
| **A انحدار Regression** | كان صح وانكسر | melt Discover `93b650b` · demote FI |
| **B تنفيذ غلط Wrong fix** | إصلاح بسيط اتفسّر redesign | ENTER بدل كروت · هيدر Stay أسود · iconBtn 12→8 · fake topPad 67 |
| **C تشطيب Finish** | طبقة ظاهرة ناقصة دقة | هيدر/void/دولة باسم · RTL · sort chip مكان |
| **D استكمال حلقة Completion** | Backend موجود · سطح/وصل ناقص | Banks directory · Verify→inbox · AuthZ وكيل |
| **E ادّعاء > واقع Claims** | نسخ/كوميت أوسع من الكود | «شركاء موثّقون» · «مقفول حتى التوثيق» · suite 3/3 |
| **F تشغيل Ops** | كود على Git · الجهاز قديم | Replit بدون pull = لوم كاذب |

**مفتاح الفهم:** أغلب ألم الشاشات الأخيرة = **B + C** (تنفيذ غلط على تشطيب).  
أغلب ألم البنوك = **D + E** (استكمال + صدق) فوق إنشاءات Claude الناجحة.

### 1.3 ما أُصلح فعلاً (لا تلمسه — MUST-KEEP)

| # | القدرة | حالة |
|---|--------|------|
| 1 | `SECTION_ROUTE` + لا melt | ✅ حارس |
| 2 | كروت Discover صور 2×2 | ✅ |
| 3 | Stay هيرو وردي · لا `StaysHomeHeader` أسود | ✅ |
| 4 | `hScroll.flexGrow:0` (لا فراغ أسود) | ✅ |
| 5 | دولة علم+اسم | ✅ |
| 6 | iconBtn pad **12** · أزرار لا تُصغَّر | ✅ + حارس |
| 7 | لا `web?67` تحت banco-mobile | ✅ حارس 29 |
| 8 | قفل فئة Section + قفل Stay rent | ✅ hard-lock |
| 9 | Banks honesty copy + لا chevron ميت | ✅ نصياً |
| 10 | FI `intent=fi` على مسار الهب (P0 على الفرع) | ✅ على tip |
| 11 | حارس `section-miniapp-guard` | **29/29** |

### 1.4 ما زال مفتوحاً (قائمة كاملة مختصرة)

| ID | السطح | النوع | شدة | ملاحظة |
|----|-------|-------|-----|--------|
| OPEN-01 | تأكيد بصري Replit على tip | F Ops | عالية للثقة | S056/S057 + أقسام |
| OPEN-02 | Banks دليل شركاء حي | D | منتج | قرار D1 Owner — بلا Start لا كود |
| OPEN-03 | FI AuthZ وكيل PATCH (F-SEC-01) | D أمان | Critical | Owner «كمل» → Cursor على `cursor/fi-authz-agent-patch-4322` (R1+R2) |
| OPEN-04 | Verify لا يربط inbox تلقائياً | D ترتيب | عالية تشغيل | F-ORD-01 |
| OPEN-05 | لا state machine لحالات الطلب | D أمان | عالية | W3 |
| OPEN-06 | باقة/اشتراك FI | D | متوسطة | مؤجّل |
| OPEN-07 | نقل آمن بين وسطاء | D | متوسطة | مؤجّل |
| OPEN-08 | Join يظهر فوق أعضاء FI | C/UX | منخفضة | F-UX-02 |
| OPEN-09 | لا اختصار inbox من البروفايل | C/UX | منخفضة | F-UX-01 |
| OPEN-10 | Profile→onboarding مسار FI أضعف | D | متوسطة | بعد P0 جزئي |
| OPEN-11 | LEGAL AR parity (MOB-08) | C | منخفضة | لاحقاً |
| OPEN-12 | Host hub اكتشاف إيجار يومي | D اكتشاف | متوسطة | خارج موجة الأقسام |
| OPEN-13 | أيقونات أسماء غير مسجّلة → fallback | C | منخفضة | SVG registry |
| OPEN-14 | اختبارات FI inbox/AuthZ ضعيفة | D جودة | عالية قبل إنتاج FI | R10 |
| OPEN-15 | دمج/محاذاة main↔Replit | F | عالية | W0 قبل لوم بصري |

> القائمة للتوجيه — **ليس** أمراً بتنفيذ الكل دفعة واحدة.

---

## 2) الصورة الكاملة: المشكلة الظاهرة ↔ التصميم الغلط ↔ القسم ↔ الطبقة

```
المستخدم يشوف مشكلة
        ↓
هل هي انحدار (A) أم تنفيذ غلط (B) أم تشطيب (C) أم حلقة ناقصة (D)؟
        ↓
أي عالم؟ Discover | Section×4 | Stay | Banks | Business | Admin
        ↓
أي طبقة؟  L-PORTAL | L-SHELL | L-MINI | L-CHROME | L-DATA | L-OVERLAY | Infra
        ↓
لمس طبقة واحدة مسمّاة فقط · حارس · شوت · موافقة إن بصري
```

### 2.1 مصفوفة الربط (الأهم)

| ما يُرى | التصميم/التنفيذ الغلط | القسم/العالم | الطبقة الصحيحة للمس | الإصلاح البسيط الصحيح | غلط الوكيل |
|---------|----------------------|--------------|---------------------|------------------------|------------|
| أقسام تذوب في Search | قطع `SECTION_ROUTE` / `onBrowseSection` | Discover→Search | L-PORTAL + routes | إرجاع push للميني-آب | seed كوميت واسع |
| كروت صور → صفوف ENTER | قراءة شوت = «مربعات فاشلة» | Discover | L-PORTAL طبقات الكرت | إبقاء 2×2 صور | redesign بوابات |
| Stay هيدر أسود | «premium» بدل وردي | Stay | L-MINI hero | إرجاع rose hero | بناء هيدر جديد |
| فراغ أسود تحت الهيدر | `hScroll` يأكل flex | Section/Stay | L-CHROME chip strip | `flexGrow:0` | pad عشوائي |
| أزرار خارجة من الهيدر | تصغير iconBtn 12→8 | Section | L-CHROME header | pad 12 + flexShrink 0 | shrink «للزحمة» |
| هيدر مسحوق على ويب | `topPad=67` وهمي | كل الشاشات | L-CHROME safe-area | `max(insets.top, web?12:0)` | نسخ رقم بين الشاشات |
| دولة علم فقط | compact مفرط | chips | L-CHROME | علم+اسم | — |
| Banks «مش صفحة خاصة» | توقع ميني-آب بحث | Banks | عالم Business منفصل | فهم: `/business/banks` ≠ section | لصق engines/Search |
| بنوك بلا شركاء | brochure فوق CRM | Banks | Layer A عرض | قرار D1: copy أو directory | اختراع بيانات / chevron |
| بنك يسجّل dealer | CTA بلا intent | Banks→onboarding | مسار هوية | `intent=fi` | فورم تاجر مشترك |
| Inbox مش ظاهر | عضوية/ربط يدوي | Banks Layer B | تشغيل أدمن | ربط owner — مش redesign هب | توسيع Search |
| وكيل يعدّل فرع غيره | AuthZ غير متماثل | API FI | FinancingService | فحص فرع على PATCH | تأجيل W3 |

### 2.2 خريطة العوالم (لا تُخلط)

```
                    ┌──────────── Discover ────────────┐
                    │  2×2: Car RE Fac Mat             │
                    │  Stay portal (وردي)              │
                    │  Business hubs: Supply / Importers│
                    │  Banks hub (أزرق فقط)            │
                    └───────────┬──────────────────────┘
          ┌─────────────┬───────┼───────────┬──────────────┐
          ▼             ▼       ▼           ▼              ▼
     /section/car   /section/…  /section/booking   /business/banks   /business/*
     SectionSearchApp           BookingStaysApp     brochure+inbox    B2B worlds
          │             │            │                  │
          └────── shared kernel ─────┘                  └── FI API (منفصل عن search)
                 (criteria/API/facets)
```

**قانون:** Banks و B2B **ليسوا** أقسام Search.  
Stay **ليس** SectionSearchApp بجلد مختلف.

---

## 3) دراسة البنية التحتية (عميقة — ملخّص تشغيلي)

### 3.1 السلم الكامل

| رمز | الطبقة | ملفات قلب | Conflict إن… |
|-----|--------|-----------|--------------|
| I0 | Expo Router Stack/Tabs | `app/_layout.tsx` · `(tabs)/` | نسيان تسجيل `section/*` |
| I1 | Host Search | `search.tsx` | حقن criteria من Discover · إظهار كروم على Discover |
| I2 | Portal | `SearchDiscover.tsx` | ENTER · onBrowseSection · تغيير أبعاد كرت بلا أمر |
| I3 | Shell رفيع | `app/section/*.tsx` | منطق قسم جوه الـ shell |
| I4 | Mini-app body | `SectionSearchApp` · `BookingStaysApp` | توحيد Stay مع Section |
| I5 | State/Data | `useSearchMiniApp` · `searchParams.ts` | مشاركة instance مع Search tab |
| I6 | Facets/Engines | `facets.ts` · engines داخل section | facilities↔materials اختلاط |
| I7 | Filter/Results/Map | `FilterSheet` · Results · Map | فك `lockCategory` · حقن فئة خريطة |
| I8 | Theme/Identity | `sectionTheme.ts` · `SectionBackdrop` | أزرق لغير Banks · أسود Stay |
| I9 | i18n/RTL/Icons | `i18n.ts` · `icons.tsx` | مسار useI18n غلط · أيقونة غير مسجّلة |
| I10 | FI pipeline | `FinancingService` · `banks.tsx` · admin financing | خلط مع search · لمس بلا إعلان |
| I11 | Auth/Roles | Clerk · UserService · roles | demote FI · owner لأي user |
| I12 | Guard/CI | `section-miniapp-guard` · ci.yml | حذف اختبار «عشان يعدّي» |
| I13 | Seed/Demo | `seed.ts` | seed على إنتاج · شركاء وهميون |

### 3.2 العقود الحديدية (من الذاكرة الداخلية + الحارس)

1. SectionSearchApp **additive** — لا يعيد بناء Search tab.  
2. كل دخول ميني-آب = instance جديد لـ `useSearchMiniApp` (reset بالـ lifecycle).  
3. dirty = فرق عن `baselineRef` وقت الهبوط — لا defaults صلبة.  
4. Booking: `lockedEngine=rent` + لا مسح facet للـ engine.  
5. FilterSheet: `lockCategory` فقط في الميني-آب.  
6. أزرق = Banks فقط · Stay = وردي `real_estate`.  
7. لا بيانات مختلقة — أبداً.  
8. iconBtn ≥ 12 · لا fake 67 · لا ENTER · لا StaysHomeHeader.

### 3.3 منطقة Conflict الحرمة

أي تعديل على I5–I7 أو I10 بدون:
- وثيقة أثر على الأقسام الخمسة (+ Banks إن FI)،
- موافقة Owner إن بصري/منتج،
- حارس أخضر،

= **مرفوض** حتى لو «يحل شاشة واحدة».

---

## 4) لماذا التنفيذ كان غلط (تشريح الخطأ المتكرر)

| نمط وكيل | مثال | الإصلاح البسيط الصحيح | ما فعلوه |
|----------|------|------------------------|----------|
| قراءة شوت كحكم منتج | مربعات «فاشلة» | قياس طبقات الكرت | ENTER |
| توحيد الشاشات | Stay ≈ Section | احترام بطل Stay | هيدر أسود موحّد |
| تصغير للزحمة | أزرار الهيدر | العنوان ينكمش | iconBtn 8 |
| رقم سحري بين الشاشات | topPad 67 | insets حقيقية | نسخ 67 |
| توسيع طبقة قديمة | Banks | فهم عالم FI | لصق Search/onboarding تاجر |
| ادّعاء يسبق الإنفاذ | «مقفول حتى التوثيق» | إنفاذ أو تصحيح نسخ | copy فقط |
| موجات كثيرة دفعة | W1+W3+directory | موجة واحدة مسمّاة | اصطدام ملفات |

**الخلاصة:** البنية كانت كافية. المطلوب كان **تشطيب طبقة + وصل مسار + صدق نسخ** — لا إعادة بناء التطبيق.

---

## 5) خطة تفصيلية آمنة بالكامل (بلا هدم)

### 5.0 قواعد المسار (دائمة)

```
1) لا هدم · لا revert واسع · لا redesign Discover/Stay بلا أمر
2) وحدة واحدة مسمّاة في الأمر (مثال: «Banks honesty ب» لا «صلّح البنوك»)
3) لمس طبقة واحدة · ملف معلن · إن مشترك → إعلان handoff أولاً
4) حارس 29/29 أخضر قبل الشوت
5) Replit = تأكيد بصري فقط (لا صيانة كود)
6) Copilot = UNTRUSTED
7) W3 FI AuthZ = Claude بعد Start — Cursor لا يخطفه
```

### 5.1 المسار المرحلي (آمن)

| مرحلة | الاسم | ماذا | هدم؟ | شرط خروج |
|------:|-------|------|------|----------|
| **G0** | محاذاة الحقيقة | Owner/Replit يؤكد tip = اللي على الجهاز · شوتات أقسام+Banks | لا | SHA معروف + شوتات |
| **G1** | قفل ما اتصلح | لا تراجع عن MUST-KEEP · حارس يبقى | لا | 29/29 |
| **G2** | تشطيب بصري متبقٍ (إن وُجد بعد الشوت) | pad/زر/void **ميلي** على سطح مسمّى فقط | لا | بروتوكول mm + موافقة |
| **G3** | Banks — قرار D1 | brochure أعمق (ب) **أو** دليل حي (ج) | لا | اختيار Owner صريح |
| **G4** | FI حلقة تشغيل | Verify→link / Profile FI / Join فوق الأعضاء | لا | بعد G3 أو موازٍ محدود |
| **G5** | W3 أمان | AuthZ وكيل + state machine (+ docs لاحقاً) | جزئي | Owner «كمل» → Cursor R1+R2؛ باقي docs/Verify→link بلا Start |
| **G6** | مؤجّلات منتج | باقة FI · نقل آمن · Host hub · Legal AR | لا | قرار لاحق |

**ممنوع:** القفز لـ G5/G6 قبل G0–G1.  
**ممنوع:** «نصلّح كل OPEN-* الأسبوع ده».

### 5.2 دورة وحدة جراحية (كل بند مفتوح)

```
Owner يسمّي البند (OPEN-xx أو قسم/جزء)
  → Cursor يكتب أثر الطبقات (ملف:سطر)
  → موافقة إن لمس بصري/Infra مشتركة
  → Patch طبقة واحدة
  → guard 29/29 (+ اختبارات الوحدة إن FI)
  → Push
  → Replit confirm shots فقط
  → Owner اعتماد أو رفض
```

### 5.3 خريطة قرار Banks (من Claude D1 + خياراتنا)

| اختيار Owner | المرحلة | ماذا يُلمس | ماذا يُحرَّم |
|--------------|---------|------------|-------------|
| **أ** Confirm | G0 | لا كود | كل شيء |
| **ب** Honesty أعمق | G3 | i18n + ترتيب PRODUCTS كشرح | API directory · Search |
| **ج** دليل حي | G3 Start | endpoint عام آمن + قائمة نشطة فقط | بيانات مختلقة · melt لـ section |
| **د** حلقة تشغيل | G4 | onboarding/profile/admin link UX | redesign هب كامل |
| **هـ** W3 أمان | G5 | FinancingService AuthZ | Cursor منفرداً · تخطّي Claude |

### 5.4 ما لن نفعله أبداً في هذا المسار

- مسح `SECTION_ROUTE` أو الميني-آبس  
- إعادة ENTER أو هيدر Stay أسود  
- تصغير iconBtn تحت 12  
- إرجاع `topPad=67`  
- جعل Banks داخل `SectionSearchApp`  
- Seed شركاء بنوك وهميين للعرض  
- دمج موجات FI أمان + directory + Stay في PR واحد  
- صيانة كود من Replit  

---

## 6) كل المشاكل — فهرس واحد (مرجع سريع)

### مُغلقة (لا تُعاد فتحاً كـ «مهمة جديدة»)

Melt · ENTER · Stay أسود · void flexGrow · country label · iconBtn8 · fake67 (موبايل) · useI18n غلط على #37 · Banks chevron/misleading subtitle · intent=fi على هب الفرع · MOB-01/04/05/07 (حسب دمجها) · حارس 29.

### مفتوحة — تشطيب/Ops

OPEN-01 · OPEN-08 · OPEN-09 · OPEN-11 · OPEN-13 · OPEN-15.

### مفتوحة — استكمال/أمان FI (قرار Owner)

OPEN-02 · OPEN-03 · OPEN-04 · OPEN-05 · OPEN-06 · OPEN-07 · OPEN-10 · OPEN-14.

### مفتوحة — اكتشاف منتج جانبي

OPEN-12 (Host hub) · رحلات B2B التفصيلية خارج نطاق موجة الأقسام الحالية.

---

## 7) مراجع الوثائق (لا تُستبدل — تُكمَّل)

| وثيقة | دورها |
|-------|--------|
| `INVESTIGATION-AND-REPAIR-PLAN-AR.md` | من/ليه + MUST-KEEP |
| `ARCHITECTURE-LAYERS-PER-MINIAPP-AR.md` | طبقات إنشائية |
| `MINIAPP-PER-SECTION-DEEP-STUDY-AR.md` | أهداف قسم × قسم |
| `BANKS-FINANCIERS-FORENSIC-LAYERS-AR.md` | Banks + كتالوج Claude |
| `audit/financing/00…11` | FI جنائي عميق |
| `SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md` | دورة وحدة |
| `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md` | قياس ميلي |
| `.agents/memory/banco-section-*.md` | عقود حية |

**هذه الوثيقة = اللوحة الأم.** أي عمل لاحق يُشار إليه برقم مرحلة (G0…) أو OPEN-xx.

---

## 8) طلب اعتماد المسار (Owner)

المطلوب منك جملة واحدة من:

1. **«أعتمد FULL-PICTURE G0→G1»** — تأكيد بصري + قفل MUST-KEEP فقط  
2. **«أعتمد + Banks خيار _»** — أ/ب/ج/د/هـ  
3. **«أعتمد وحدة تشطيب مسمّاة: …»** — مثال: هيدر factories فقط  

بدون جملة اعتماد: **لا كود جديد** — المسار يبقى فهم وتوجيه.

---

*نهاية اللوحة — Cursor. التطبيق كامل؛ الإصلاح تشطيب ووصل بفهم طبقات. التنفيذ الغلط هو اللي كبّر الموضوع.*
