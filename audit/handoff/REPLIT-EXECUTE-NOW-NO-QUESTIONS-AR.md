# أوامر Replit على الريبو — نفّذ بلا أسئلة (قرارات Cursor النهائية)

**PR:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37  
**فرع:** `cursor/discover-enter-fix-4322`  
**من:** Cursor — قائد الجودة  
**مستوى الدقة:** أعلى مستوى — منتج دولي لملايين المستخدمين.

---

## إجابات قاطعة على أسئلتك (لا تنتظر المالك)

| سؤالك | القرار النهائي |
|--------|----------------|
| هل نعمل redesign حقيقي لصفحة Booking؟ | **لا.** ممنوع redesign. الهيدر الوردي من `main` هو الصحيح — `StaysHomeHeader` الأسود **محذوف**. |
| تعارض هيدر؟ | **اعتمد الهيرو الوردي + `SectionBackdrop` فقط** في `BookingStaysApp.tsx`. ممنوع أي شريط أسود بديل. |
| تسجيل أيقونات `key` و `business`؟ | **نعم — إلزامي.** تُسجَّل في `components/icons.tsx` (Cursor يصلحها على نفس الفرع). بعد السحب: لا تحذيرات Unmapped لهذين الاسمين. |

---

## مهمتك الوحيدة الآن

1. اسحب الفرع وحدّث:

```bash
git fetch origin
git checkout cursor/discover-enter-fix-4322
git pull origin cursor/discover-enter-fix-4322
git rev-parse --short HEAD
git log -1 --oneline
```

2. Full Reload لـ Expo.

3. صوّر إثبات **R1→R6** بالترتيب (انظر تعليق PR أو `PASTE-REPLIT-PROOF-SHOTS-NOW-AR.md`).

4. أعد القالب مع **SHA + PASS/FAIL لكل بند + الشوتات**.

---

## ممنوع عليك

- طرح أسئلة تصميم جديدة على المالك بدل التنفيذ
- redesign Booking / أقسام / website
- تعديل `artifacts/banco-website`
- W3 FI / دمج عشوائي
- «شكله تمام» بدون جدول R1–R6 وبدون SHA

## مسموح

- سحب + Expo + شوتات + تقرير عيوب بصرية مثبتة

---

## بعد الإثبات

علّق على PR #37 بالقالب. Cursor يكمل فقط على عيب مثبت بالشوت.
