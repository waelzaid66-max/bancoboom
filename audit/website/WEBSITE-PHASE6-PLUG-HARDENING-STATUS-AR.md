# Phase 6 — Plug hardening (حالة)

**التاريخ:** 2026-07-18  
**الفرع:** `cursor/website-phase6-plug-hardening-4322`  
**القاعدة:** ويب فقط — لا لمس موبايل / API / dealer-os / admin-os  

---

## الهدف

جعل `banco-web` فيشة حقيقية: إيقاف سريع بدون redeploy للموبايل/API، مراقبة منفصلة، ووثيقة فصل في 5 دقائق.

---

## ما نُفّذ

| بند | تفاصيل |
|-----|--------|
| Runtime flag | `WEB_PLUG_ENABLED` (افتراضي on عند الغياب) |
| Build-time اختياري | `NEXT_PUBLIC_WEB_PLUG_ENABLED` |
| Middleware gate | rewrite → `/maintenance` + `X-Banco-Web-Plug: off` + `Retry-After` |
| صفحة صيانة | `/maintenance` · `/en/maintenance` (noindex) |
| Health | `/api/health` يبقى 200 مع `"plug":"on\|off"` |
| Compose | `WEB_PLUG_ENABLED` في `docker-compose.banco-web.yml` |
| Runbook | [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md) |
| Audit | `scripts/website-plug-hardening-audit.mjs` |

---

## خارج النطاق (متعمد)

- endpoint أدمن `consumer_web_enabled` (يتطلب api-server + admin-os)  
- Cloudflare Worker خارج الريبو  
- إيقاف API أو الموبايل  

---

## أوامر التحقق

```bash
node scripts/verify-website-boundaries.mjs
node scripts/website-plug-hardening-audit.mjs
```

---

## تعريف الإنجاز

- [x] إيقاف الويب بمتغير بيئة دون لمس موبايل/API  
- [x] health يفرّق بين عملية حية وفيشة مطفأة  
- [x] وثيقة 5 دقائق  
- [x] audit + CI  
