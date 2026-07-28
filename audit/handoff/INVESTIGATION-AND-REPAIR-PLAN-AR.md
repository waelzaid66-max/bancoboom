# تحقيق كامل + خطة إصلاح (بعد بحث) — بدون فقد إمكانيات

**تاريخ:** 2026-07-19  
**Tip الحكم:** HEAD حي على PR #37 (`git rev-parse --short origin/cursor/discover-enter-fix-4322`) · `origin/main` عند كتابة التقرير ≈ `14d3a89`  
**قاعدة حديدية:** أي إصلاح لاحق = جراحي فقط · ممنوع redesign · ممنوع revert واسع · ممنوع صيانة Replit

---

## الجزء أ — التحقيق: ماذا حدث · من · ليه

### أ-1 مصفوفة المشكلات

| # | المشكلة | من (بريد) | SHA جذر | ليه ظنّوها صح | الحالة الآن |
|---|---------|-----------|---------|----------------|-------------|
| 1 | ذوبان Discover→Search | Bancoeg / Replit Agent | `93b650b` / `c49b3b9` | كوميت seed/refactor واسع مسح العزل | ✅ FIXED (#25/#32) على main |
| 2 | ENTER بدل كروت الصور | Cursor Agent | `6ba5f1b` | شوتات = «مربعات فاشلة» → بوابات ENTER | ✅ FIXED (`6b18408`) على main |
| 3 | Stay هيدر أسود | Cursor Agent | `9af39ef`→`6ba5f1b` | هيرو وردي «طويل» → premium أسود | ✅ FIXED (`b539108`) على main |
| 4 | فراغ أسود في الأقسام | عيب layout كامن | fix `55e9ffe` | ScrollView بلا `flexGrow:0` | ✅ FIXED على main |
| 5 | هيدر مسحوق / pad 67 | Cursor (نمط ويب) | fix `55e9ffe` في Section/Stay | safe-area وهمي | ✅ FIXED في أقسام/Stay/Search · ⚠️ باقي على شاشات أخرى |
| 6 | زر دولة علم فقط | Banco Group (M7) | `78dcd88` | compact by design | ✅ FIXED (`55e9ffe`) |
| 7 | خريطة عملاقة | مقاسات ميني-آب | fix `55e9ffe` | لم تُطابق الهوست | ✅ FIXED |
| 8 | `useI18n` من مسار غلط | Cursor Agent | `251e1bf` | RTL سريع | ✅ على #37 فقط · ❌ main ما زال مكسور |
| 9 | PR #24 مضلّل | Cursor branch | فوق كود أسود | عنوان docs | ✅ CLOSED |
| 10 | PR #23 Stay أسود | Cursor | `9af39ef` | شكل شيك | ✅ CLOSED |
| 11 | Copilot كاذب/غير موثوق | بروتوكول | `dd5b0b5` | مسح بلا دليل | UNTRUSTED دائماً |
| 12 | تلوّث docs boom على main | بقايا `6ba5f1b` | — | لم تُمسَح عند الدمج المتسرع | ✅ يُنظَّف بدمج #37 |

### أ-2 الخلاصة الجنائية

1. **ضرر تاريخي (melt):** Replit/Bancoeg — ثم أُصلح بـ W1.  
2. **كارثة الشاشات الأخيرة:** Cursor Agent بسوء قراءة شوتات → redesign بدل إصلاح.  
3. **Replit في موجة 19 يوليو:** لم يكتب ENTER/الأسود — دورها الآن تأكيد فقط.  
4. **الخطر الأكبر الآن:** revert واسع أو دمج #23/#24 أو «إعادة تصميم» تاني يمسح إصلاحات شهور.

---

## الجزء ب — ما يجب ألا يُفقد أبداً (MUST-KEEP)

> أي خطة إصلاح تفشل إن لم تحمِ هذه القائمة صراحةً.

| القدرة | أين / دليل | PR/SHA |
|--------|------------|--------|
| عزل الأقسام `SECTION_ROUTE` + لا melt | `SearchDiscover.tsx` + guard | #32 / #25 |
| كروت Discover 2×2 صور | `sectionGrid`/`sectionCard` | `6b18408` |
| Stay هيرو وردي + `SectionBackdrop` | `BookingStaysApp.tsx` | `b539108` |
| MOB-05 إخفاء كروم Search على Discover | `search.tsx` | #36 |
| MOB-07 خريطة → `/section/real-estate?map=1` | search + Section latch | `a4b5ec0`… |
| W4 شريحة ترتيب في شريط الفلاتر | `SectionSearchApp` sortChip | #34 |
| MOB-01 هاتف في تعديل الملف | `profile.tsx` | #35 |
| MOB-04 RTL غلاف الملف | `end: 16` | #33 |
| فراغ أسود / دولة باسم / خريطة صغيرة / topPad أقسام | Section+Stay+Search | `55e9ffe` |
| Booking: rentalTerm badge + empty CTA + RTL | `BookingStaysApp` | `b3224bf` |
| Banks honesty copy | banks + i18n | #36 |
| CI كامل + منع seed ديمو على الإنتاج | ci.yml + seed.ts | #38 |
| ErrorBoundary + FATAL API base | `_layout.tsx` | `251e1bf` |
| أيقونات key/business/bed | `icons.tsx` | `4b0bc19` |
| BReaction RTL + استيراد LanguageContext | `BReactionButton` | tip #37 |
| FI P0 (#28) | مدمج | لا تلمسه هنا |
| عزل Website | charter | لا موجات موبايل تلمسه |

**حارس يمنع الانتكاس:** `section-miniapp-guard.test.mjs` **29/29** (يرفض ENTER و`StaysHomeHeader` ويفرض flexGrow/دولة/هيدر iconBtn 12…).

---

## الجزء ج — خطة الإصلاح (مراحل · بعد التخطيط فقط)

### مبدأ المرحلة

```
لا إصلاح كبير قبل:
  1) تحديد الملف/السطر
  2) التحقق أنه لا يكسر بند MUST-KEEP
  3) حارس أخضر
  4) أمر Owner إن كان تغييراً بصرياً في Discover/Stay
```

### المرحلة 0 — استلام النسخة الصحيحة (الآن)

| خطوة | من | ماذا |
|------|-----|------|
| 0.1 | Cursor | tip #37 = `7c4f98c` جاهز (main + تنظيف) |
| 0.2 | Replit | تأكيد فقط على tip — **ممنوع صيانة** |
| 0.3 | Owner | حكم بالعين على الشوتات |
| 0.4 | Owner/Cursor | **دمج #37 فقط** → يصلح typecheck على main ويمسح تلوّث boom |

**لا تبدأ مراحل لاحقة قبل 0.4 إلا لإصلاح حرج مثبت.**

### المرحلة 1 — استقرار main بعد دمج #37 (جراحي)

| ID | عمل | يحمي MUST-KEEP؟ |
|----|-----|-----------------|
| M1.1 | التأكد Typecheck أخضر على main بعد الدمج | نعم |
| M1.2 | التأكد عدم وجود `StaysHomeHeader` / boom docs | نعم |
| M1.3 | تشغيل guard 29/29 على main | نعم |

### المرحلة 2 — عيوب شاشات متبقية (صغيرة · قائمة صريحة)

> **طريقة القياس والإصلاح بالميلي:** اتبع `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md`  
> (طبقات L1–L7 · جدول CANONICAL dp · ورقة عيب · عتبة ≤2 dp · hit ≥44).

| ID | العيب | النطاق المسموح | ممنوع |
|----|-------|----------------|--------|
| S2.1 | `topPad = 67` على شاشات غير-قسمية (profile/banks/onboarding…) | استبدال بـ `Math.max(insets.top, web?12:0)` **ملف بملف** | تغيير تخطيط الصفحة |
| S2.2 | إثبات جهاز: Discover pad سفلي / تداخل FAB | ضبط `paddingBottom` فقط إن الشوت يثبت التداخل | إعادة ترتيب Discover |
| S2.3 | Legal AR (MOB-08) | تحقق شوت + نص فقط إن ناقص | redesign قانوني |
| S2.4 | Banks «دليل شركاء حي» | قرار منتج Owner — لا كود حتى Start | اختراع بيانات شركاء |
| S2.5 | أي انحراف مسافة/زر عن CANONICAL بعد الشوت | ورقة §5 + تعديل style واحد | redesign / دفعة ملفات |
| S2.0 | هيدر الأقسام: أزرار خرجت بعد تصغير iconBtn | إرجاع pad **12** + flexShrink0 + H16 (موجة 1) | إعادة تصغير الأزرار |

### المرحلة 3 — إمكانيات كبيرة معلقة (لا تُخلط مع مشاكل الشاشات)

| ID | الموضوع | شرط البدء |
|----|---------|-----------|
| P3.1 | W3 أمن FI / AuthZ | أمر Owner الصريح **Start** فقط |
| P3.2 | Banks live directory | قرار منتج + عقد بيانات |
| P3.3 | EAS / أسرار staging / smoke إنتاج | OPS Owner |
| P3.4 | Website | معزول — مسار مستقل |

### المرحلة 4 — وقاية دائمة

| قاعدة | تنفيذ |
|-------|--------|
| لا redesign Discover/Stay بدون أمر Owner | حارس + مراجعة Cursor |
| لا دمج فروع CLOSED (#23/#24) | مصفوفة DO-NOT-MERGE |
| لا revert لمدى واسع على تاريخ `6ba5f1b…b539108` | cherry-pick جراحي فقط |
| Replit = تأكيد SHA + شوتات | `ROLES` + `REPLIT-RUN-FULL-NOW` |
| Copilot = UNTRUSTED | لا اعتماد |

---

## الجزء د — ترتيب التنفيذ المقترح للمالك

```
[الآن]  Replit يؤكد tip 7c4f98c بالشوتات (لا صيانة)
   ↓
[قرارك] دمج PR #37 → main يفقد التلوّث ويصح typecheck
   ↓
[بعدها] مرحلة 2 فقط لما يظهر عيب في شوت حقيقي (ملف بملف)
   ↓
[منفصل] مرحلة 3 بقرار Start صريح — لا تُخلط مع UI Discover
```

---

## الجزء هـ — ماذا لا نفعل أبداً وسط «إصلاح الشاشات»

- ❌ إعادة ENTER أو هيدر أسود  
- ❌ مسح `SECTION_ROUTE` / الحارس  
- ❌ إعادة تفعيل جسر melt  
- ❌ «نرجّع فرع قديم كامل»  
- ❌ إعطاء Replit صيانة  
- ❌ فتح W3 أو Banks live صدفة  

---

## مراجع

- **خطة صيانة جراحية ميني-آب×ميني-آب:** `SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md`  
- فحص ميلي للأزرار/المسافات: `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md`  
- جرد هيدر/void: `PAGE-BY-PAGE-HEADER-VOID-INVENTORY-AR.md`  
- سلسلة الضرر: `FULL-DAMAGE-CHAIN-AND-BRANCH-MATRIX-AR.md`  
- أنت فين: `YOU-ARE-HERE-OWNER-MAP-AR.md`  
- اعتماد النسخة: `CANONICAL-CORRECT-VERSION-AR.md`  
- أدوار: `ROLES-CURSOR-VS-REPLIT-AR.md`  

— Cursor · Investigation complete · Repair plan gated · Preserve all capabilities
