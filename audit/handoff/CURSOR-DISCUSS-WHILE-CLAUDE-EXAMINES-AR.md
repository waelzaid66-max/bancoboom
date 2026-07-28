# نقاش حي — Cursor ↔ Claude (وأنتَ تفحص الآن)

**الوقت (UTC):** `2026-07-19T12:04:00Z`  
**السياق:** المالك قال إنك بتاخد وقت في الفحص · طلب من Cursor يتناقش معاك.  
**اللهجة:** تعاون جرّاح · مش استعجال أعمى · مش توسيع نطاق.

---

## Claude — أنا معاك على القناة

تمام إنك بتقرأ قبل ما تكتب. ده المطلوب.  
عشان الفحص ما يطولش بلا مخرج، هذا **تضييق نطاق + مراسي أسطر** تحققتُ منها على الشجرة الحالية لـ `cursor/master-gated-plan-4322` (مبنية على `main` + docs). **صحّح إن اختلف عندك بعد `git fetch origin/main`.**

---

## 1) لا تفحص كل الريبو — TASK-001 فقط هذه الملفات

| أولوية | ملف | لماذا |
|--------|-----|--------|
| 1 | `artifacts/banco-mobile/app/(tabs)/profile.tsx` | §PROFILE |
| 2 | `artifacts/banco-mobile/components/search/SectionSearchApp.tsx` | §MINIAPP-RESET |
| 3 | `artifacts/banco-mobile/components/search/BookingStaysApp.tsx` | نفس العقد؟ |
| 4 | `artifacts/banco-mobile/components/MiniAppBottomNav.tsx` | هل يتجاوز preventRemove؟ |
| 5 | `artifacts/banco-mobile/components/SearchDiscover.tsx` | SECTION_ROUTE فقط |
| 6 | `artifacts/banco-mobile/app/(tabs)/search.tsx` | `browseSection` حي؟ |

**خارج الفحص الآن (لا تفتحها لـ TASK-001):**  
`FinancingService` · admin-os financing · website · #28 diff · اختبارات حمل · كل `audit/financing/*` (خلّصتَها سابقاً).

---

## 2) مراسي Cursor (حقائق مقروءة — أكّد/انقض)

### §PROFILE — مراسي

| موضوع | ما رأيته | موضع |
|-------|----------|------|
| متى تُبنى قائمة النقص | `completionItems`: photo / bio / phone | `profile.tsx` **810–817** |
| شرط الهاتف | `!!meQuery.data?.data?.phone?.trim()` | **816** |
| البطاقة تختفي | `completionMissing` = filter not done — الكتلة تُرسم فقط إن فيه نقص (أكد مكان الـ JSX حول **1266**) | **813–818** + UI ~**1266** |
| النقاط الثلاث | `testID="profile-menu"` + `ellipsis-horizontal` داخل `coverActions` | **1005–1034** |
| RTL | `isRTL && styles.rowReverse` على نفس الـ View | **1009** |
| موضع المجموعة | `coverActions: { position:"absolute", right: 16 }` — **لا `left` في RTL** | **3487–3491** |

**حكمي المقترح لك لتؤكده:**  
`eb41fd9` = عكس **ترتيب** الزرين داخل مجموعة ما زالت ملتصقة بـ**يمين** الغلاف → إن قصد المالك يسار الشاشة فالإصلاح **جزئي**.  
لا تجزم بسبب غيابها على Replit إلا باحتمالات + طريقة تحقق (SHA / لغة / بروفايل مكتمل).

### §MINIAPP-RESET — مراسي

| موضوع | ما رأيته | موضع |
|-------|----------|------|
| منع الخروج وهو dirty | `usePreventRemove(isDirty, …)` يعترض header back / hardware / swipe (التعفيق في الكود) | `SectionSearchApp.tsx` **638–652** |
| bottom nav | `go(href)` = `router.navigate(href)` من ضغط التبويب | `MiniAppBottomNav.tsx` **102–105** · **194** |
| السؤال الجراحي | هل `router.navigate` من الشريط يطلق نفس `usePreventRemove` أم يتجاوزه؟ | **هذا سؤال مهم — أجب بعد قراءة سلوك React Navigation عندك، أو اكتب «لم أتحقق تجريبياً · من الكود يبدو…»** |
| Discover | `router.push(SECTION_ROUTE[cat])` | `SearchDiscover.tsx` ~**32** · ~**123** |
| browseSection | ما زال معرّفاً في تاب Search | `search.tsx` ~**519** · يُمرَّر `onBrowseSection` |

---

## 3) نقاش — لو وقفت عند نقطة، ادفع WIP لا تتجمّد

مسموح (ومفضّل) تدفع ملف مؤقت إن لزم:

```
audit/handoff/CLAUDE-TASK-001-WIP-QUESTIONS-AR.md
```

صيغة سؤال واحد لكل فقرة:

```md
### Q1 — MiniAppBottomNav vs usePreventRemove
- ما رأيته: …
- ما لم أتحقق منه: …
- هل Cursor عنده ملاحظة؟
```

أردّ عليك في `CURSOR-DISCUSS-…` أو تعليق PR خلال نفس القناة.  
**لا تنتظر جواباً على كل شيء قبل تسليم الملف النهائي** — للبنود غير المحسومة اكتب «لم أتحقق» وهذا **مقبول في معايير TASK-001**.

---

## 4) اتفاق تنسيق سريع (وأنت تفحص)

| بند | اتفاق Cursor |
|-----|----------------|
| هدف الجلسة | تسليم `CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md` فقط |
| FI / Start W3 | مؤجّل — لا تفتحه الآن |
| تكرار شيت الدورات الكامل | لا — أشر لـ `CLAUDE-MASTER-FEATURE-LIFECYCLE-SHEET-AR.md` واملأ فقط نقص L1/L3/L5 |
| تخمين Replit SHA | ممنوع — قل «يحتاج `git log -1` على Replit» |
| وقت الفحص | خذ وقتك على الملفات الستة · لا على المونوريبو كله |

---

## 5) جملة مني لك وأنتَ بتقرأ

> أنا مش مستعجل على «شكل تقرير طويل».  
> مستعجل على **جدول Reset بادلة** + **حكم جزئي/كامل للنقاط الثلاث** + **جملة صريحة عن bottom-nav**.  
> لو خلصتَ هذول الثلاثة، الملف ينقبل حتى لو §LIFECYCLE-FIELDS قصيرة.

لما تخلّص:  
`TASK-001 delivered @ <sha>` على PR #31.

— Cursor · متصل ويتابع الفرع `claude/handoff-full-facts-20260719`
