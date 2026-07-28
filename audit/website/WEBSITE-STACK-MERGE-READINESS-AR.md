# جاهزية دمج مكدس النسخة الكاملة (Phases 1–6)

**التاريخ:** 2026-07-18  
**القاعدة:** دمج من الأسفل للأعلى فقط — لا squash يعيد كتابة قاعدة المكدس بدون إعادة ترتيب  
**الميثاق:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)

---

## 1. ترتيب الدمج (إلزامي)

| ترتيب | PR | فرع | موجة |
|------:|----|------|------|
| 1 | [#11](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/11) | `cursor/website-phase1-visual-parity-4322` | شكل + لوجو |
| 2 | [#12](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/12) | `cursor/website-phase2-journey-parity-4322` | رحلات مستهلك |
| 3 | [#13](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/13) | `cursor/website-phase3-seller-workspace-4322` | مساحة بائع |
| 4 | [#14](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/14) | `cursor/website-phase4-market-copy-4322` | ماركت كوبي |
| 5 | [#15](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/15) | `cursor/website-phase5-responsive-chrome-4322` | هيدرز متجاوبة |
| 6 | [#16](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/16) | `cursor/website-phase6-plug-hardening-4322` | فيشة / kill-switch |

**Base لكل PR = الفرع السابق** (ليس `main` مباشرة عدا #11 إن دُمجت prep مسبقاً).  
بعد كل دمج: حدّث base للـ PR التالي أو اترك GitHub يعيد الاستهداف تلقائياً إن وُجدت علاقة stack.

---

## 2. إصلاح CI على القاعدة (تم)

فشل Website CI على #11–#13 كان بسبب توقعات SEO قديمة (`Browse the market`).  
أُصلح على Phase 1 (`fix(website-ci): align SEO static audit…`) ثم أُعيد ترتيب المكدس فوقه.

قبل الدمج تحقق:

```bash
# على رأس المكدس
node scripts/verify-website-boundaries.mjs
node scripts/website-journey-parity-audit.mjs
node scripts/website-seller-workspace-parity-audit.mjs
node scripts/website-market-copy-parity-audit.mjs
node scripts/website-responsive-chrome-audit.mjs
node scripts/website-plug-hardening-audit.mjs
```

وانتظر **CI Website / Build consumer web** أخضر على #11 ثم صعوداً.

---

## 3. Checklist قبل كل دمج

- [ ] Diff بلا ملفات سوداء (موبايل / api-server / dealer-os / admin-os / db / OpenAPI breaking / `ci.yml` gates)
- [ ] `verify-website-boundaries` PASS
- [ ] Website CI أخضر على الـ PR
- [ ] PR ما زال draft حتى موافقة المالك — ثم Ready + merge
- [ ] لا دمج عكسي (لا #16 قبل #11)

---

## 4. بعد دمج #16 على main — Staging OPS

انظر [`WEBSITE-STAGING-OPS-CHECKLIST-AR.md`](./WEBSITE-STAGING-OPS-CHECKLIST-AR.md).

أعلام آمنة افتراضياً:

| متغير | إنتاج آمن | Staging تجريبي |
|--------|-----------|----------------|
| `NEXT_PUBLIC_WEB_SEARCH_LIVE` | `false` | `true` بحذر |
| `NEXT_PUBLIC_WEB_SEARCH_MAP` | `false` | اختياري |
| `NEXT_PUBLIC_WEB_MARKET_COPY` | `false` | `true` لتجربة ماركت الويب |
| `WEB_PLUG_ENABLED` | `true` | `true` (اختبار فصل: `false`) |

فصل طارئ: [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md).

---

## 5. خارج هذا المكدس (لاحقاً)

- تحكم أدمن `consumer_web_enabled` عبر API (يلمس api-server + admin-os — موجة منفصلة بموافقة مالك)
- CDN دومين إنتاج + أسرار Clerk/API حية
- Device QA موبايل (طبقة 1 — أولوية منفصلة)

---

## 6. تعريف إنجاز المكدس

| معيار | حالة |
|-------|------|
| Phases 1–6 كود على فروع مكدّسة | ✅ |
| Kill-switch وقت التشغيل | ✅ `WEB_PLUG_ENABLED` |
| وثيقة فصل 5 دقائق | ✅ |
| SEO audit متوافق مع هيرو Phase 1 | ✅ على القاعدة |
| CI Website أخضر على #11→#16 | ✅ (2026-07-18) |
| دمج إلى `main` | ✅ #11 ثم PR توحيد رأس المكدس (Phases 2–6 + docs) — انظر [`WEBSITE-TRANSFER-HANDOFF-AR.md`](./WEBSITE-TRANSFER-HANDOFF-AR.md) |
| Staging CDN حي | ⏳ OPS |
