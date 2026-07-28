# النسخة الصحيحة المعتمدة — بعد فحص الفروع

**تاريخ الاعتماد:** 2026-07-19 (محدّث بعد rebase على main)

---

## الهوية

| عنصر | قيمة |
|------|------|
| **الفرع** | `cursor/discover-enter-fix-4322` |
| **PR** | https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37 |
| **SHORT الحي** | اطبع `git rev-parse --short HEAD` على الفرع بعد `git fetch` + hard reset — لا تثبت SHA قديم من الدوك |
| **معنى النسخة** | `origin/main` + تنظيف الضرر فقط (typecheck · حذف boom docs · i18n ميت) |
| **تحقيق + خطة** | `INVESTIGATION-AND-REPAIR-PLAN-AR.md` |
| **خطة صيانة جراحية** | `SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md` |
| **فحص ميلي مسافات/أزرار** | `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md` |
| **سلسلة الضرر** | `FULL-DAMAGE-CHAIN-AND-BRANCH-MATRIX-AR.md` |

> بعد كل push: اطبع `git rev-parse HEAD` على الفرع — هذا هو CANONICAL_CODE_SHA الحي.  
> Replit يثبت على **ذلك الـ SHA** من `origin/cursor/discover-enter-fix-4322` بعد hard reset (ليس main وحده إن التنظيف لم يُدمَج بعد).

---

## ماذا يجب أن يظهر

- Discover = كروت صور 2×2  
- Stay = هيرو وردي  
- لا ENTER · لا `StaysHomeHeader` · لا boom-stay docs  
- `BReactionButton` يستورد من `LanguageContext`  
- حارس 29/29 · هيدر أقسام: أزرار داخل الشريط (iconBtn 12)  

## أدوار

| | |
|--|--|
| Cursor | صيانة وإصلاح |
| Replit | تأكيد النسخة فقط — **ممنوع صيانة** |
| Copilot | UNTRUSTED |

---

— Cursor · Canonical
