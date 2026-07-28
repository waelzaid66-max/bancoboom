# TASK-002 لـ Claude — مراجعة معمارية W1 + مواصفات قبول W3 (بلا كود منتج)

**مُصدِر:** Cursor (مسؤول الجودة والتسليم المشترك)  
**المالك أمر:** ادخل · اتفق · شغّله في تاسك وأنا في الآخر · ترتيب معماري · لا انحراف  
**أنتَ الآن:** تفحص كلام Cursor — هذا هو التاسك التنفيذي التالي بعد TASK-001  
**ممنوع في TASK-002:** تعديل `FinancingService` · فتح W3 كود · لمس `SearchDiscover` إلا للمراجعة

---

## المخرجات الإلزامية (ثلاثة ملفات)

### 1) `audit/handoff/CLAUDE-ACK-JOINT-ARCHITECTURE-AR.md`
- ابدأ: `أوافق على JOINT-ARCHITECTURE A1–A7`  
  أو: `أعترض على: A… لأن … (دليل ملف:سطر)`  
- اذكر أنك قرأت:  
  `JOINT-ARCHITECTURE-EXECUTION-PLAN-AR.md`  
  `CAPABILITY-SPLIT-AND-HONESTY-PROTOCOL-AR.md`  
  PR #32 (W1)

### 2) `audit/handoff/CLAUDE-REVIEW-W1-PR32-AR.md`
مراجعة معمارية لـ PR #32 / commit `0700a77` — **حقائق فقط**:

| سؤال | جوابك بدليل |
|------|-------------|
| هل حذف `onBrowseSection` يكسر أي عقد/مسار بنيتَه أنت؟ | نعم/لا + ملف |
| هل يبقى خطر melt عبر مسار آخر؟ (`exploreOnMap` وغيره) | اذكر فقط ما تثبته من الكود |
| هل حارس `section-miniapp-guard.test.mjs` كافٍ أم ينقصه assert؟ | اقتراح سطر اختبار أو «كافٍ» |
| هل توافق دمج #32 إلى `main` من منظور عقد الفصل؟ | موافق / موافق بشرط… |

**ممنوع:** إعادة كتابة W1 · فتح PR مضاد بلا سبب أمان.

### 3) `audit/handoff/CLAUDE-W3-ACCEPTANCE-SPEC-AR.md`
مواصفات قبول W3 جاهزة للتنفيذ لاحقاً (وسّع ما كتبته في follow-up):

لكل من: AuthZ فرع · state machine · owner role · docs merge · isActive:
- الملف/الدالة المستهدفة  
- الحالة السالبة (input → expected status)  
- ما يبقى أخضر (NO-WIPE)  
- **لا كود**

---

## خطوات الريبو

```bash
git fetch origin
git checkout -B claude/handoff-full-facts-20260719 origin/claude/handoff-full-facts-20260719
# اقرأ أيضاً:
#   origin/cursor/w1-section-filter-isolation-4322
#   أو ملفات PR #32 على GitHub

# اكتب الملفات الثلاثة ثم:
git add audit/handoff/CLAUDE-ACK-JOINT-ARCHITECTURE-AR.md \
        audit/handoff/CLAUDE-REVIEW-W1-PR32-AR.md \
        audit/handoff/CLAUDE-W3-ACCEPTANCE-SPEC-AR.md
git commit -m "docs(handoff): TASK-002 ACK + W1 review + W3 acceptance spec"
git push -u origin HEAD
```

علّق على PR #31: `TASK-002 delivered @ <sha>`  
وعلّق على PR #32 سطراً إن عندك شرط دمج.

---

## معايير قبول Cursor لـ TASK-002

- [ ] ACK صريح لـ A1–A7 أو اعتراض بدليل  
- [ ] مراجعة W1 بدون تخمين  
- [ ] مواصفات W3 قابلة للتحويل لاختبارات لاحقاً  
- [ ] صفر كود منتج  
- [ ] ذكر «لم أتحقق» إن لم تفتح الملف

---

**بعد تسليمك:** Cursor يغلق جودة W1 رسمياً ويجهّز checklist W2 (#28) — بلا دمج حتى أمر المالك.

— Cursor
