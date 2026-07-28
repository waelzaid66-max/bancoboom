# BANCO — نسخة مستقرة كاملة للتجربة (Snapshot)

**التاريخ:** 2026-07-10  
**الوسم:** `v1.1.3-seller-social-2026-07-10` @ `3b40782` (موجة 9 UX محلي)  
**الفرع المصدر:** `main`  
**الريبوهان الرسميان:**

| الريبو | URL | الدور |
|--------|-----|-------|
| **أساسي** | https://github.com/waelzaid66-max/-BANCO-CA-OOM- | كود + CI + تقارير + Replit + GCP |
| **AWS** | https://github.com/waelzaid66-max/aws-virgen | نسخة مطابقة لـ `main` + CD على EC2 |

---

## 1) SHA والتحقق الآلي (آخر تشغيل)

```bash
git fetch origin main
git rev-parse origin/main                    # 3b40782+
node scripts/production-confidence-check.mjs # 19/19
node artifacts/banco-mobile/tests/lib-hardening.test.mjs  # 47/47
pnpm --filter @workspace/search-contract run test
node audit/mobile/scripts/pre-redeploy-code-gate.mjs      # PASS
node audit/mobile/scripts/ops-next-step.mjs             # wave6 FRESH, wave8 STALE
node audit/mobile/scripts/probe-full-deploy.mjs         # PARTIAL until redeploy
node audit/mobile/scripts/post-redeploy-verify.mjs      # after Replit redeploy
```

| البوابة | النتيجة | ملاحظة |
|---------|---------|--------|
| production-confidence | **19/19** | proofs + contract + mobile regression |
| lib-hardening | **47/47** | موجات 6–9 + touch + routes |
| search-contract | **PASS** | `listingMode` → `is_request` |
| pre-redeploy-code-gate | **PASS** | market_country + map bookable/price |
| Live probe موجة 6 | **FRESH** | ISO + map signals |
| Live probe موجة 8 | **STALE** | `seller.social_links` missing on Replit |
| post-redeploy-verify | **PARTIAL** | wave 6 ok · wave 8 blocked |
| Device QA | **OPEN** | لم يُنفَّذ على جهاز حقيقي |
| staging-p0-smoke (upload) | **BLOCKED** | يحتاج `CLERK_BEARER_TOKEN` |

**API حي:** `https://banco-ca-oom.replit.app`

---

## 2) فهرس التقارير والخطط (اقرأ بالترتيب)

### موبايل (إلزامي للتجربة)

| الملف | المحتوى |
|-------|---------|
| `audit/mobile/MASTER-TRUTH-INVENTORY-AR.md` | جرد صادق — مشاكلك vs الحالة |
| `audit/mobile/PROFILE-BUTTON-INVENTORY-AR.md` | كل أزرار البروفايل حسب الدور |
| `audit/mobile/MOBILE-STABILIZE-PROGRESS.md` | M01–M31 + موجات 4–5 |
| `audit/mobile/NEXT-OPS-REPLIT-REDEPLOY.md` | redeploy + probe FRESH |
| `audit/mobile/DEVICE-QA-SECTION-COMPANIES.md` | checklist جهاز (مفتوح) |
| `audit/mobile/ARCHITECTURE-DEEP-UNDERSTANDING-AR.md` | طبقات L0–L7 |
| `audit/mobile/HONEST-INVENTORY-2026-07-10.md` | كود vs حي vs جهاز |
| `audit/mobile/MOBILE-PUBLISH-SUCCESS-GATE.md` | بوابة النشر للمتجر |

### إنتاج / سحابة

| الملف | المحتوى |
|-------|---------|
| `audit/production-readiness/` | جاهزية إنتاج |
| `deploy/aws/reports/` | تدقيق AWS |
| `deploy/gcp/reports/` | تدقيق GCP |
| `docs/AWS_VIRGEN_FULL_PUBLISH.md` | مزامنة aws-virgen |
| `DUAL_REPO_STATUS.md` | حالة الريبوهين |
| `release/AWS_VIRGEN_SYNC_MANIFEST.json` | جرد المزامنة |

### ويب (مسودة — خارج نطاق الموبايل المستقر)

| الملف | المحتوى |
|-------|---------|
| `audit/website/WEBSITE-MASTER-PLAN-AR.md` | خطة الموقع |
| `audit/website/WEBSITE-READINESS-GATES.md` | بوابات الجاهزية |
| `artifacts/banco-web/` | Next.js scaffold (غير مُختبَر E2E) |

---

## 3) كيف يعمل النظام (ملخص تشغيلي)

