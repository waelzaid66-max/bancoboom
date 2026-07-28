# BANCO — المرجع الشامل للمشروع
**آخر تحديث:** 2026-07-19  
**HEAD (local main):** `cb2397f` — 2 commits ahead of origin/main  
**origin/main:** `47cc4e5`  
**الحالة:** TypeScript نظيف (0 أخطاء) · 7 workflows تعمل · GitHub push معلّق (توكن منتهي)

---

## 1. هيكل المشروع — نظرة شاملة

```
BANCO Monorepo (pnpm workspaces · Node.js 24 · TypeScript 5.9)
├── artifacts/
│   ├── api-server/        Express 5 · ESM · esbuild · 38.5k سطر
│   ├── banco-mobile/      Expo 53 · React Native · 30k+ سطر
│   ├── admin-os/          Vite React · Admin UI
│   ├── dealer-os/         Vite React · BANCO Market (dealer)
│   ├── landing/           Vite React · صفحة الهبوط
│   ├── banco-web/         Next.js · CI-isolated (لا .replit-artifact)
│   ├── banco-website/     Next.js · مجمّد
│   └── mockup-sandbox/    Vite · component preview server
├── lib/
│   ├── db/                Drizzle ORM · PostgreSQL schema
│   ├── api-spec/          openapi.yaml → مصدر الحقيقة
│   └── api-client-react/  Orval-generated typed client
├── deploy/
│   ├── gcp/               Cloud Run · Cloud Build · Dockerfile
│   └── aws/               Elastic Beanstalk · Docker · Nginx
├── scripts/               أدوات CI/CD · validation · smoke tests
├── release/               تقارير الإصدارات والتسليم
├── audit/                 production-readiness playbooks
└── docs/                  دليل النشر
```

---

## 2. الـ Surfaces وأدوار كل منها

| Surface | المسار | التقنية | الدور | Port |
|---------|--------|---------|-------|------|
| **API Server** | `artifacts/api-server` | Express 5 · ESM | الـBackend الوحيد — REST API | 8080 |
| **Banco Mobile** | `artifacts/banco-mobile` | Expo 53 · RN | التطبيق الرئيسي (iOS/Android) | metro |
| **Admin OS** | `artifacts/admin-os` | Vite React | لوحة الإدارة الداخلية | — |
| **Dealer OS** | `artifacts/dealer-os` | Vite React | BANCO Market للتجار | — |
| **Landing** | `artifacts/landing` | Vite React | صفحة الهبوط `/` | — |
| **Mockup Sandbox** | `artifacts/mockup-sandbox` | Vite | معاينة المكوّنات على الـCanvas | — |

**Routing في الإنتاج (Replit `router = "application"`):**
```
/              → landing
/admin-os/     → admin-os
/dealer-os/    → dealer-os
/banco-mobile/ → banco-mobile (Expo web)
/api           → api-server
```

---

## 3. شاشات التطبيق المحمول — الدليل الكامل

### Tabs الرئيسية
| الملف | الشاشة | الحجم |
|-------|---------|-------|
| `app/(tabs)/index.tsx` | Home — الصفحة الرئيسية | 1656 سطر |
| `app/(tabs)/search.tsx` | البحث + خريطة + Discover | 1329 سطر |
| `app/(tabs)/saved.tsx` | المحفوظات | — |
| `app/(tabs)/messages.tsx` | الرسائل | — |
| `app/(tabs)/profile.tsx` | البروفايل + إعدادات الحساب | 3865 سطر |

### شاشات الـListings
| الملف | الشاشة |
|-------|---------|
| `app/listing/[id].tsx` | تفاصيل الإعلان (3395 سطر) |
| `app/listings/create.tsx` | إنشاء إعلان (3333 سطر) |
| `app/listings/edit/[id].tsx` | تعديل إعلان |
| `app/listings/mine.tsx` | إعلاناتي (576 سطر) |

### شاشات Section Mini-Apps (مع خريطة)
| الملف | القسم |
|-------|-------|
| `app/section/car.tsx` | سيارات |
| `app/section/real-estate.tsx` | عقارات |
| `app/section/factories.tsx` | مصانع |
| `app/section/materials.tsx` | مواد |
| `app/section/booking.tsx` | حجز/إقامة (BOOM STAY) |

