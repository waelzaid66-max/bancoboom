# أوامر Copilot — يعمل تحت Cursor (استغلال كامل · تقارير حقيقية)

**من:** Cursor (قائد الجودة والتنفيذ بعد توقّف Claude)  
**إلى:** GitHub Copilot agent على هذا الريبو  
**المالك أمر:** Copilot يأخذ أوامر من Cursor · يفحص معه · يعطي تقارير حقيقية كاملة  
**قاعدة الحقائق:** اقرأ أولاً الملفات في §0 — عندك الآن التوتال

---

## §0 — اقرأ بالترتيب (إلزامي قبل أي كود)

1. `audit/handoff/CURSOR-RECEIPT-CLAUDE-TOTAL-FACTS-AR.md`  
2. `audit/handoff/MAINTENANCE-GOALS-TOTAL-AR.md`  
3. `audit/handoff/CLAUDE-RESPONSE-FULL-FACTS-AR.md`  
4. `audit/handoff/CLAUDE-MASTER-FEATURE-LIFECYCLE-SHEET-AR.md`  
5. `audit/handoff/CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md`  
6. `audit/handoff/CLAUDE-NO-EXCUSES-BROKEN-SECTIONS-AR.md`  
7. `release/PROJECT_CONTEXT.md`  
8. PR #32 و #28 و فرع `origin/claude/w4-mobile-align` (`2f7e24f`)

**ممنوع:** Start W3 · لمس `FinancingService` · مسح ميزات · توسيع عشوائي · ادّعاء اختبار جهاز بلا تشغيل.

---

## موجة Copilot الحالية = ثلاث تاسكات متوازية مرتّبة

### CP-1 — مراجعة معمارية W1 (#32) بدل TASK-002 الناقص  
**مخرج إلزامي:** `audit/handoff/COPILOT-REVIEW-W1-PR32-AR.md`

أجب بدليل ملف:سطر فقط:

| سؤال | جوابك |
|------|--------|
| هل حذف/عزل `onBrowseSection` يكسر عقداً بناه Claude؟ | نعم/لا + ملف |
| هل يبقى خطر melt عبر مسار آخر؟ | اذكر المثبت فقط (`exploreOnMap` إن لزم) |
| هل `section-miniapp-guard.test.mjs` كافٍ؟ | كافٍ / ينقصه assert… |
| هل توافق دمج #32 إلى main؟ | موافق / موافق بشرط… |

علّق على PR #32 بنتيجة الملف.

### CP-2 — تنفيذ MOB-01 (كان TASK-003 لـ Claude)  
**نطاق:** `artifacts/banco-mobile/app/(tabs)/profile.tsx` (+ i18n en/ar إن لزم فقط)  
**المواصفة:** `CLAUDE-TASK-003-FIX-MOB01-PHONE-EDIT-AR.md` — نفّذها حرفياً  
**فرع:** `copilot/mob01-phone-edit-4322` من `origin/main`  
**مخرج دليل:** `audit/handoff/COPILOT-TEST-EVIDENCE-MOB01.md` (SHA · أوامر · DEVICE: not run إن لم يتوفر Expo)

قبول Cursor:
- شريحة الهاتف تفتح مودالاً فيه حقل هاتف  
- الحفظ عبر `updateMe` (نفس مسار التسجيل)  
- صفر لمس Banks/Search/FI

### CP-3 — مراجعة كود W4 Claude + تقرير Banks صدق  
**أ)** افتح/راجع `origin/claude/w4-mobile-align` @ `2f7e24f`  
مخرج: `audit/handoff/COPILOT-REVIEW-W4-SORT-CHIP-AR.md`  
- هل النقل آمن؟ هل RTL/a11y/testID محفوظة؟ هل تكسر شيء؟  
- توصية: دمج / دمج بشرط / رفض + سبب

**ب)** تقرير صدق Banks (بحث فقط أولاً):  
مخرج: `audit/handoff/COPILOT-BANKS-HONESTY-AUDIT-AR.md`  
- PRODUCTS ثابتة · chevron · نسخ «verified partners» · ماذا يوجد في API للـdirectory  
- اقتراح إصلاح **صغير واحد** بعد قرار Owner — لا تنفّذ directory كامل دون أمر

---

## كيف تستغل قوتك (مطلوب في كل تقرير)

1. **اقرأ الكود فعلياً** (`git show` / فتح الملف) — لا تلخّص من الذاكرة.  
2. لكل ادّعاء: `path:line` أو مخرج أمر اختبار.  
3. شغّل ما تستطيع:  
   `pnpm --filter @workspace/banco-mobile run test:section-guard` (على فرع #32)  
   `pnpm run typecheck` حيث ينطبق  
4. اكتب صراحة `لم أتحقق` بدل التخمين.  
5. ادفع على فرعك + علّق على PR #31: `CP-1/2/3 delivered @ <sha>`

---

## تقسيم مع Cursor (لا تصادم ملفات)

| أنت (Copilot) الآن | Cursor الآن |
|--------------------|-------------|
| CP-1 مراجعة #32 | قيادة الخطة · دمج بعد موافقتك+Owner |
| CP-2 MOB-01 كود | مراجعة PRك وجودة |
| CP-3 مراجعة W4 + Banks audit | فتح/تحديث PRs · #33 MOB-04 · توجيه W0 |
| لا FinancingService | لا Start W3 حتى بعد #28 |

ملفات مشتركة حسّاسة — **أعلن قبل اللمس:**  
`banks.tsx` · `FinancingService.ts` · `SearchDiscover.tsx` · `onboarding.tsx`

---

## بعد إنهاء CP-1..3

Cursor يحدّث `MAINTENANCE-GOALS-TOTAL-AR.md` بحالة ✅/⏳ ويطلب من المالك دفعات الدمج بالترتيب.

— Cursor
