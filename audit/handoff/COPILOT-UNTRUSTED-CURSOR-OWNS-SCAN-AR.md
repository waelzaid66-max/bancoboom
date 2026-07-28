# بروتوكول: Copilot غير موثوق — Cursor يملك المسح

**تاريخ التثبيت:** 2026-07-19  
**مصدر الحقيقة:** إعلان المالك — Copilot كاذب ولم يتبع التعليمات حتى الآن.

---

## حكم تشغيلي (ملزم)

| طرف | الحالة |
|-----|--------|
| **GitHub Copilot** | **UNTRUSTED** — أي ادّعاء «تم المسح / كل شيء تمام / أصلحت» بدون ملف تقرير مُسنَد = **مرفوض** |
| **Cursor** | **OWNER OF SCAN + FIX** — يمسح بالكود والحراس والشوتات فقط |
| **Replit** | Runtime proof فقط — SHA + Expo + شوتات؛ لا يعتمد على Copilot |

## ما يُرفض فوراً

1. تقرير شفهي من Copilot بدون مسار ملف في الريبو.  
2. «PASS» بدون `file:line` أو بدون خرج `node --test`.  
3. أي PR من Copilot يدّعي إغلاق بنود لم تُذكر أدلة لها.  
4. انتظار Copilot قبل دمج #37 / #38 / #28.

## ما يُقبل كدليل فقط

| دليل | مقبول؟ |
|------|--------|
| `audit/handoff/CURSOR-SCAN-REPORT-*.md` موقّع من Cursor | نعم |
| خرج حراس `section-miniapp-guard` / CI أخضر | نعم |
| `SYNC_SHA` + شوتات Replit | نعم |
| تعليق Copilot على Issue/PR | **لا** بمفرده |

## استبدال مهام Copilot

الملف القديم: `PASTE-COPILOT-SCAN-WHILE-CURSOR-FIXES-AR.md` — **ملغى كاعتماد تشغيلي**.  
الاستبدال: Cursor ينفّذ نفس بنود المسح ويكتب:

`audit/handoff/CURSOR-SCAN-REPORT-PRODUCTION-MOBILE-AR.md`

## تعليمات للبشر / Replit

- لا تلصقوا أوامر لـ Copilot وتتوقعوا تنفيذاً.  
- كل «التالي» = Cursor + Replit proof فقط.  
- إن عاد Copilot لاحقاً: يُعامل كمصدر ضوضاء حتى يُسلّم ملفاً مُسنَداً يراجعه Cursor.

— Cursor · Copilot untrusted protocol
