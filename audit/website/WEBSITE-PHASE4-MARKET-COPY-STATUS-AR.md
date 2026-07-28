# Phase 4 — BANCO Market copy داخل الويب (حالة)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase4-market-copy-4322`  
**القاعدة:** `dealer-os` **لا يُلمس ولا يُستورد** — كوبي عبر `@workspace/api-client-react` فقط  

---

## الهدف

إعادة بناء تجربة ماركت التاجر داخل `artifacts/banco-web` (مسار `/workspace/b2b`) مع إبقاء المنصة الكلاسيكية كـ fallback عبر `NEXT_PUBLIC_MARKET_URL`.

---

## ما نُفّذ (MVP)

| بند | تفاصيل |
|-----|--------|
| Feature flag | `NEXT_PUBLIC_WEB_MARKET_COPY` (افتراضي `false`) |
| نظرة عامة | `MarketDashboardPanel` — `useGetDealerStats` + `useGetMarketTrends` |
| RFQs | `/workspace/b2b/rfqs` — `useListRfqs` + إنشاء عبر `RfqCreateForm` (Phase 9) |
| توريد عالمي | `/workspace/b2b/supply` — `useListGlobalSupply` (`status: open`) |
| تبويبات | `MarketTabs` (AR + EN) |
| Nav | عنصر «ماركت الويب» داخل قائمة Market عند تفعيل العلم |
| Classic fallback | رابط Dealer OS يبقى أسفل اللوحة |
| Audit | `scripts/website-market-copy-parity-audit.mjs` |
| CI | مدمج في `ci-website.yml` + `website-ci-local.mjs` |
| Staging smoke | مسارات `/workspace/b2b*` محمية |

---

## خارج النطاق (متعمد — لاحقاً)

- إنشاء RFQ → **تم في Phase 9** (`RfqCreateForm` + `useCreateRfq`)  
- عروض (submit/accept) / توريد جديد / ردود  
- Bulk / import / boost / ads / wallet / subscription من ماركت  
- استيراد shadcn أو أي ملف من `dealer-os`  
- سطح SEO عام `/market` منفصل  

---

## تفعيل staging

```bash
# artifacts/banco-web/.env.local (staging فقط)
NEXT_PUBLIC_WEB_MARKET_COPY=true
NEXT_PUBLIC_MARKET_URL=https://market.example.com   # classic fallback
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_API_URL=https://staging-api.example.com
```

---

## أوامر التحقق

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-market-copy-parity-audit.mjs
node scripts/website-seller-workspace-parity-audit.mjs
# بعد build:
# node scripts/website-seo-static-audit.mjs
```

---

## تعريف الإنجاز لهذه الموجة

- [x] كوبي قراءة (overview / RFQs / supply) داخل الويب  
- [x] flag off = سلوك B2B الكلاسيكي السابق  
- [x] لا imports من dealer-os  
- [x] audit + CI path filter  
- [x] إنشاء RFQ (Phase 9)  
- [ ] موافقة مالك على عروض/توريد في موجة لاحقة  
