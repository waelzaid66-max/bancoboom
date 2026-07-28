# إنتاج الموبايل — أوامر Replit + Copilot (شامل · دقيق · بلا أعذار)

**قائد:** Cursor · **PR الحي:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37  
**فرع:** `cursor/discover-enter-fix-4322`  
**هدف:** تطبيق BANCO Mobile جاهز برودكشن حقيقي — ملايين مستخدمين. أعلى دقة.

---

## توزيع أدوار (لا خلط)

| من | يفعل | لا يفعل |
|----|------|---------|
| **Cursor** | إصلاحات كود حرجة + دمج | انتظار أسئلة تصميم |
| **Replit** | سحب الفرع + Expo + شوتات إثبات بكل شاشة حرجة | تعديل كود / website / redesign |
| **Copilot** | مسح انحدارات + تقرير ملفات:سطور | ميزات جديدة / W3 FI / مسح ملفات |

---

# أ) أوامر Replit — الصق ونفّذ

```bash
git fetch origin
git checkout cursor/discover-enter-fix-4322
git pull origin cursor/discover-enter-fix-4322
git rev-parse --short HEAD
git log -1 --oneline
```

Full Reload Expo. أي شوت **بدون SHA = مرفوض**.

### مصفوفة إثبات إنتاج (بالترتيب)

| # | الشاشة | نجاح |
|---|--------|------|
| P01 | Discover | بوابات أفقية ENTER · لا CategoryTabs · لا EngineChips وسط الصفحة · لا زر فلتر |
| P02 | ضغط عقارات | `/section/real-estate` كامل |
| P03 | ضغط سيارات | `/section/car` كامل |
| P04 | Explore on map من Discover | يدخل قسم عقارات + خريطة (أو قائمة إن لا إحداثيات) — **لا** يذيب Search |
| P05 | Booking & Stays | هيدر BOOM STAY أسود **قصير** + نتائج |
| P06 | رجوع من قسم | Discover نظيف |
| P07 | Profile → Legal Terms/Privacy | عربي عند لغة عربية |
| P08 | أيقونات | لا تحذير Unmapped لـ `key` / `business` في اللوج |
| P09 | تبويب Search بعد كتابة بحث | CategoryTabs تظهر فقط خارج Discover |
| P10 | FAB نشر / تدفق أساسي | لا كراش · شاشة حقيقية |

قالب الرد:

```
SHA: ___
P01…P10: PASS/FAIL + مرفق
ملاحظات حرفية:
```

ملفات داخل الريبو:
- `audit/handoff/REPLIT-EXECUTE-NOW-NO-QUESTIONS-AR.md`
- `audit/handoff/PASTE-REPLIT-PROOF-SHOTS-NOW-AR.md`

---

# ب) أوامر Copilot — مسح برودكشن فقط

اقرأ ونفّذ: `audit/handoff/PASTE-COPILOT-SCAN-WHILE-CURSOR-FIXES-AR.md`

أضف للمسح:

| ID | تحقق |
|----|------|
| MOB-07 | `exploreOnMap` → `router.push("/section/real-estate?map=1")` وليس `update(...real_estate)` |
| ICONS | `key` / `key-outline` / `business` في `icons.tsx` |
| GUARD | `node --test tests/section-miniapp-guard.test.mjs` → كلها pass |
| NO-WIPE | لا حذف مسارات section/* |
| WEBSITE | لا تعديلات `artifacts/banco-website` في هذا الموجة |

اكتب التقرير في:  
`audit/handoff/COPILOT-SCAN-REPORT-PRODUCTION-MOBILE-AR.md`

---

# ج) قرارات مثبتة (لا تسأل المالك)

1. لا redesign Booking — `StaysHomeHeader` فقط.  
2. Discover = بوابات دخول؛ الفلاتر داخل الميني-آب.  
3. لا W3 FI حتى Start بعد #28.  
4. لا directory بنوك كامل بلا قرار Owner.  
5. لا اختراع بيانات.

— Cursor
