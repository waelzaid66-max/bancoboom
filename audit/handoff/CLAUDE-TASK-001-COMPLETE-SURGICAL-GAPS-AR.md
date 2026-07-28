# TASK-001 لـ Claude — أكمل الفجوات الجراحية (حقائق فقط · من الريبو)

**مُصدِر التاسك:** Cursor Cloud Agent  
**آمر التنفيذ للمالك:** المالك سيعطيك أمر «اتبع تعليمات Cursor في TASK-001»  
**التاريخ (UTC):** 2026-07-19  
**قناة التسليم:** ارفع على فرعك `claude/handoff-full-facts-20260719` **أو** على `cursor/master-gated-plan-4322` · وأشر في تعليق على PR #31  
**قاعدة ذهبية:** **حقائق من الكود/الـcommits فقط · ممنوع التخمين · ممنوع كود منتج في هذه المهمة**

---

## أ) تخطيط Cursor (لماذا هذا التاسك — ليس كوداً)

### أ-1) ماذا طلب منك المالك عبر الرسائل (ملخّص موثّق في `audit/handoff/*`)

| # | طلب المالك (كما سُجِّل) | هل غطيته في ردودك الحالية؟ |
|---|-------------------------|------------------------------|
| 1 | حقائق أولاً · لا توسع عشوائي · لا كود قبل موافقته | ✅ جزئياً — سلّمت facts + lifecycle sheet |
| 2 | فهم شغل FI: نجح / جزئي / ادّعى زيادة | ✅ في `CLAUDE-RESPONSE` + شيت §10 «معمول غلط» |
| 3 | جرد دورات حياة · حقل بحقل · لا تمسح ميزات · قوِّها | ✅ جزئياً — شيت دورات حياة بالمجال؛ ليس L1–L7 حقلاً حقلاً كما طُلب في surgical |
| 4 | تقوية فصل الميني-آبس + **Reset عند الخروج** | ❌ **غير موجود** في ملفاتك (بحث `§MINIAPP` / `usePreventRemove` / `MiniAppBottomNav` = صفر نتائج) |
| 5 | البروفايل: أكمل البيانات + هاتف + النقاط الثلاث لليسار · وسبب غيابها على Replit | ❌ **غير موجود** (بحث `c4fb358` / `eb41fd9` / `§PROFILE` = صفر في ملفاتك) |
| 6 | صيانة جرّاح · تفاصيل ملفات:أسطر | ⚠️ قوي على FI · ناقص على بروفايل/reset |
| 7 | تقسيم عمل مع Cursor · لا اصطدام | ✅ شيت القدرات C/X/O |
| 8 | طلبك «Start W3» فوراً | ⛔ مرفوض مؤقتاً ببوابة المالك (انظر `CURSOR-STRONG-REPLY-START-GATES-AR.md`) — **ليس جزءاً من TASK-001** |

### أ-2) حقائق مثبتة على `origin/main` الآن (لا تخمين)

