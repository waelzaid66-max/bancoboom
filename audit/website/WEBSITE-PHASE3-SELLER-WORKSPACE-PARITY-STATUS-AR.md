# Phase 3 — Seller workspace parity (حالة التنفيذ)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase3-seller-workspace-4322`  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)  
**يعتمد على:** Phase 1 #11 · Phase 2 #12

## الهدف

إنشاء/تعديل/إعلاناتي/leads/messages بمستوى عملي على الويب — إكمال W5 الموجود دون إعادة بناء من صفر، وبدون لمس `dealer-os`.

## ما تغيّر (whitelist فقط)

| سطح | تقوية |
|-----|--------|
| `WorkspaceShell` | بوابة بدون Clerk + `data-banco-journey="workspace"` |
| `ManagedListingsPanel` | retry · أخطاء bump/delete · pending لكل صف · query keys مولَّدة |
| `ListingCreateForm` | خطأ تحميل التعديل · رفع صور · إزالة ميديا · منع إرسال أثناء الرفع · invalidation metrics/listing |
| `LeadsPanel` | retry · تلميح فارغ · رابط للإعلان · تواريخ AR/EN |
| `MessagesInboxPanel` / `MessageThreadPanel` | journey markers · خطأ حذف · retry للخيط |
| `WorkspaceMetricsCards` | retry + marker |
| `website-seller-workspace-parity-audit.mjs` | تدقيق CI ثابت |
| smoke staging | مسارات workspace محمية إضافية |

## ما لم يُلمس

`banco-mobile` · `api-server` · `dealer-os` · `admin-os` · `lib/db` · OpenAPI · `ci.yml`  
(B2B يبقى رابطاً خفيفاً — Phase 4)

## تحقق

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-seller-workspace-parity-audit.mjs
```

## خروج Phase 3

- [x] رحلة بائع موصولة ومقوّاة في الكود
- [x] تدقيق ثابت في CI الويب
- [ ] smoke staging موقّع مع Clerk + API (OPS)
