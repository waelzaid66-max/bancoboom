# أوديت برودكشن حي — BANCO (2026-07-19)

**نوع التقرير:** Production Forensic (كود + CI + بوابات دمج + OPS)  
**مرجع main:** `88e83ca` (`fix(mobile): MOB-05…` #36)  
**قائد التنفيذ:** Cursor  
**قاعدة حديدية:** NO-WIPE · عزل website (`banco-website`) · لا W3 FI بدون Start بعد #28

---

## 0.1) Copilot — غير موثوق (إعلان المالك 2026-07-19)

**Copilot = UNTRUSTED.** لم يتبع تعليمات المسح. أي ادّعاء منه بدون ملف مُسنَد مرفوض.
المسح الرسمي: `audit/handoff/CURSOR-SCAN-REPORT-PRODUCTION-MOBILE-AR.md` (على فرع #37).
البروتوكول: `audit/handoff/COPILOT-UNTRUSTED-CURSOR-OWNS-SCAN-AR.md`.
لا تنتظروا Copilot قبل دمج #37/#38/#28.

## 0) حكم تنفيذي (Verdict)

| سؤال | الحكم |
|------|--------|
| هل المنصة «جاهزة بروودكشن كاملة» اليوم؟ | **لا** — كود كثير جاهز، لكن **GO** يحتاج إثبات جهاز + أسرار staging + دمج موجات مفتوحة |
| هل الموبايل على مسار برودكشن؟ | **جزئياً** — main فيه W1/W4/MOB-01/04/05؛ finish pack على **#37** بانتظار إثبات Replit |
| هل FI/Banks منفصل؟ | **P0 جاهز للمراجعة** على **#28** (CI أخضر) — W3 أمان محظور |
| هل الـ website جاهز soft-launch؟ | **كود Phase 9 + مشروع مستقل** موجود؛ باقي OPS CDN/Clerk/smoke |
| هل CI يحمي الموبايل كاملاً؟ | **كان ناقصاً** → أُغلق في هذا الفرع (`cursor/production-audit-ci-gates-4322`) |

---

## 1) خريطة المنصة (Package Map)

| سطح | مسار | ملاحظة برودكشن |
|-----|------|----------------|
| Mobile | `artifacts/banco-mobile` | Expo — سطح المالك الحالي |
| API | `artifacts/api-server` | Express + Clerk + Postgres |
| Admin | `artifacts/admin-os` | KYC / Financing / Users |
| Dealer | `artifacts/dealer-os` | خلف `requireDealerRole` |
| Website (نشط) | `artifacts/banco-website` | مستقل — لا تُلمس من موجات الموبايل |
| Website (مجمّد) | `artifacts/banco-web` | `FROZEN.md` — لا ميزات جديدة |
| Shared | `lib/db`, `lib/api-*`, `lib/search-contract` | عقد البحث + OpenAPI |

---

## 2) طبقات الحقيقة (لا تُخلط)

| طبقة | ماذا تثبت | ماذا لا تثبت |
|------|-----------|--------------|
| Static CI | حراس ملفات + typecheck + API tests | سلوك جهاز حقيقي |
| Replit Expo | معاينة على SHA محدد | EAS store build |
| Live API probe | مضيف منشور | كود local غير منشور |
| EAS / Store | بايناري متجر | بدون أسرار = متوقف |

**الخلاصة:** «CI أخضر» ≠ «برودكشن GO».

---

## 3) مصفوفة البوابات (Gate Matrix)

### G1 — كود على `main` (مغلق جزئياً)

| بند | حالة | دليل |
|-----|------|------|
| W1 قطع ذوبان Discover→Search | ✅ main | #32 |
| W4 sort في شريط الفلتر | ✅ main | #34 |
| MOB-01 هاتف الملف | ✅ main | #35 |
| MOB-04 RTL غلاف | ✅ main | #33 |
| MOB-05 إخفاء كروم Discover + Banks honesty | ✅ main | #36 |
| Discover ENTER portals + Stay header + MOB-07 | ⏳ #37 | floor `6b3c1d1` |

### G2 — CI / Deploy (هذا الفرع)

| بند | قبل | بعد |
|-----|-----|-----|
| `ci.yml` mobile-regression | icons+lib+resilience فقط | **`pnpm … run test` كامل** (6 حزم) |
| `deploy.yml` verify | typecheck+API فقط | **+ mobile full pack** |
| Demo seed على production | ممكن بالخطأ | **مرفوض** إلا `BANCO_ALLOW_DEMO_SEED=1` |

### G3 — PRs مفتوحة (ترتيب دمج إلزامي)

| ترتيب | PR | محتوى | بوابة دمج |
|------|-----|--------|-----------|
| 1 | **#37** | Mobile finish pack | Replit: reset→floor `6b3c1d1` + P01–P13 + CI أخضر |
| 2 | **هذا الفرع** CI/seed audit | بوابات CI+deploy+seed | CI أخضر (يمكن قبل أو بعد #37؛ يُفضَّل بعد #37 إن أردت حارس section الأحدث) |
| 3 | **#28** | FI P0 separation | Owner undraft + smoke FI يدوي |
| 4 | **#29** (لا #27 معاً) | FI forensic docs | docs فقط؛ تعارض add/add مع #27 |
| 5 | #30/#31 | docs خطة/حقيقة | docs فقط |
| — | W3 FI security | AuthZ/state machine | **محظور** حتى Start صريح بعد #28 |

### G4 — OPS (مالك فقط — لا يغلقه Cursor)

| ID | بند | حالة |
|----|-----|------|
| O16 | Staging smoke + أسرار | OPEN — OPS |
| — | EAS preview/production | OPEN — أسرار |
| — | تدوير أسرار معرّضة | OPEN — أمني |
| — | Website CDN/Clerk staging | OPEN — OPS |
| — | Live API redeploy (seller social Wave 8) | OPEN — نشر |

---

## 4) مخاطر P0 / P1 / P2 (مُسنَدة)

### P0

1. **إثبات جهاز / Replit لـ #37 لم يُسلَّم** — بدون SYNC_SHA + شوتات لا دمج.  
2. **Staging/EAS بلا أسرار** — `OPEN-ITEMS-BACKLOG` O16.  
3. **أسرار معرّضة تاريخياً** — تدوير قبل أي GO متجر.  
4. **Live API قديم نسبياً لميزات seller social** — يحتاج redeploy من كود حديث.

### P1

5. ~~CI لا يشغّل كل حراس الموبايل~~ → **أُغلق في هذا الفرع**.  
6. ~~Deploy يتخطى mobile regression~~ → **أُغلق في هذا الفرع**.  
7. **EAS بدون `EXPO_PUBLIC_DOMAIN`** → API base/router origin خاطئ.  
8. ~~`seed` كامل على production~~ → **قتل طارئ في هذا الفرع**.

### P2

9. Telemetry عام (`/v1/leads/signal`, ads impression) — تسميم إحصائيات (محدود بـ rate limit).  
10. Messenger/rental UX جزئي — يحتاج شوت جهاز لا تخمين.

### FI (بعد #28)

11. Agent PATCH بدون قيد فرع · state machine · verify→link · wipe KYC docs · forward لـ inactive — كلها **W3** محظورة الآن.

---

## 5) حراس الموبايل الموجودة (يجب أن تمر في CI)

مسار: `artifacts/banco-mobile/tests/`

| ملف | ماذا يحرس |
|-----|-----------|
| `icons.test.mjs` | سجل SVG، لا vector-icons runtime |
| `lib-hardening.test.mjs` | حجوزات، فوترة، عقارات، near-me |
| `mobile-resilience.test.mjs` | crash/offline/notifications |
| `universal-links-config.test.mjs` | روابط من env |
| `session-restore.test.mjs` | Clerk/biometric/guest lock |
| `section-miniapp-guard.test.mjs` | عزل الأقسام / Discover ENTER |

`package.json` → `"test"` يشغّل الستة.  
`i18n-usage.test.mjs` موجود لكن **غير** في `"test"` بعد — مرشّح موجة لاحقة إن استقر.

---

## 6) استكمال حقيقي — سلم التنفيذ (لا قفز)

```text
[NOW]  دمج/إثبات #37 (Replit tip+floor)     ← مالك+Replit
[NOW]  دمج فرع CI/seed هذا                     ← بعد CI أخضر
[NEXT] مراجعة smoke + دمج #28 FI P0           ← مالك
[NEXT] دمج #29 docs FI                         ← docs
[NEXT] Start W3 صريح فقط إن طلب المالك        ← أمان FI
[OPS]  أسرار staging → smoke → EAS preview    ← مالك
[OPS]  Website soft-launch gates              ← مسار website فقط
```

**ممنوع في أي موجة حالية:** حذف ميزات · لمس `banco-website` من موجة موبايل · Start W3 بدون جملة صريحة · ادّعاء GO من CI وحده.

---

## 7) أوامر إثبات سريعة (محلي / CI)

```bash
# Mobile full pack (بعد pnpm install)
pnpm --filter @workspace/banco-mobile run test

# Demo seed must refuse production
NODE_ENV=production pnpm --filter @workspace/api-server run seed
# المتوقع: throw / exit ≠ 0 بدون BANCO_ALLOW_DEMO_SEED=1
```

---

## 8) ملفات هذا الفرع

| ملف | تغيير |
|-----|--------|
| `.github/workflows/ci.yml` | mobile full pack |
| `.github/workflows/deploy.yml` | mobile قبل deploy |
| `artifacts/api-server/src/seed.ts` | `assertDemoSeedAllowed` |
| `deploy/aws/scripts/db-migrate.sh` | تحذير seed آمن |
| هذا الملف | أوديت حي |

---

— Cursor · Production Audit Live · 2026-07-19
