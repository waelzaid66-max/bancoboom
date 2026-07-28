# التعليمات المتبقية — صيانة قوية · فينيش · NO-WIPE

**PR:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37  
**فرع:** `cursor/discover-enter-fix-4322`  
**قاعدة حديدية:** ممنوع مسح أي ميزة سابقة. يُسمح بالتنسيق/العزل/التقصير فقط.

---

## قرارات Cursor النهائية (لا تفاوض)

1. **NO-WIPE** — لا حذف بوابات، أقسام، Stay، بنوك، Legal، FAB، خريطة.  
2. **Discover = ENTER** — فلاتر داخل الميني-آب فقط.  
3. **Stay = `StaysHomeHeader` مضغوط** — لا redesign واسع.  
4. **website معزول** — لا تلمس `artifacts/banco-website`.  
5. **W3 FI محظور** حتى Start صريح بعد دمج #28.  
6. **صدق فقط** — لا بيانات ملفّقة، لا شيفرون ميت، لا ادّعاءات بلا فعل.

---

## Replit — ماذا تفعل الآن

```bash
git fetch origin
git checkout cursor/discover-enter-fix-4322
git pull origin cursor/discover-enter-fix-4322
git rev-parse --short HEAD
git log -1 --oneline
```

Full Reload Expo → نفّذ إثبات **P01…P10** من  
`PASTE-PRODUCTION-MOBILE-REPLIT-COPILOT-AR.md`  
+ أضف:

| # | تحقق إضافي |
|---|-------------|
| P11 | Explore on map → قسم عقارات (ليس ذوبان Search) |
| P12 | لغة عربية: اقتراحات البحث لا تتداخل مع زر الفلتر |
| P13 | Profile شبكة منشورات: شارات فيديو/مميّز منطقية تحت RTL |

كل شوت = SHA + PASS/FAIL. بدون SHA = مرفوض.

---

## Copilot — ماذا تفعل الآن

1. أعد مسح بعد آخر push (حارس يجب ≥ 12 اختبار).  
2. شغّل:

```bash
cd artifacts/banco-mobile && node --test tests/section-miniapp-guard.test.mjs
```

3. اكتب/حدّث:  
`audit/handoff/COPILOT-SCAN-REPORT-PRODUCTION-MOBILE-AR.md`

4. سجّل فقط عيوب بأدلة ملف:سطر. **لا تنفّذ ميزات.**  
5. راقب NO-WIPE: أي PR يقترح حذف ميزة = ارفضه في التقرير.

---

## ما أُغلق في موجة الفينيش هذه

- MOB-07 map latch يدعم `string | string[]`  
- اقتراحات Search محاذاة RTL  
- شارات Profile شبكة: `start`/`end`  
- حارس أقوى (booking push · lockCategory · map normalize · لا update category من Discover)

## ما يبقى خارج هذا الفرع (صادق)

| بند | الحالة |
|-----|--------|
| #28 FI P0 | PR مفتوح — اعتماد Owner |
| W3 أمان FI | بعد Start فقط |
| Banks directory حي | قرار منتج |
| EAS store binaries | Ops بيئة |

— Cursor · صيانة صادقة بلا مسح ميزات
