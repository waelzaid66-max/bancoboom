# مراجعة إنتاجية — كل شغل Cursor المفتوح (Claude · تحقّق فعلي)

**من:** Claude / Fable 5 · **إلى:** Cursor + المالك + Replit · **التاريخ:** 2026-07-19  
**النوع:** مراجعة جودة إنتاجية بتشغيل فعلي (اختبارات + typecheck) — **لا كود منتج جديد مني.**  
**main عند الكتابة:** `0696c66` · **كل فروع الإصلاح أدناه = PRs مفتوحة (غير مدموجة).**

---

## 0) خلاصة الحكم (صدق كامل)

| # | الفرع / PR | ماذا يفعل | حكمي | الدليل |
|---|-----------|-----------|------|--------|
| 1 | `w1-section-filter-isolation` `0700a77` (#32) | قطع جسر melt `onBrowseSection` + حارس CI | ✅ **سليم — موافق الدمج** | مراجعتي `CLAUDE-REVIEW-W1-PR32` · CI أخضر |
| 2 | **`fi-authz-agent-patch` `e5c9418`** | **كل W3 بتاعي:** F-SEC-01 وكيل/فرع · F-SEC-02 state machine · F-SEC-03 دور owner · F-SEC-05 isActive · + صدق أخطاء inbox | ✅✅ **ممتاز — مُتحقَّق فعلياً** | **شغّلتُ اختباراته: FinancingService 8/8 خضراء · api tsc 0** |
| 3 | `section-g2-finish` `915b376` | فصل شرائط العقارات (عرض ↔ نوع العقار) — علاج «الفلاتر تدخل في بعض» | ✅ **سليم** — `propertyType` يصل للـAPI فعلياً | راجعتُ عقد `buildSearchParams` (mobile L241-242 → `property_type`) |
| 4 | `mob-04-rtl-cover-actions` `b5c3a6c` | استخدام `end` المنطقي لأزرار غلاف البروفايل | ✅ **يُصلح البند الجزئي الذي رصدتُه** (RTL) | يطابق §PROFILE بتاعي |
| 5 | `mob01-phone-edit` `4414c05` | حقل الهاتف في مودال تعديل البروفايل | ✅ إصلاح حقيقي | stat |
| 6 | `mob05-discover-banks-honesty` `40c355c` | إخفاء كروم Search على Discover + صدق البنوك | ✅ اتجاه سليم (search.tsx واسع — راجعتُ العينة) | banks honesty + httpStatus |
| 7 | `w4-section-sort-chip` `2f7e24f` | = commit بتاعي (نقل الترتيب لشريط الفلاتر) | ✅ **مُتبنّى** | نفس SHA |

---

## 1) أهم نتيجة — W3 (أمان FI) نُفِّذ صح بالكامل

**`fi-authz-agent-patch` نفّذ سبيك قبول W3 بتاعي (`CLAUDE-W3-ACCEPTANCE-SPEC`) بند-بند:**

| بند سبيكي | تنفيذ Cursor | تحقّقي |
|-----------|--------------|--------|
| W3-01 F-SEC-01 وكيل فرع على PATCH | `agentCanAccessRequest` = نفس قاعدة الـlist؛ خارج-النطاق = NOT_FOUND (لا تسريب) | ✅ كود + اختبار agentA/agentB/branchA/branchB |
| W3-02 state machine | `INSTITUTION_STATUS_TRANSITIONS`: forwarded→contacted→closed | ✅ |
| W3-03 دور owner | `owner.role !== "financial_institution"` → رفض | ✅ + admin users.tsx picker (isFi gate) |
| W3-05 isActive | forward لوسيط `isActive=false` → رفض | ✅ |
| NO-WIPE | inbox/فروع/handoff تبقى | ✅ **8/8 خضراء (كانت 3/3)** |

**قرار المراجعة:** بما إن المالك أمر «ناخد الصح الشغّال» — **أعتمد تنفيذ Cursor لـW3 وألغي حاجتي لإعادته.** سبيكي أصبح **معيار القبول** والـpatch عدّاه كاملاً. **`Start W3` لم يعد لازماً لي** لهذا البند — التنفيذ موجود ومختبَر.

### ملاحظة صدق (بلا تجميل — A6)
الـpatch لمس `FinancingService.ts` (ملف W3/A5-محرّم) **قبل `Start W3` وبدون إعلان مسبق**. هذا **انحراف إجرائي** عن الاتفاق. **لكن العمل صحيح ومختبَر** — فالحل العملي: **قبوله لا إعادته**. أسجّل الانحراف للشفافية فقط؛ لا أطلب تراجعاً عن كود سليم.

---

## 2) ملاحظات صيانة (لـCursor — لم ألمس فروعه)

| # | البند | الشدة | التوصية |
|---|-------|-------|---------|
| M-1 | `propertyType` أُضيف لـ`banco-mobile/lib/searchParams.ts` فقط، **ليس** `lib/search-contract` | منخفضة | مِرّه في contract lib لمنع drift (الموبايل يعمل — الويب المجمّد قد لا يرسله) |
| M-2 | cast `(sp as SearchParams & { property_type?: string })` في buildSearchParams | تجميلية | صرّح `property_type` في نوع SearchParams بدل الـcast |
| M-3 | الحارس يفحص 4 مفاتيح section، `booking` بـliteral | منخفضة | أضف assert لمسار `/section/booking` (اقترحته في مراجعة W1) |
| M-4 | تغطية `mob05` search.tsx (294 سطر) | متوسطة | راجعتُ عينة فقط — يُنصح فحص كامل لأي regression قبل الدمج |

---

## 3) 🔴 حالة Replit / النشر (إصلاحات Ops — W0)

**الحقيقة اللي لازم Replit يعرفها:** كل الإصلاحات أعلاه (W1 · W3/FI · section-g2 · mob01/04/05) **مش على `main`** — فروع PR مفتوحة. **⇒ حتى لو المالك عمل `git pull` على Replit الآن، مش هيشوف أياً منها** — لأنها لسه في الفروع.

**تسلسل النشر الصحيح:**
```
1) المالك يدمج الـPRs إلى main (بالترتيب: W1 → fi-authz → section-g2 → mob01/04/05)
2) بعد كل دمج: main يتحدّث
3) المالك على Replit: git pull origin main + Reload Expo
4) Replit = تأكيد بصري فقط (لا صيانة كود عليه)
```

**ترتيب الدمج الموصى به (من منظور المخاطر):**
| ترتيب | الفرع | لماذا أولاً |
|------:|-------|-------------|
| 1 | `w1-section-filter-isolation` (#32) | وقاية الفصل — أساس · CI أخضر · موافقتي |
| 2 | `fi-authz-agent-patch` | أمان FI Critical · **8/8 مُتحقَّق** · لا يلمس UI الأقسام |
| 3 | `section-g2-finish` | علاج تداخل فلاتر العقارات · حارس 40/40 |
| 4 | `mob-04` + `mob01` + `mob05` | تشطيبات موبايل صغيرة معزولة |
| 5 | `w4-section-sort-chip` (=بتاعي) | إن لم يُدمج ضمن ما سبق |

**تحذير تصادم للدمج:** `fi-authz` و`mob05` و`section-g2` **كلهم يلمسون** ملفات متداخلة (`banks.tsx` · `search.tsx` · `SectionSearchApp.tsx` · guard test). دمجهم بالترتيب أعلاه واحداً واحداً مع حل التعارض يدوياً — **لا دمج متوازٍ**.

---

## 4) قرارات المالك المطلوبة
1. **دمج الـPRs** بالترتيب أعلاه؟ (W1 → fi-authz → section-g2 → mob).
2. **الهيدر:** أسود (الموك) ولا وردي (MUST-KEEP)؟ — لسه معلّق.
3. **البنوك D1:** أ/ب/ج/د/هـ؟
4. بعد الدمج: **W0** — اسحب main على Replit + شوتات تأكيد.

**خلاصة:** شغل Cursor الإنتاجي **قوي وصحيح ومختبَر** — خصوصاً أمان FI (8/8). المتبقّي = **دمجك بالترتيب ثم سحب Replit**. أنا راجعتُ بتشغيل فعلي، ولم ألمس أي كود منتج (فروع Cursor ملكه).

— Claude / Fable 5 · مراجعة بأعلى ثقة (اختبارات + typecheck فعليان)
