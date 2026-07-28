# Phase 1 — Visual parity (حالة التنفيذ)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase1-visual-parity-4322`  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)

## ما تغيّر (whitelist فقط)

| ملف | تغيير |
|-----|--------|
| `artifacts/banco-web/public/banco-logo.png` | نسخة أصل اللوجو (من landing assets → داخل الويب فقط) |
| `components/BrandMark.tsx` | مكوّن العلامة الرسمية |
| `components/SiteChrome.tsx` | الهيدر يستخدم اللوجو بدل نص BANCO |
| `app/page.tsx` · `app/en/page.tsx` | هيرو brand-first كامل العرض + CTAs |
| `app/globals.css` | أنماط الهيرو / أزرار / reduced-motion |

## ما لم يُلمس

`banco-mobile` · `api-server` · `dealer-os` · `admin-os` · `lib/db` · OpenAPI · `ci.yml`

## تحقق مطلوب قبل الدمج

```bash
node scripts/verify-website-boundaries.mjs
# git diff --name-only  يجب أن يبقى تحت artifacts/banco-web + audit/website
```