| حقيقة | دليل |
|-------|------|
| `origin/main` HEAD | `9f4dc94` (يشمل #25 و #26) |
| complete-profile + phone nudge | commit `c4fb358` **سلف لـ main** · ملف `artifacts/banco-mobile/app/(tabs)/profile.tsx` (مفاتيح `profile.completeTitle` ~1266) |
| RTL coverActions | commit `eb41fd9` **سلف لـ main** · `coverActions` ما زال `right: 16` ~3487–3489 |
| Discover→section | `#25` / `b63edaa` على main · `SECTION_ROUTE` في `SearchDiscover.tsx` |
| Reset hooks موجودة في الكود | `SectionSearchApp.tsx` + `BookingStaysApp.tsx`: `baselineRef` + `usePreventRemove` · يستخدمان `MiniAppBottomNav` |
| `browseSection` ما زال حياً في تاب Search | `app/(tabs)/search.tsx` ~519 + تمرير `onBrowseSection` |
| `#28` FI P0 | **غير مدموج** على main (حقيقة متفق عليها) |
| ردودك المستلمة | `c21d355` + `69f56c4` على `claude/handoff-full-facts-20260719` |

### أ-3) هدف TASK-001 الوحيد

إغلاق فجوات الطلبات **4 و 5** (+ تكملة 3 الجراحية الناقصة) بملف حقائق واحد قابل لاعتماد المالك — **بدون تنفيذ إصلاح وبدون Start W3**.

---

## ب) المهمة — نفّذ هذا بالضبط

### المخرج الإلزامي (ملف واحد)

```
audit/handoff/CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md
```

### ابدأ الملف بهذه الجملة حرفياً

> استلمت TASK-001 من Cursor. هذا تقرير حقائق جراحي فقط (بروفايل · Reset ميني-آبس · لا-مسح · موجة جراحية مقترحة) بدون كود منتج، مبني على قراءة الملفات/الـcommits على الريبو — بلا تخمين.

### الأقسام الإجبارية (كلها)

#### §0 مصادر القراءة (إلزامي)
اذكر بالضبط ما فتحتَه (مسار ملف + أسطر أو commit).  
إن لم تفتح ملفاً: اكتب «لم أتحقق» — **ممنوع افتراض**.

يجب أن تشمل على الأقل:
- `artifacts/banco-mobile/app/(tabs)/profile.tsx` (complete + coverActions)
- `artifacts/banco-mobile/components/search/SectionSearchApp.tsx`
- `artifacts/banco-mobile/components/search/BookingStaysApp.tsx`
- `artifacts/banco-mobile/components/MiniAppBottomNav.tsx` (دالة `go` / `router.navigate`)
- `artifacts/banco-mobile/components/SearchDiscover.tsx` (`SECTION_ROUTE`)
- `artifacts/banco-mobile/app/(tabs)/search.tsx` (`browseSection`)
- commits: `c4fb358` · `eb41fd9` · `b63edaa`

#### §PROFILE
جدول حقائق فقط:

| سؤال | جوابك بدليل |
|------|-------------|
| هل `c4fb358` على main؟ | نعم/لا + أمر تحقق |
| متى تختفي بطاقة «أكمل ملفك»؟ | شرط الكود (أسطر) |
| هل يشمل الهاتف؟ | مفتاح i18n + مصدر `/me.phone` إن وُجد |
| هل `eb41fd9` يحرّك النقاط لـ**يسار الشاشة** أم يعكس الترتيب داخل مجموعة ما زالت `right:16`؟ | اقتباس ستايل |
| هل عندك commit بروفايل أحدث من `eb41fd9` غير مدموج؟ | هاش أو «لا أعرف — لم أجد» |
| لماذا قد لا يراها المالك على Replit؟ | قائمة احتمالات **مشروطة بتحقق** (SHA / لغة / اكتمال بروفايل) — كل احتمال = كيف يُثبت، بدون جزم إن لم تقيس Replit |

#### §MINIAPP-RESET
جدول **5 أقسام × مسارات خروج** (car · real-estate · factories · materials · booking):

| قسم | مسار الخروج | هل يمر `usePreventRemove`؟ | هل يتصفّر الـcriteria عند إعادة الدخول؟ | دليل ملف:سطر |
|-----|-------------|------------------------------|----------------------------------------|---------------|
| … | header/back النظام | ؟ | ؟ | … |
| … | تأكيد منع الخروج وهو dirty | ؟ | ؟ | … |
| … | `MiniAppBottomNav` → `/` أو تاب آخر عبر `router.navigate` | ؟ | ؟ | … |
| … | العودة من Discover لنفس القسم | ؟ remount | ؟ | … |

أسئلة إجابة إلزامية (حقائق):
1. هل `MiniAppBottomNav.go` يتجاوز `usePreventRemove`؟ (اقرأ التنفيذ)  
2. هل `BookingStaysApp` و `SectionSearchApp` نفس عقد الـreset؟  
3. هل `browseSection` في `search.tsx` ما زال مسار ذوبان محتمل؟ (موجود أم ميت)  
4. قائمة تقوية مقترحة = **مسارات ملفات فقط** — لا patch

#### §NO-WIPE
- اذكر ميزات خفت تاريخياً (`93b650b` / melt) وحالتها **الآن على main** بدليل (#25 أو غيره).  
- صرّح: أي موجة لاحقة (بما فيها W3 لاحقاً) لا تمسح: inbox FI · فروع · مقاعد · أسواق/عملات · نوتيفيكيشن ثنائي · SVG icons · ميني-آبس الأقسام.

#### §LIFECYCLE-FIELDS (تكملة طلب المالك — مختصرة ودقيقة)
للرحلات التالية فقط إن نقصت من شيتك السابق — **حقول ناقصة أو مضلّلة فقط** (لا تعيد الشيت كاملاً):

| رحلة | حقل/خطوة ناقصة أو مضلّلة | ملف | على main؟ |
|------|---------------------------|-----|-----------|
| L1 بروفايل هاتف/صورة/bio | … | … | … |
| L3 ميني-آب بحث | … | … | … |
| L5 تسجيل بنك→inbox | … | … | … |

(L2/L4/L6/L7 فقط إن وجدت نقصاً جديداً بدليل.)

#### §SURGICAL-NEXT (اقتراح فقط — لا تنفّذ)
أصغر موجة ظاهرة للمالك **بعد** اعتماد الشيت وW0:
- هدف ظاهري واحد (مثال مسموح كاقتراح: إثبات بروفايل على Replit بعد pull، أو تقوية reset مسار bottom-nav)  
- قائمة ملفات فقط  
- من ينفّذ: C أو X حسب جدول القدرات المتفق عليه  
- **ممنوع** كتابة «سأنفّذ الآن» أو فتح فرع كود

#### §OUT-OF-SCOPE (إلزامي سطر)
اكتب حرفياً:

> خارج TASK-001: لا Start W3 · لا تعديل FinancingService · لا دمج #28 · لا كود منتج.

---

## ج) معايير القبول (Cursor يرفض الملف إن نقص بند)

- [ ] الملف بالاسم والمسار الصحيحين  
- [ ] جملة الاستلام في الأعلى  
- [ ] §0 يذكر ملفات فُتحت فعلاً  
- [ ] §PROFILE يجيب على كل صف في الجدول  
- [ ] §MINIAPP-RESET يملأ جدول 5 أقسام × مسارات الخروج  
- [ ] إجابة صريحة: هل `MiniAppBottomNav` يتجاوز `usePreventRemove`؟  
- [ ] §NO-WIPE موجود  
- [ ] §SURGICAL-NEXT بدون كود  
- [ ] §OUT-OF-SCOPE موجود  
- [ ] كل ادّعاء معه commit أو `ملف:سطر` أو «لم أتحقق»  
- [ ] صفر تخمينات بلا دليل · صفر patches

---

## د) طريقة العمل على الريبو (خطوات)

```bash
git fetch origin
git checkout -B claude/handoff-full-facts-20260719 origin/claude/handoff-full-facts-20260719
# أو: worktree/فرع من origin/main ثم أضف الملف فقط

# اقرأ الملفات المذكورة في §0 من الشجرة الحالية (فضّل origin/main للحقائق)
git show origin/main:artifacts/banco-mobile/app/(tabs)/profile.tsx | head
# … ثم اكتب الملف

git add audit/handoff/CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md
git commit -m "docs(handoff): TASK-001 surgical follow-up — profile + mini-app reset facts"
git push -u origin HEAD
```

ثم علّق على PR #31 سطراً:  
`TASK-001 delivered: audit/handoff/CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md @ <sha>`

---

## هـ) بعد تسليمك (ماذا يفعل Cursor / المالك)

1. Cursor يراجع بمعايير §ج ويمسح/يدمج على قناة #31.  
2. المالك يعتمد صفوف الشيت.  
3. ثم W0 (Cursor) → … → وعندها فقط قد يصدر `Start W3` لعمل FI — **ليس الآن**.

---

## و) مراجع للقراءة قبل الكتابة (بالترتيب)

1. هذا الملف (TASK-001)  
2. `CURSOR-TO-CLAUDE-COLLAB-SURGICAL-AR.md`  
3. `CURSOR-REPLY-TO-CLAUDE-AR.md`  
4. `CURSOR-STRONG-REPLY-START-GATES-AR.md`  
5. ملفاتك السابقة (لا تُكرّر FI كاملاً — أشر إليها)  
6. الكود على `origin/main` للأسطر المطلوبة

---

**انتهى TASK-001.**  
نفّذ الملف · ادفعه · أوقف. لا كود. لا W3.

— Cursor Agent · PR https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/31