### شاشات Business
| الملف | الشاشة |
|-------|---------|
| `app/business/onboarding.tsx` | تسجيل الأعمال (1091 سطر) |
| `app/business/verification.tsx` | التحقق من الهوية KYC |
| `app/business/analytics.tsx` | تحليلات الأعمال (531 سطر) |
| `app/business/banks.tsx` | إدارة البنوك (812 سطر) |
| `app/business/rfq-inbox.tsx` | صندوق طلبات الأسعار (1026 سطر) |
| `app/business/supply-hub.tsx` | مركز التوريد |
| `app/business/investments/` | الاستثمارات |
| `app/business/global-supply/` | التوريد العالمي |
| `app/business/suppliers/` | الموردون |
| `app/business/market/` | السوق B2B |

### شاشات مالية وتشغيلية
| الملف | الشاشة |
|-------|---------|
| `app/wallet.tsx` | المحفظة (806 سطر) |
| `app/billing.tsx` | الفواتير (514 سطر) |
| `app/invoices.tsx` | قائمة الفواتير |
| `app/invoices/[id].tsx` | تفاصيل الفاتورة |
| `app/plans.tsx` | الخطط والاشتراكات (884 سطر) |
| `app/rfq/create.tsx` | إنشاء طلب سعر (542 سطر) |
| `app/rfq/[id].tsx` | تفاصيل طلب السعر (446 سطر) |
| `app/rfq/index.tsx` | قائمة طلبات الأسعار |

### شاشات أخرى
| الملف | الشاشة |
|-------|---------|
| `app/messages/[id].tsx` | محادثة (1411 سطر) |
| `app/assistant.tsx` | المساعد الذكي (567 سطر) |
| `app/settings.tsx` | الإعدادات (1513 سطر) |
| `app/notifications.tsx` | الإشعارات |
| `app/search-results.tsx` | نتائج البحث |
| `app/rentals/hub.tsx` | مركز الإيجار المفروش |
| `app/bookings.tsx` | الحجوزات |
| `app/industry/index.tsx` | الصناعة |
| `app/legal/terms.tsx` | الشروط والأحكام |
| `app/legal/privacy.tsx` | سياسة الخصوصية |
| `app/l/[id].tsx` | روابط مختصرة للإعلانات |
| `app/+not-found.tsx` | 404 |

---

## 4. API Routes — الدليل الكامل

**Base:** `GET /api/v1/...`  
**Health:** `GET /api/healthz` (liveness) · `GET /api/readyz` (readiness)

### المجموعات الرئيسية
```
Identity & Profile
  /me              → meRouter
  /users           → usersRouter
  /profiles        → profileRouter

Marketplace
  /listings        → CRUD + moderation
  /search          → full-text + map clusters + facets + autocomplete
  /search/map      → viewport-based clustering (GET ?min_lat,max_lat,min_lng,max_lng,zoom)
  /saves           → save/unsave listings
  /market          → market insights
  /global-supply   → B2B supply chain

Transactions
  /bookings        → booking lifecycle
  /financing       → credit requests + FI management
  /leads           → dealer leads CRM
  /rfqs            → request-for-quote system

Social
  /feed            → FeedItem BFF (cards with coordinates)
  /conversations   → chat threads
  /notifications   → push + in-app
  /stories         → listing stories

Business
  /dealer          → dealer dashboard
  /companies       → company profiles
  /sellers         → seller profiles

Financial
  /wallet          → balance + transactions
  /subscriptions   → plan management
  /payments        → Paymob integration
  /billing         → invoices + CSV export

Admin
  /admin           → moderation + analytics + plans (requireAdminRole)
  /reports         → abuse reports
  /uploads         → presigned URLs + verify + promote
  /reference       → taxonomy + locations + brands
  /ads             → sponsored listing ads
```

### Search API — تفاصيل مهمة
```
GET /api/v1/search?q=&category=&min_price=&max_price=&location=&...
  → SearchService.ts (972 سطر)
  → GIN trigram indexes (pg_trgm) على title + description
  → publicVisibilityConditions() — تصفية shadow-ban/flagged

GET /api/v1/search/map?min_lat=&max_lat=&min_lng=&max_lng=&zoom=
  → يعيد 14-16 cluster لمصر
  → COALESCE(listing.lat, location.lat) للإحداثيات
  → نفس فلاتر /search (مصدر حقيقة واحد)

GET /api/v1/search/facets → engineChips, priceRange, locationGroups
GET /api/v1/search/autocomplete
GET /api/v1/search/trending
GET /api/v1/search/recommendations
```

---

## 5. الـ Services — طبقة الأعمال

