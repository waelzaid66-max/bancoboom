# Phase 5 — Headers / responsive chrome (حالة)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase5-responsive-chrome-4322`  
**القاعدة:** ويب فقط — لا لمس موبايل / API / dealer-os / admin-os  

---

## الهدف

هيدر ويب آمن على موبايل المتصفح / تابلت / ديسكتوب بدون كسر SEO، مع a11y أساسي وعدم تداخل مع المحتوى.

---

## ما نُفّذ

| بند | تفاصيل |
|-----|--------|
| Sticky header | `.banco-site-header` — ثابت أعلى الصفحة |
| Desktop nav | `.banco-desktop-nav` ظاهر ≥901px |
| Mobile drawer | `SiteMobileNav` — dialog + backdrop + Escape + قفل تمرير الجسم |
| Menu toggle | زر 44×44 مع `aria-expanded` / `aria-controls` |
| Skip link | موجود مسبقاً (`SkipToMain`) — يبقى في layout |
| Shared nav model | `lib/site-nav-model.ts` — نفس الروابط لسطح المكتب والدرج |
| Workspace shell | عمود واحد + شريط روابط قابل للالتفاف ≤768px |
| Reduced motion | إيقاف حركة الدرج عند `prefers-reduced-motion` |
| Audit | `scripts/website-responsive-chrome-audit.mjs` |
| CI | مدمج في `ci-website.yml` + `website-ci-local.mjs` |

---

## نقاط كسر (breakpoints)

| عرض | سلوك |
|-----|------|
| ≥901px | تنقل أفقي كامل؛ إخفاء زر القائمة |
| ≤900px | إخفاء التنقل الأفقي؛ زر قائمة + درج |
| ≤768px | مساحة عمل البائع بعمود واحد |
| ≤640px | نص زر القائمة مخفي بصرياً (أيقونة فقط) |

---

## خارج النطاق (متعمد)

- إعادة تصميم هوية بصرية كاملة  
- Bottom tab bar بأسلوب التطبيق  
- تغيير SEO metadata / JSON-LD  

---

## أوامر التحقق

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-responsive-chrome-audit.mjs
node scripts/website-market-copy-parity-audit.mjs
node scripts/website-seller-workspace-parity-audit.mjs
```

---

## تعريف الإنجاز

- [x] هيدر لا يكسّر المحتوى على العرض الضيق  
- [x] قائمة موبايل قابلة للإغلاق (Escape / backdrop / تنقّل)  
- [x] skip-to-main يعمل  
- [x] workspace قابل للاستخدام على الموبايل  
- [x] audit + CI  
