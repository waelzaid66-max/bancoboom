# أوديت بصري صادق — من شوتات المالك (2026-07-19)

**الحكم:** الشوتات تُثبت انحدار UI حقيقي — ليس مبالغة.  
**الفرع المُصلَّح:** `cursor/discover-enter-fix-4322`  
**main السليم كأرضية:** `88e83ca` (لم يُمس)

---

## ما ظهر في الشوتات

| شاشة | العيب المرئي | السبب في الكود |
|------|---------------|----------------|
| أقسام (سيارات/عقارات/مصانع) | فراغ أسود ضخم + كارت واحد تحت | `ScrollView` أفقي بدون `flexGrow:0` يبلع عمود الـ flex |
| هيدر الأقسام | مضغوط / «متدمّر» | pad ويب وهمي `67` + تصغير سابق للهيدر |
| زر الدول | علم فقط بلا اسم | `MarketCountryButton` حُذف منه `triggerLabel` |
| زر الخريطة | حبة عملاقة تغطي الكروت | padding 26/14 وحجم 19 في الميني-آبس |
| Discover أسفل | تداخل FAB + خريطة + استيراد + تاب بار | `paddingBottom: 120` غير كافٍ |

---

## إصلاحات هذه الموجة (مثبتة)

1. `styles.hScroll = { flexGrow: 0 }` على شرائط الأقسام + Search rental/market  
2. إلغاء `topPad = 67` على الويب → `Math.max(insets.top, web?12:0)`  
3. استرجاع مقاسات هيدر القسم (18 / أيقونة 26 / pad 10)  
4. استرجاع نص الدولة في `MarketCountryButton`  
5. تصغير زر الخريطة ليطابق Search host  
6. Discover `paddingBottom: 200`  
7. حراس جدد في `section-miniapp-guard` تمنع رجوع الفراغ الأسود وflag-only

---

## ما لم يكن «تعمد تدمير main»

- كل الشغل على فرع مسودة #37 — `main @ 88e83ca` لم يُدمَج فيه هذا بعد  
- جزء من العيوب (pad 67، flag-only) كان موجوداً أيضاً على مسارات سابقة؛ الشوتات جعلته ظاهراً على الجهاز/الويب

---

## تحديث شكوى الأقسام

Stay رُجّع للهيرو الوردي من `main` — الهيدر الأسود محذوف.  
انظر `OWNER-COMPLAINT-SECTIONS-RESTORE-AR.md`.

## أمر Replit بعد السحب (تشغيل فقط)

```bash
git fetch && git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322
node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs
# توقّع: 25/25 PASS — rose Stay + flexGrow + country label
npx expo start --clear
# شوتات: Discover · سيارات · عقارات · مصانع · Stay
# Stay = هيرو وردي · Discover = كروت صور 2×2 · لا فراغ أسود · دولة باسم
```

— Cursor · Visual forensic