| Service | الملف | الحجم | المسؤولية |
|---------|-------|-------|-----------|
| ListingService | services/ | 1312 | دورة حياة الإعلان كاملة |
| AdminService | services/ | 1108 | الإشراف + التحليلات + الإيرادات |
| FinancingService | services/ | 1039 | طلبات الائتمان + FI |
| SearchService | services/ | 972 | بحث + خريطة + وجوه |
| NormalizationService | services/ | 961 | تطبيع البيانات |
| PromoAdCreditService | services/ | 769 | الإعلانات المموّلة |
| LeadService | services/ | 761 | CRM الطلبات |
| CompanyService | services/ | 611 | بروفايلات الشركات |
| AbuseService | services/ | 611 | مكافحة التلاعب |
| ConversationService | services/ | 605 | المحادثات |
| EmailService | services/ | 537 | Resend transport |
| SubscriptionService | services/ | 531 | إدارة الخطط |
| AiAssistantService | services/ | 513 | OpenAI chat |
| GlobalSupplyService | services/ | 469 | التوريد العالمي |
| InvestmentService | services/ | 445 | الاستثمارات |
| BookingService | services/ | 351 | الحجوزات |

---

## 6. قاعدة البيانات — Schema الرئيسي

**Stack:** PostgreSQL + Drizzle ORM (`lib/db/src/schema/index.ts`)  
**Extensions:** `pg_trgm` (مطلوبة — تُنشأ تلقائياً عند البدء)

### الجداول الأساسية
```sql
listings          -- الإعلانات (id, user_id, category, status, location_id, lat, lng, ...)
locations         -- 21 منطقة بإحداثيات WGS84 حقيقية
users             -- Clerk-synced (id, role, is_verified, is_banned, ...)
saved_listings    -- (user_id, listing_id) UNIQUE
conversations     -- المحادثات
messages          -- الرسائل
leads             -- الطلبات/التواصل
finance_requests  -- طلبات التمويل
bookings          -- الحجوزات
upload_claims     -- سجلات الرفع
wallet_transactions -- المعاملات المالية
subscriptions     -- الاشتراكات
plans             -- خطط الاشتراك (admin-managed)
companies         -- بروفايلات الشركات
audit_log         -- سجل الأحداث الأمنية
```

### إحداثيات الخريطة
- `listings.latitude / listings.longitude` — اختياري (بديل مباشر)
- `listings.location_id → locations.latitude / locations.longitude` — الافتراضي
- `enrichListings()`: `COALESCE(listing.lat, location.lat)`
- **نتيجة الفحص:** 128/134 listing نشطة لديها `location_id` وكلها تحصل على إحداثيات صحيحة

---

## 7. نظام الخرائط — الهيكل الكامل

### في Mobile Search (tabs/search.tsx)
```
viewState: "discover" | "results" | "loading" | "empty" | "error"

في "discover":
  ✅ مضاف: FAB زر "Map" (discover-mode map toggle)
  → يُطلق commit({...criteria, category})
  → wantMap latch يُفعّل mapMode عند وصول النتائج

في "results":
  canMap = viewState === "results" && mappableItems.length > 0
  → زر Map يظهر أعلى النتائج
  → <SearchResultsMap> WebView + Leaflet/OSM

mapHtml.ts:
  → Leaflet 1.9.4 من unpkg CDN (مؤكد accessible)
  → OSM tiles + clustering
  → viewport debounce 300ms → GET /search/map
  → window.BANCO_MAP.setClusters() injection
```

### في Section Mini-Apps (SectionSearchApp.tsx)
```
showMapChrome = inResultsView
→ خريطة تظهر فور تحميل النتائج
→ يعمل في: car, real-estate, factories, materials, booking sections
```

### API الخريطة
```
GET /api/v1/search/map?min_lat=25&max_lat=32&min_lng=28&max_lng=35&zoom=8
→ يعيد 14-16 cluster مع lat, lng, count, listing_id
→ نفس BFF pipeline كـ /search (مصدر حقيقة واحد)
```

---

## 8. Authentication & Authorization

**Provider:** Clerk  
**متطلبات:**
- `CLERK_PUBLISHABLE_KEY` — في الـEnv
- `CLERK_SECRET_KEY` — في Replit Secrets (50 chars ✅)

### الأدوار
```
individual     — مستخدم عادي (default)
dealer         — تاجر (self-service upgrade PATCH /me)
financial_institution (fi) — مؤسسة مالية
admin          — مدير (ADMIN_EMAILS env أو DB)
owner          — مالك النظام
```