```
[Expo Mobile] ──HTTPS──► [api-server @ Replit/GCP/AWS]
                              │
                              ├── Postgres (listings, users, leads, messages)
                              ├── Clerk (auth)
                              └── Search/map clusters (market_country, is_bookable)

[Lead contact]  LeadService → specs.contact_phones[0] ثم users.phone
[Messages]      ConversationService → push مع listing_id + counterparty_name
[Search map]    clusters API حتى بدون pins في صفحة النتائج
[Profile menu]  Modal: View + absoluteFill backdrop (touch-safe)
[Language]      LanguageProvider لا يرسم قبل hydration
```

**أسرار محلية (لا تُرفع):** انسخ `scripts/local.env.example` → `.secrets/local.env`  
**تشغيل محلي:** `pnpm install` · `npx convex dev` غير مطلوب (لا Convex في هذا المونوريبو) · API عبر Replit أو محلي.

---

## 4) أوامر التجربة الكاملة

### أ) من جهاز المطوّر (Windows)

```powershell
cd C:\Users\waelz\Downloads\BANCO-CA-OOM
pnpm install --frozen-lockfile
node scripts/production-confidence-check.mjs
node audit/mobile/scripts/ops-next-step.mjs

# موبايل
cd artifacts\banco-mobile
npx expo start
# أو EAS:
cd ..\..
pnpm run ops:wave-b
```

### ب) Smoke على API حي

```powershell
$env:BANCO_API_URL = "https://banco-ca-oom.replit.app"
$env:CLERK_BEARER_TOKEN = "<Clerk JWT من التطبيق>"
node scripts/staging-p0-smoke.mjs
```

### ج) مزامنة aws-virgen (مالك المستودع)

```bash
export AWS_VIRGEN_SYNC_TOKEN="<PAT repo scope>"
./scripts/publish-aws-virgen-rc.sh v1.1.0-stabilize-2026-07-10
```

أو: GitHub Actions → **Sync aws-virgen (full main)**.

### د) على EC2

```bash
cd /opt/banco/aws-virgen
git fetch --all --tags
git checkout v1.1.0-stabilize-2026-07-10
AWS_REGION=... SSM_PREFIX=... bash deploy/aws/scripts/deploy.sh
```

---

## 5) ما أُصلِح في موجة التثبيت (ملخص)

| المجال | الإصلاح |
|--------|---------|
| Profile `⋯` menu | touch-safe modal — كانت الصفوف ميتة |
| Auth gate | نفس النمط للضيف |
| Home | `prefsReady` + قوائم logo/sort touch-safe |
| Search map | خريطة في النتائج بدون pins (cluster API) |
| Language | لا وميض RTL/LTR عند التحميل |
| Lead API | `contact_phones` أولاً |
| Notifications | deep-link برسائل مع listing/role |
| Stack | `settings`, `business/verification`, `assistant` |

---

## 6) النواقص والمشكلات المفتوحة (صادق)

| # | البند | الخطورة | المالك |
|---|--------|---------|--------|
| 1 | **Device QA** — PROFILE + SECTION-COMPANIES | P0 | أنت على جهاز |
| 2 | هاتف متعدد على **البروفايل** (ليس create) | منتج | قرار API أو UX |
| 3 | ماسنجر — ضبط بصري على جهاز | P1 | بعد QA |
| 4 | Near-me على **الويب** | معروف | `nearMe.ts` معطّل بالتصميم |
| 5 | `staging-p0-smoke` بدون Clerk JWT | OPS | أنت |
| 6 | أسرار مكشوفة سابقاً في الشات | أمن | **rotate فوري** |
| 7 | GitHub Actions billing (Run #50) | infra | سداد GitHub |
| 8 | `artifacts/banco-web` | WIP | ليس جزءاً من تجربة الموبايل المستقرة |
| 9 | نسبة «جاهز للمتجر» | — | ~60% كود+API · ~40% جهاز+smoke+قرارات |

---

## 7) سياسة الريبوهين

- **مصدر واحد للحقيقة:** `-BANCO-CA-OOM-` — كل التطوير هنا.
- **aws-virgen:** merge كامل لـ `main` + tag — **لا تطوير منفصل**.
- **cursor[bot]** قد يفشل push لـ aws-virgen (403) — استخدم PAT المالك أو workflow.

---

## 8) توقيع هذا الـ Snapshot

| البند | القيمة |
|-------|--------|
| Tip (stabilize) | `d531c14` |
| Live | **FRESH** @ Replit |
| Tag مقترح | `v1.1.0-stabilize-2026-07-10` |
| Device QA | **OPEN** |

*حدّث هذا الملف عند كل دفعة رئيسية — لا تكرر ادعاءات في الشات فقط.*
