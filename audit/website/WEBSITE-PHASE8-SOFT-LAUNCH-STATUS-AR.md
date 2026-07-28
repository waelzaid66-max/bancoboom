# Phase 8 — Soft-launch pack — حالة

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase8-soft-launch-4322`  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)

---

## الهدف

تجهيز إطلاق محدود للويب على CDN إنتاج بأعلام آمنة، مع مسارات مراقبة متوافقة (`/api/health` + `/api/healthz`)، دون لمس موبايل/API.

---

## ما تغيّر

| بند | تفصيل |
|-----|--------|
| `/api/healthz` | alias لنفس payload الصحة |
| `lib/web-health.ts` | payload مشترك + `isWebHealthPath` |
| Plug gate | يعفي healthz عند الفصل |
| Prod env template | `deploy/aws/env/.env.banco-web.production.example` |
| Checklist | [`WEBSITE-SOFT-LAUNCH-CHECKLIST-AR.md`](./WEBSITE-SOFT-LAUNCH-CHECKLIST-AR.md) |
| Audit | `pnpm run ops:website-soft-launch-prep` |

---

## تعريف الإنجاز

| معيار | حالة |
|-------|------|
| healthz alias | ✅ |
| قالب إنتاج آمن | ✅ |
| Soft-launch checklist | ✅ |
| Prep audit PASS | ✅ (محلي) |
| نشر CDN إنتاج محدود | ⏳ OPS (أنت) |
| Soak + قرار LIVE | ⏳ OPS بعد staging |

---

## خارج النطاق

- `consumer_web_enabled` عبر admin API  
- تفعيل LIVE/MAP/MARKET على إنتاج في هذه الموجة  