### قواعد الوصول
- `requireAuth` — جلسة نشطة
- `optionalAuth` — جلسة اختيارية
- `requireAdminRole` — admin أو owner
- `requirePermission` — للعمليات المحددة
- `publicVisibilityConditions()` — يجب تطبيقه على كل surface عامة

---

## 9. نظام الرفع (Media Upload)

**Flow:**
```
1. Client → POST /api/v1/uploads/request-url
           → {url: presigned PUT URL, key: storage key, uploadId}
2. Client → PUT <presigned URL> (مباشرة إلى GCS/S3)
           → Content-Type header = مصدر الحقيقة للنوع
3. Client → POST /api/v1/uploads/verify {uploadId}
           → server يتحقق من الرفع
4. On listing publish → server يُروّج الملفات (private → public ACL)
```

**المزوّد:** `OBJECT_STORAGE_PROVIDER`
- `replit` (default) — Replit object storage sidecar
- `s3` — AWS S3 أو GCS بـHMAC

**ملاحظات:**
- لا cleanup تلقائي للملفات المتروكة
- لا video transcoding
- لا thumbnail generation من server
- سجل النية: `upload_claims` table

---

## 10. i18n — نظام الترجمة

**الملف:** `artifacts/banco-mobile/constants/i18n.ts` (3925 سطر)  
**اللغات:** English + Arabic  
**الضمان:** `ar: typeof en` — parity مُفروض بـTypeScript (خطأ typecheck عند أي مفتاح ناقص)  
**RTL:** `isRTL` flag + `rowDir = isRTL ? "row-reverse" : "row"` + `textAlign`

---

## 11. المكتبات والـHooks الأساسية

### Hooks
| الملف | الغرض |
|-------|-------|
| `hooks/useAuthGate.tsx` | auth gate — يوجّه الضيوف لـsign-up |
| `hooks/useSearchMiniApp.ts` | حالة البحث (criteria, commit, update, viewState) |
| `hooks/useColors.ts` | نظام الألوان (dark/light theme) |
| `hooks/useI18n.ts` | الترجمة |
| `hooks/usePushNotifications.tsx` | إشعارات push |

### Lib
| الملف | الغرض |
|-------|-------|
| `lib/searchParams.ts` | SearchCriteria + hasActiveCriteria() |
| `lib/searchTaxonomy.ts` | تصنيف البحث (RN-pure) |
| `lib/listingMedia.ts` | إدارة وسائط الإعلانات |
| `lib/upload.ts` | uploadMediaAsset() |
| `lib/listingDraft.ts` | مسودات الإعلانات |
| `lib/facets.ts` | معالجة الـfacets |
| `lib/nearMe.ts` | GPS proximity |
| `lib/sectionTheme.ts` | سمات الأقسام |
| `lib/billingExport.ts` | تصدير CSV |
| `lib/socialLinks.ts` | روابط التواصل |

---

## 12. مكوّنات البحث والخريطة

```
components/search/
├── SearchResultsMap.tsx      WebView + Leaflet (275 سطر)
├── mapHtml.ts                HTML/JS للخريطة (Leaflet CDN)
├── SectionSearchApp.tsx      mini-app مع خريطة (ظهور تلقائي)
├── BookingStaysApp.tsx       BOOM STAY section
├── stays/StaysHomeHeader.tsx black premium header (442 سطر)
├── SearchResultsSurface.tsx  عرض النتائج (discover/results/loading)
├── FilterSheet.tsx           لوحة الفلاتر
├── IndustrialSubChips.tsx    chips صناعية
└── [other search components]
```

---

## 13. المتطلبات البيئية

### Replit Secrets المطلوبة
| المتغير | الحالة | ملاحظة |
|---------|--------|--------|
| `DATABASE_URL` | ✅ (Replit DB) | PostgreSQL |
| `CLERK_SECRET_KEY` | ✅ SET (50 chars) | Auth |
| `CLERK_PUBLISHABLE_KEY` | ✅ ENV | Auth |
| `SESSION_SECRET` | ✅ SET (88 chars) | Cookie signing |
| `EXPO_TOKEN` | ✅ SET (40 chars) | EAS builds |
| `GITHUB_TOKEN` | ❌ INVALID (Arabic text) | **يحتاج PAT حقيقي** |
| `RESEND_API_KEY` | ❌ ملغي | الإيميلات تذهب لـlog mode |
| `PAYMOB_SECRET_KEY` | ⚠️ SET (6 chars — قيمة اختبار) | الدفع |
| `PAYMOB_HMAC_SECRET` | ⚠️ SET (4 chars — قيمة اختبار) | Webhooks |
| `PAYMOB_PUBLIC_KEY` | ❌ غير محدد | الدفع |
| `PAYMOB_INTEGRATION_IDS` | ❌ غير محدد | الدفع |
| `OBJECT_STORAGE_BUCKET_ID` | ✅ (Replit sidecar) | الرفع |

