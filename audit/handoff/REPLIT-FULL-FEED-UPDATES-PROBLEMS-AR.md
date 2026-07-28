# تغذية Replit الكاملة — كل ما حدث · التحديثات · المشاكل · من يفعل ماذا

**التاريخ:** 2026-07-19  
**من:** Cursor (بعد استلام Claude الكامل + دمج حزمة مستقرة)  
**هدف Replit:** فهم الصورة كاملة · عرض Expo + Website · تقصّي بالشوتات · مشاركة البناء/النشر مع الفريق

---

## 0) النسخة المستقرة الآن على GitHub `main`

| | |
|--|--|
| **SHA المستهدف** | `58ddddc` |
| **يشمل** | كل ما كان على `9f4dc94` **+** W1 فصل الأقسام **+#** MOB-04 RTL غلاف **+#** W4 نقل sort للشريط |
| **CI** | أخضر على الـPRs قبل الدمج |

```bash
git pull origin main && git rev-parse HEAD
# 58ddddc07f9dc10bb50c2a267dc67cf5125048a8
```

---

## 1) ماذا حدث (ملخّص زمني صادق)

1. **ذوبان أقسام Search** اكتشف وصُوّر → forensic → **#25** استعاد Discover→mini-apps.  
2. **تحقيق FI/بنوك** (#27/#29/#30) → فجوات أمان AuthZ/state/docs + CTA مضلّل.  
3. **#28** كود P0 فصل تسجيل بنك + KYC أدمن — **ما زال غير مدمج**.  
4. **Claude** سلّم حقائق كاملة + lifecycle + surgical PROFILE/MINIAPP ثم كود W4 ثم توقّف.  
5. **Cursor** قطع جسر melt (W1) + RTL غلاف (MOB-04) + حارس CI + حزم handoff.  
6. **Copilot** تحت Cursor: CP-1/2/3 (مراجعة W1 كانت قبل الدمج؛ الآن MOB-01 + Banks audit + متابعة).  
7. **الآن:** دمج W1+#33+#34 إلى `main` → هذه هي النسخة التي يسحبها Replit.

---

## 2) الأسطح (كل حاجة تظهر)

| سطح | المسار | دور Replit |
|-----|--------|------------|
| **API** | `artifacts/api-server` | شغّال دائماً · `/healthz` |
| **Mobile Expo** | `artifacts/banco-mobile` | عرض كامل + شوتات للمالك |
| **Website** | `artifacts/banco-website` (Next :3000) | يُفرش جنب الموبايل — ميثاق: لا يلمس منطق الموبايل |
| **Admin** | `artifacts/admin-os` | عند فحص FI/#28 لاحقاً |
| **Dealer/Market** | `artifacts/dealer-os` | عند الحاجة |
| *(قديم)* `banco-web` | مجمّد نسبياً لصالح `banco-website` | لا تخلط |

---

## 3) ما أصبح مُصلَحاً على `main` (يجب أن تراه بعد السحب)

| بند | دليل |
|-----|------|
| Discover → section mini-apps | #25 + W1 حارس |
| قطع `onBrowseSection` من host Search | #32 → `3e82f7a` |
| حارس `test:section-guard` | #32 |
| غلاف Profile RTL `end` بدل `right` | #33 → `a894f5a` |
| Sort القسم في شريط الفلاتر لا 4 أيقونات هيدر | #34 → `58ddddc` |
| FI Phase 2 API + inbox (سابق Claude) | على main من قبل |
| نوتيفيكيشن ثنائي · أسواق/عملات | على main من قبل |

---

## 4) المشاكل المفتوحة (لا تتجاهلها — لا تصلح عشوائياً)

### P0 / عاجل للفهم على Expo

| ID | المشكلة | الحالة |
|----|---------|--------|
| **W0** | Replit كان خلف main → يبدوا المنتج «مكسور» | **أنت تحلها بالسحب إلى `58ddddc`** |
| **MOB-01** | شريحة «أضف هاتف» تفتح edit **بلا حقل هاتف** | Copilot CP-2 على الطريق · لا تكسر profile |
| **#28** | تسجيل بنك قد يوصل dealer · KYC أدمن ناقص على main | PR مفتوح — لا تدمج أنت قبل أمر |
| **F-SEC-01/02/03** | AuthZ فرع · state machine · owner role | W3 محظور حتى بعد #28 + جملة Start |

### P1 صدق/UX

| ID | المشكلة | من |
|----|---------|-----|
| MOB-02/03 | Banks PRODUCTS ثابتة + chevron + «شركاء موثّقون» | Copilot audit ثم قرار Owner |
| MOB-05 | CategoryTabs مع Discover | Cursor لاحقاً |
| F-CLM / docs wipe | copy≠code · documents replace | W3 |

### P2

| ID | المشكلة |
|----|---------|
| MOB-07 | `exploreOnMap` يحقن real_estate |
| MOB-08 | Legal إنجليزي فقط |
| Scale | «ملايين» غير مثبت حمل — لا تدّعِ |

تفاصيل أسطر: `CLAUDE-NO-EXCUSES-BROKEN-SECTIONS-AR.md` + تقارير Claude على نفس مجلد handoff.

---

## 5) تقسيم العمل الآن

| من | ماذا |
|----|------|
| **Replit (أنت)** | W0 سحب · تشغيل Expo+Website+API · شوتات · `REPLIT-VERIFY-REPORT-AR.md` · مساعدة نشر/أسرار على الجهاز |
| **Cursor** | قيادة · دمج مستقر · جودة · تنسيق Copilot · PRs |
| **Copilot** | MOB-01 · Banks honesty · تقارير مراجعة |
| **Claude** | متوقف بعد الحقائق/W4 — لا تنتظره لـ W0 |
| **Owner** | أسرار · اعتماد #28 · أمر Start W3 لاحقاً · مشاهدة الشوتات |

---

## 6) فلسفة لا تُكسر (من PROJECT_CONTEXT)

- Never block trade · Tiny floor · No fabricated data  
- Additive only · SVG icons only · i18n en+ar · RTL منطقي  
- اسأل عند الشك — لا force/reset/delete  

---

## 7) روابط GitHub

- خطة/قناة: https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/31  
- #28 FI P0 (لم يُدمج): https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/28  
- #23 Stay header (لم يُدمج): https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/23  

— Cursor
