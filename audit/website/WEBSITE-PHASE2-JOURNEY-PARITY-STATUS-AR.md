# Phase 2 — Journey parity (حالة التنفيذ)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase2-journey-parity-4322`  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)  
**الخطة:** [`WEBSITE-FULL-COPY-PLAN-AND-PREP-AR.md`](./WEBSITE-FULL-COPY-PLAN-AND-PREP-AR.md)

## الهدف

بحث · تفاصيل · حفظ · تواصل على الويب بنفس عقد الـ API، خلف flags آمنة.

## ما تغيّر (whitelist فقط)

| ملف | تغيير |
|-----|--------|
| `ListingSaveButton.tsx` | إبطال قائمة المحفوظات + خطأ واضح + `data-banco-journey="save"` |
| `ListingContactActions.tsx` | تجديد `contact_token` بعد كل lead (single-use) + journey marker |
| `SavedListingsView.tsx` | حالات بدون Clerk / خطأ / فارغ واضحة |
| `SearchPageBody.tsx` | markers رحلة البحث + رسالة map-flag-off |
| `ListingPageShell.tsx` | `data-banco-journey="listing"` |
| `listing-ui-copy.ts` | `savedError` AR/EN |
| `scripts/website-journey-parity-audit.mjs` | تدقيق ثابت لرحلة Phase 2 |
| `scripts/website-staging-smoke.mjs` | فحوص markers على search/listing/saved |
| `ci-website.yml` · `website-ci-local.mjs` | تشغيل journey audit |
| هذا الملف + فهرس الموقع | توثيق الحالة |

## Flags (آمنة افتراضياً)

| Flag | `.env.example` | staging example |
|------|----------------|-----------------|
| `NEXT_PUBLIC_WEB_SEARCH_LIVE` | `false` | `true` |
| `NEXT_PUBLIC_WEB_SEARCH_MAP` | `false` | `true` |

لا تُفعَّل LIVE/MAP على إنتاج الويب بدون أمر مالك + CDN staging أولاً.

## ما لم يُلمس

`banco-mobile` · `api-server` · `dealer-os` · `admin-os` · `lib/db` · OpenAPI · `ci.yml`

## تحقق

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-journey-parity-audit.mjs
# بعد نشر staging:
# BANCO_WEB_URL=https://staging… BANCO_LISTING_SMOKE_ID=<uuid> node scripts/website-staging-smoke.mjs
```

## خروج Phase 2

- [x] رحلات موصولة في الكود (search/listing/save/contact/saved)
- [x] تدقيق ثابت في CI الويب
- [ ] smoke staging حي مع `WEB_SEARCH_LIVE=true` + listing id (OPS — يحتاج دومين/أسرار المالك)
- [ ] توقيع مالك بصري/وظيفي على staging