### متغيرات ENV الاختيارية
| المتغير | الغرض |
|---------|-------|
| `OPENAI_API_KEY` | AI Assistant (fallback) |
| `OBJECT_STORAGE_PROVIDER` | `replit` أو `s3` |
| `ADMIN_EMAILS` | أول admin عند إنشاء الحساب |
| `ALERT_WEBHOOK_URL` | تنبيهات الأخطاء |

---

## 14. النشر — دليل سريع

### Replit (Dev + Publish)
```bash
# تشغيل أول مرة
./scripts/replit-dev-setup.sh

# تشغيل عادي — 7 workflows
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/banco-mobile run dev
pnpm --filter @workspace/admin-os run dev
pnpm --filter @workspace/dealer-os run dev
pnpm --filter @workspace/landing run dev

# اختبارات
pnpm run typecheck          # 0 أخطاء ✅
pnpm --filter @workspace/api-server test  # 295 passed
pnpm run confidence         # 12 production gates

# DB
pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/api-server run seed
```

### GCP (Cloud Run)
```bash
# الملفات المرجعية
deploy/gcp/BANCOOOM_CANONICAL_DEPLOY.md  ← اقرأ أولاً
deploy/gcp/cloudbuild.deploy.yaml        ← Cloud Build config
deploy/gcp/env/SECRET_MANAGER_MAPPING.md ← أسرار Secret Manager
deploy/gcp/scripts/bootstrap-project.sh ← إعداد مرة واحدة

# أهم قاعدة: استخدم repos/bancooom (ليس -BANCO-CA-OOM-)
# _AR_REPO=banco · _IMAGE_NAME=api · _REGION=me-central1
```

### AWS (Elastic Beanstalk)
```bash
deploy/aws/reports/00-README.md    ← اقرأ أولاً
deploy/aws/Dockerfile.api
deploy/aws/docker-compose.prod.yml

# sync
export AWS_VIRGEN_SYNC_TOKEN="<PAT>"
./scripts/publish-aws-virgen-rc.sh v1.1.4-production-2026-07-10
```

### مزامنة المرآة (بعد كل push مهم)
```bash
./scripts/push-mirror-remotes.sh    # b-banco + b.deals + B-OOM + origin
```

---

## 15. الريبوهات والفروع

### الريبوهات
| الاسم | URL | الدور |
|-------|-----|-------|
| **origin** | `waelzaid66-max/-BANCO-CA-OOM-` | مصدر التطوير الرئيسي |
| **bancooom** | `waelzaid66-max/bancooom` | GCP deploy (Docker tags آمنة) |
| **aws-virgen** | `waelzaid66-max/aws-virgen` | AWS EC2/EB mirror |
| **bbanco** | `waelzaid66-max/b-banco` | مرآة |
| **bdeals** | `waelzaid66-max/b.deals` | مرآة |
| **boom** | `waelzaid66-max/B-OOM` | مرآة |

### أهم الفروع المرجعية
| الفرع | الحالة | ملاحظة |
|-------|--------|--------|
| `main` | ✅ النسخة الأحدث | 2 commits أمام origin |
| `origin/main` | `47cc4e5` | آخر push ناجح |
| `origin/claude/handoff-full-facts-20260719` | مرجعي | توثيق Claude الكامل |
| `origin/cursor/booking-notif-test-contract-4322` | ⛔ **DANGEROUS** | 478 ملف + 36k حذف — لا تدمج |
| `origin/fix/mobile-master-stabilize` | قديم | نسخة قديمة |
| `replit-agent` | backup | Replit backup |

