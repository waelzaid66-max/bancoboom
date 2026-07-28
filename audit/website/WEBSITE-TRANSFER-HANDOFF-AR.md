# حزمة نقل وتسليم banco-web (نسخة كاملة)

**التاريخ:** 2026-07-18  
**الغرض:** نقل/تشغيل/فصل سطح الويب بشكل صحيح دون لمس خط الإنتاج  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)

---

## 1. ماذا اكتمل على `main`

| موجة | المحتوى |
|------|---------|
| Phase 1 | هوية بصرية — هيرو brand-first + لوجو + كروم |
| Phase 2 | رحلات مستهلك — بحث / حفظ / تواصل |
| Phase 3 | مساحة بائع — workspace |
| Phase 4 | Market copy داخل `/workspace/b2b` (flag) |
| Phase 5 | هيدر متجاوب + درج موبايل |
| Phase 6 | Kill-switch `WEB_PLUG_ENABLED` + صيانة + health |

**PR الأصلية:** #11→#17 (مكدس). إن وُجد PR توحيد لاحق إلى `main` فهو مجرد نقل رأس المكدس بعد تصحيح قواعد الدمج الوسطى.

---

## 2. أين يعيش الكود (للنقل)

| أصل | مسار |
|-----|------|
| تطبيق الويب | `artifacts/banco-web/` |
| Docker | `deploy/aws/Dockerfile.banco-web` |
| Compose | `deploy/aws/docker-compose.banco-web.yml` |
| Env مثال | `artifacts/banco-web/.env.example` + `.env.staging.example` |
| CI معزول | `.github/workflows/ci-website.yml` (+ docker) |
| حدود العزل | `scripts/verify-website-boundaries.mjs` |

**لا يُنقل معه:** `banco-mobile` · `api-server` · `dealer-os` · `admin-os` · `lib/db`.  
يعتمد على API الحي + مكتبات workspace المشتركة (`api-client-react`, `taxonomy`, `search-contract`, `design-tokens`).

---

## 3. تشغيل سريع (نقل محلي / staging)

```bash
# 1) عزل
node scripts/verify-website-boundaries.mjs

# 2) Audits الموجات
node scripts/website-journey-parity-audit.mjs
node scripts/website-seller-workspace-parity-audit.mjs
node scripts/website-market-copy-parity-audit.mjs
node scripts/website-responsive-chrome-audit.mjs
node scripts/website-plug-hardening-audit.mjs

# 3) بناء
pnpm --filter @workspace/banco-web run build

# 4) Docker معزول
docker compose -f deploy/aws/docker-compose.banco-web.yml up -d --build
```

قائمة staging الكاملة: [`WEBSITE-STAGING-OPS-CHECKLIST-AR.md`](./WEBSITE-STAGING-OPS-CHECKLIST-AR.md).

---

## 4. أعلام آمنة (افتراضي للإنتاج)

```env
NEXT_PUBLIC_WEB_SEARCH_LIVE=false
NEXT_PUBLIC_WEB_SEARCH_MAP=false
NEXT_PUBLIC_WEB_MARKET_COPY=false
WEB_PLUG_ENABLED=true
```

| علم | معنى |
|-----|------|
| `WEB_SEARCH_LIVE` | بحث حي من API |
| `WEB_MARKET_COPY` | لوحات ماركت داخل الويب بدل روابط كلاسيكية |
| `WEB_PLUG_ENABLED` | `false` = فصل الفيشة (صيانة) خلال دقائق |

فصل طارئ: [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md).

---

## 5. تعريف «نُقل صح»

- [x] كود Phases 1–6 على فرع/main بدون ملفات سوداء  
- [x] Kill-switch وقت التشغيل + صفحة صيانة  
- [x] Health يعيد `plug: on|off` بدون إسقاط المراقبة  
- [x] CI Website معزول عن `ci.yml` الموبايل  
- [x] حزمة Staging pack (Phase 7) — Docker flags + prep audit + smoke  
- [x] Soft-launch pack (Phase 8) — healthz + قالب إنتاج + checklist  
- [ ] CDN/دومين staging + أسرار Clerk (OPS — أنت)  
- [ ] قرار تفعيل LIVE/MARKET على staging بعد smoke  
- [ ] Soft-launch CDN إنتاج محدود (OPS — بعد staging)  

---

## 6. خارج النطاق (لا يعيق النقل)

- تحكم أدمن `consumer_web_enabled` عبر API (يلمس api-server + admin-os)  
- Device QA / EAS للموبايل (طبقة 1 منفصلة)  
- استبدال كامل لـ dealer-os — الماركت الأصلي يبقى؛ الويب كوبي عبر API  

---

## 7. مراجع سريعة

| ملف | دور |
|-----|-----|
| [`WEBSITE-STACK-MERGE-READINESS-AR.md`](./WEBSITE-STACK-MERGE-READINESS-AR.md) | ترتيب الدمج |
| [`WEBSITE-STAGING-OPS-CHECKLIST-AR.md`](./WEBSITE-STAGING-OPS-CHECKLIST-AR.md) | بعد النشر |
| [`release/SURFACES-DEPLOY-FINISH.md`](../../release/SURFACES-DEPLOY-FINISH.md) | مصفوفة الأسطح |
| [`WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md`](./WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md) | سلامة الموبايل لكل PR |
