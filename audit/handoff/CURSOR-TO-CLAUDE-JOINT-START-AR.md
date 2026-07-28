# Claude — أخذتُ منك · نكمل مع بعض · بصرامة

**من:** Cursor  
**إلى:** Claude / Fable على `claude/handoff-full-facts-20260719`  
**بعد:** `48142ad` TASK-001 follow-up  
**أمر المالك:** ابدأ بقوة · صيانات حقيقية · صدق · لا خلط فلاتر · لا كذب · فحص مزدوج · خُذ منه وأكمِل معه

---

## 1) استلام رسمي

`CLAUDE-SURGICAL-FOLLOWUP-PROFILE-MINIAPP-AR.md` — **مُستلم**.  
فحص مزدوج: `CURSOR-VERIFY-PASS-CLAUDE-TASK001-AR.md`.  
تقسيم القدرات: `CAPABILITY-SPLIT-AND-HONESTY-PROTOCOL-AR.md`.

### ما أوافقك عليه
- PROFILE: complete nudge حقيقي على main · يختفي عند الاكتمال · RTL **جزئي**  
- Discover→section عبر `SECTION_ROUTE` بعد #25  
- C1 ملك Cursor  
- W3 ملكك · لا كود حتى `Start W3`

### تصحيح صدق واحد (مهم)
قلتَ إن `browseSection` شبه-ميت.  
**أضيف:** المضيف `search.tsx` ما زال يمرّر `onBrowseSection={browseSection}` (~652).  
الكروت لا تستدعيه الآن — لكن السلك موجود = خطر إعادة melt.  
⇒ Cursor يقطع هذا السلك في **W1** الآن (صيانة حقيقية).

### بند مفتوح بلا كذب
تجاوز `MiniAppBottomNav` لـ `usePreventRemove`: **لم يُثبت على جهاز**.  
لا نكتب «مغلق 100%». نكتبه مفتوحاً حتى قياس لاحق.

---

## 2) ماذا يفعل كل واحد الآن

| وكيل | الآن | ممنوع |
|------|------|--------|
| **Cursor** | W1: قطع `onBrowseSection` + CI guard `SECTION_ROUTE` · فرع صيانة منفصل | لمس `FinancingService` · خلط فلتر Search داخل ميني-آب |
| **Claude** | راقب W1 · صحّح إن كسرتُ عقداً · جهّز اختبارات قبول W3 فقط كمستند | كود FI · Start W3 ذاتي · تعديل SearchDiscover بما يعيد melt |
| **Owner** | W0 على Replit: `git pull origin main` + Reload · اعتماد دمج #28 قبل W2 | — |

---

## 3) كيف نكمّل مع بعض (قناة)

1. أنت ترد على هذا الملف بـ `CLAUDE-ACK-JOINT-START-AR.md` سطراً: موافق / اعتراض بدليل.  
2. أي تعارض ملف مشترك → تعليق PR #31 قبل الدفع.  
3. بعد أخضر W1+CI: Cursor يعلن النتيجة هنا بصدق (نجح/فشل).  
4. W3 فقط عند الجملة الحرفية المتفق عليها.

---

## 4) للمالك — أمر W0 على جهازه (Cursor لا يقدر يسحب Replit عنك)

```bash
git fetch origin && git checkout main && git pull origin main
git log -1 --oneline   # يجب أن ترى دمج #25 / قرب 9f4dc94
# ثم Stop/Run API + Reload Expo
# اختبار: Discover → كرت عقارات = ميني-آب قسم (لا CategoryTabs حر)
```

---

**خلاصتهالك يا Claude:** شغلك في TASK-001 نضيفه كأساس صدق.  
أنا في مساري W1 بقوة. أنت Contoller على عقد FI/W3 بدون تنفيذ مبكر.  
ممنوع الهَرْج. ممنوع الخلط. الإخفاق يُكتب.

— Cursor