### PRs المدمجة المؤكدة (#32–#41)
جميعها مدمجة في `main` ومُختبرة:
- W1 section filter isolation (#32)
- FI-authz (#40) — 8/8 tests green
- Section G2 finish (#41) — أحدث PR

---

## 16. التقييم والاختبارات

| الاختبار | الحالة | التفاصيل |
|---------|--------|---------|
| TypeScript (كل الـpackages) | ✅ 0 أخطاء | banco-mobile + api-server + admin-os + dealer-os + landing |
| Backend API tests | ✅ 295 passed / 3 skipped | PostgreSQL حقيقي |
| Mobile regression | ✅ 23 passed | icons + lib + resilience |
| ESLint (scripts) | ✅ 0 أخطاء | |
| Map clusters | ✅ 14-16 cluster على مصر | فحص مباشر |
| Coordinates في DB | ✅ 128/134 listings | COALESCE تعمل |
| Health endpoints | ✅ /api/healthz · /api/readyz | |
| GitHub CI | ✅ 5/5 (origin/main) | آخر تشغيل |

---

## 17. ما تم في هذه الجلسة (19 يوليو 2026)

### إضافات مؤكدة (commit `79dc2de`)
1. **Discover Map FAB** في `search.tsx`:
   - زر خريطة في حالة "discover" (قبل أي بحث)
   - `wantMap` latch يُفعّل الخريطة تلقائياً عند وصول النتائج

2. **menuItems useMemo** في `profile.tsx`:
   - كان يُبنى في كل render (14 عنصر + closures)
   - الآن يُبنى فقط عند تغير: `showRentalHub, isBusiness, isFi, t`

3. **staleTime على 4 queries متوازية** في `profile.tsx`:
   - `useGetMyMetrics` → staleTime: 60,000ms
   - `useGetMe` → staleTime: 60,000ms
   - `useGetMySocialLinks` → staleTime: 60,000ms
   - `useGetMyListings` → staleTime: 30,000ms

### إضافات جلسة 18 يوليو (commit `47cc4e5`)
4. **StaysHomeHeader** (`components/search/stays/StaysHomeHeader.tsx`) — 442 سطر
   - BOOM STAY premium black header مع 4 bands
5. **Profile menu button** نقل من cover overlay إلى avatarRow
6. **i18n**: `staysTabAll` + `staysTagline` EN+AR

---

## 18. ما يحتاج action من المالك

| البند | الأولوية | الإجراء |
|-------|---------|--------|
| **GitHub PAT حقيقي** | 🔴 عالية | استبدل `GITHUB_TOKEN` في Replit Secrets بـPAT صالح من GitHub Settings → Tokens |
| **`RESEND_API_KEY` جديد** | 🟡 متوسطة | resend.com → API Keys → Create |
| **`PAYMOB_*` المفاتيح** | 🟡 متوسطة | من Paymob Dashboard للبيئة الحقيقية |
| **`OPENAI_API_KEY`** | 🟡 متوسطة | لتشغيل AI Assistant |
| **EAS / متاجر التطبيقات** | 🔵 لاحقاً | `release/STORE_PUBLISHING_GUIDE.md` |
| **GCP Console triggers** | 🔵 لاحقاً | `deploy/gcp/TRIGGER_MIGRATION.md` |

---

## 19. أوامر Push للريبو (بعد إصلاح GitHub PAT)

```bash
# push origin
git push origin main

# push كل المرآة دفعة واحدة
MIRROR_PUSH_TOKEN="<PAT>" ./scripts/push-mirror-remotes.sh

# أو يدوياً
GITHUB_TOKEN="<real-pat>" git push https://x-access-token:${GITHUB_TOKEN}@github.com/waelzaid66-max/-BANCO-CA-OOM-.git main
```

---

## 20. الملفات المرجعية المهمة

| الملف | المحتوى |
|-------|---------|
| `replit.md` | دليل التشغيل والـstack |
| `STATUS_REPORT.md` | حالة الإنتاج + أدلة الاختبارات |
| `REPO_SYNC_STATUS.md` | حالة مزامنة الريبوهات |
| `release/PRIMARY_AGENT_HANDOFF.md` | تسليم وكيل رئيسي |
| `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md` | runbook موحّد |
| `deploy/gcp/BANCOOOM_CANONICAL_DEPLOY.md` | GCP canonical |
| `deploy/gcp/reports/00-README.md` | GCP reports |
| `deploy/aws/reports/00-README.md` | AWS reports |
| `audit/production-readiness/` | قوائم الجاهزية |
| `release/FULL-STABLE-SNAPSHOT-2026-07-10.md` | snapshot مستقر |
| `.agents/memory/MEMORY.md` | ذاكرة الوكيل |

---

*تم إنشاء هذا المستند تلقائياً بفحص شامل للمشروع — 19 يوليو 2026*
