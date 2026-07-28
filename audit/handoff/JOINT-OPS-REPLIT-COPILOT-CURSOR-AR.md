# خطة تشغيل مشتركة — أعلى مستوى تقني  
## Cursor (قائد) · Replit (عرض/تشغيل/شوتات) · Copilot (تقصّي + تاسكات معزولة)

**التاريخ:** 2026-07-19  
**قاعدة الكود المستقرة:** `origin/main` @ `58ddddc` (+ PR MOB-01 عند الدمج)  
**ويب:** عزل تام — `WEBSITE-ABSOLUTE-ISOLATION-CHARTER-AR.md`  
**فلسفة:** `release/PROJECT_CONTEXT.md` · Additive · NO-WIPE · SVG · صدق النسخ

---

## 0) سلسلة القيادة

```
Owner
  └─ Cursor (جودة · دمج · خطة · صيانة كود حرجة)
        ├─ Replit  → W0 تشغيل · Expo+Website · شوتات · تقرير verify · أسرار الجهاز
        └─ Copilot → تقارير ملف:سطر · تاسكات معزولة يكلّفها Cursor · لا قفز موجات
```

**كل تواصل رسمي = push على GitHub أو تعليق PR #31.** شات الجهاز وحده لا يُحسب تسليماً.

---

## 1) الحالة بعد هبوط المستقر

| بند | حالة |
|-----|------|
| W1 فصل الأقسام + حارس CI | ✅ على main |
| MOB-04 RTL غلاف | ✅ على main |
| W4 sort في الشريط | ✅ على main |
| MOB-01 هاتف في edit | 🔧 Cursor PR `cursor/mob01-phone-edit-4322` |
| #28 FI P0 | ⏳ غير مدمج |
| W3 أمان FI | 🔒 محظور حتى Start بعد #28 |
| Replit = main | ⏳ واجب Replit الآن |

---

## 2) موجة التشغيل الحالية (متوازية بلا اصطدام ملفات)

### A) Replit — W0 + عرض كامل (ابدأ فوراً)

**اقرأ:**  
`ENTER-NOW-REPLIT-FOLLOW-CURSOR-AR.md`  
`REPLIT-FULL-FEED-UPDATES-PROBLEMS-AR.md`  
`REPLIT-STABLE-EXPO-WEBSITE-RUNBOOK-AR.md`  
`WEBSITE-ABSOLUTE-ISOLATION-CHARTER-AR.md`

**افعل:**
1. `git pull origin main` → SHA ≥ `58ddddc`  
2. API + Expo + `banco-website :3000` (عزل تام)  
3. شوتات S1–S8 من الـrunbook  
4. ادفع `audit/handoff/REPLIT-VERIFY-REPORT-AR.md`  
5. **لا تلمس** `profile.tsx` أثناء عمل Cursor على MOB-01  
6. **لا تدمج** #28 بنفسك  

**مخرج القبول:** تقرير + شوتات + `HEAD=<sha>` مطابق.

### B) Copilot — تحت Cursor (أعد التوجيه)

**اقرأ:**  
`COPILOT-ORDERS-UNDER-CURSOR-AR.md`  
`COPILOT-PASTE-NOW-AFTER-STABLE-LAND-AR.md`  
`WEBSITE-ABSOLUTE-ISOLATION-CHARTER-AR.md`  
هذا الملف

| تاسك | مخرج | ممنوع |
|------|------|--------|
| **CP-A** | `COPILOT-POSTMERGE-W1-W4-AR.md` — تحقق post-merge على `58ddddc` (حارس أقسام + sort chip + cover `end`) | تعديل كود إلا إن وجدت انحدار بدليل |
| **CP-B** | `COPILOT-BANKS-HONESTY-AUDIT-AR.md` — PRODUCTS/chevron/copy/API directory | تنفيذ directory كامل بلا أمر |
| **CP-C** | راجع PR MOB-01 لـ Cursor عند ظهوره — `COPILOT-REVIEW-MOB01-AR.md` موافق/شرط | إعادة كتابة Profile كاملة |
| **CP-D** | (ويب فقط إن لزم) جرد روابط `banco-website` ↔ API بدون لمس موبايل | أي ملف تحت `banco-mobile` |

**أول سطر على PR #31:**  
`Copilot online · قرأت JOINT-OPS + ISOLATION · أبدأ CP-A ثم CP-B ثم CP-C`

### C) Cursor — صيانة حرجة (جارية)

1. ✅ MOB-01 كود على فرع `cursor/mob01-phone-edit-4322`  
2. مراجعة PR + دمج بعد CI + ملاحظة Copilot  
3. بعد شوتات Replit: قرار MOB-05 (CategoryTabs@Discover) كتاسك صغير منفصل  
4. تجهيز checklist دمج #28 بعد W0 أخضر  

---

## 3) ترتيب الدمج/النشر (لا قفز)

```
[الآن] Replit pull 58ddddc + Expo + Website(معزول)
   → Cursor MOB-01 merge بعد CI
   → Copilot Banks audit
   → Owner يعتمد #28
   → Start W3 (جملة المالك فقط) لأمان FI
   → #23 Stay
   → GCP/EAS نشر إنتاج عبر runbooks — بعد Go/No-Go
```

---

## 4) معايير الجودة لكل تسليم وكيل

1. SHA الفرع + قائمة ملفات  
2. كل ادّعاء → `path:line` أو مخرج أمر  
3. `لم أتحقق` أفضل من التخمين  
4. NO-WIPE صريح  
5. ويب: صفر تغيّر موبايل في نفس التاسك  

---

## 5) أوامر لصق سريعة

**Replit:** محتوى `ENTER-NOW-REPLIT-FOLLOW-CURSOR-AR.md` + اقرأ هذا الملف.  
**Copilot:** الفقرة B أعلاه + `COPILOT-PASTE-NOW-AFTER-STABLE-LAND-AR.md`.

— Cursor · قيادة عليا للصيانة المشتركة
