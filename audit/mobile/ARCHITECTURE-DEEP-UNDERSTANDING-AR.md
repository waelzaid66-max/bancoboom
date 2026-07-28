# الفهم المعماري العميق — مسار الموبايل (stabilize → publish)

**التاريخ:** 2026-07-10  
**الفرع:** `fix/mobile-master-stabilize`  
**القاعدة:** الكود ≠ Live ≠ الجهاز ≠ المتجر. لا خلط طبقات.

---

## 0) الحكم المعماري بجملة

المنتج مبني كـ **أربع شركات تصفّح** فوق **عقد بحث مشترك** و**API واحد للحقيقة**، مع **عزل مزدوج** (عقد + SQL)، ومسار نشر **مرتّب بطبقات** لا يُقفز بينها. الموقع consumer **شقيقة** وليست حاجزاً.

---

## 1) الترتيب المعماري السليم (من الأعلى للأسفل)

```
L7  Store (Play / App Store)          ← لا يُفتح قبل L6
L6  Device QA                         ← بشري فقط
L5  EAS preview build                 ← يحتاج L4 أخضر
L4  Staging smoke + schema            ← JWT + DATABASE_URL
L3  Live API freshness (probe)        ← Redeploy Replit ← الحاجز الحالي
L2  Local automated proofs/tests      ← أخضر على الفرع
L1  Code (M01–M31 + Security P0)      ← CLOSED على الفرع
L0  Shared contracts + DB schema      ← أساس لا يعتمد على العملاء
```

**اتجاه الاعتماديات المسموح (↓ فقط):**

```
banco-mobile / banco-web
        ↓
search-contract → taxonomy + api-client-react
        ↓ HTTP
api-server → lib/db
```

**ممنوع:**
- `api-server` يستورد `search-contract` أو mobile/web
- `banco-web` يستورد mobile / api-server / db
- فشل typecheck الموقع يوقف CI الموبايل
- ادّعاء L6/L7 أخضر وL3 STALE

---

## 2) خريطة الحزم (ماذا يملك ماذا)

| طبقة | مسار | يملك | لا يملك |
|------|------|------|---------|
| عميل أساسي | `artifacts/banco-mobile` | UI البحث، إنشاء، خريطة WebView، Discover، Profile hubs | حقيقة SQL |
| عميل شقيق | `artifacts/banco-web` | parity لنفس العقد | حجب الموبايل |
| عقد مشترك | `lib/search-contract` | Criteria → params، engines، CLEAR، facets، map params، hub URLs | DB |
| تصنيف | `lib/taxonomy` | 4 UI cats → 3 API cats + industrial groups | HTTP |
| API | `artifacts/api-server` | SearchService، material gate، visibility، upload claims، Bff bookable | UI |
| DB | `lib/db` | schema + ensureSchema | منطق شركات |
| تدقيق | `audit/mobile` | بوابات، proofs، probes | runtime |

---

## 3) نموذج «أربع شركات تصفّح» (فلسفة المنتج)

واجهة المستخدم: **car | real_estate | facilities | materials**  
قاعدة البيانات: **car | real_estate | industrial** فقط.

| شركة UI | API category | فصل | تملك | لا تملك |
|---------|--------------|-----|------|---------|
| سيارات | `car` | مباشر | condition، import، تمويل، brand/fuel في FilterSheet | إيجار، material، industry منشآت |
| عقارات | `real_estate` | مباشر | sale/rent، `rental_term` **فقط مع rent** | fuel، material |
| منشآت | `industrial` + factory/warehouse/land | `industrial_type` | مواقع، قطاع مصنع | origin محلي/مستورد، material |
| مواد | `industrial` + production_line/raw_material/machine | `industrial_type` | material، origin | إيجار عقاري، منشآت |

**عزل ثلاثي (لماذا لا يتسرّب الفلتر):**

1. **UI:** `CLEAR_SECTION_ATTRS` عند تبديل الشركة + إخفاء شرائح غير التابعة  
2. **عقد:** `buildSearchParams` لا يُصدر params خارج نطاق الشركة  
3. **API:** `allowCommodityMaterialFilter` + شروط SQL في `SearchService`

**خارج Search عمداً:**
- Host rental hub → Profile فقط  
- B2B / Supply → Business hub  
- استيراد سيارات → محرك car + Discover marketplace (ليس B2B)

---

## 4) تدفق البحث من طرف لطرف

```
مستخدم (تبويب / محرك / FilterSheet / Discover / سوق / قربّي)
    → search.tsx + useSearchMiniApp (criteria + حارس تسلسل)
    → CLEAR_SECTION_ATTRS عند تغيير الشركة
    → buildSearchParams / buildMapClusterParams  (@workspace/search-contract)
    → GET /v1/search  أو  /v1/search/map
    → searchController.parsedFromSearchQuery   (مسار parse موحّد list+map)
    → SearchService:
         active + category/industrial_type
         + marketCountryConditions
         + publicVisibilityConditions
         + buildAttributeConditions (+ material gate)
         + near-me / bbox
    → enrich + Bff is_bookable (قائمة)
    → mapClusters: is_bookable + price_display للخلية الواحدة
    → بطاقات / mapHtml (Leaflet)
```

**إشارات freshness على Live (L3):**
- `market_country=EGYPT` → ≥400  
- خريطة فيها `is_bookable` + `price_display`  
- EG≠SA إشارة ناعمة (قد تتطابق إن المخزون بلد واحد)

---

## 5) أمان P0 — ترتيب السلسلة (لا يُعكس)

```
request-url
  → recordUploadClaim(path, clerkId) TTL 15m
PUT bytes
verify
  → assertCallerMayUseUpload (ACL owner أو claim ساري)
  → extend claim 60m
promote / ListingService attach
  → assert مرة أخرى
  → promoteServingUrlToPublic(url, clerkId)   // Clerk ID لا UUID
  → consumeUploadClaim
```

| إصلاح | مكان | دور |
|-------|------|-----|
| C-01 | `uploadClaims.ts` | منع IDOR على مسار الرفع |
| C-02 | `escapeLikeLiteral` في `lib/sqlLikeEscape.ts` + vitest | منع توسيع LIKE على legacy serve |
| C-03 | `feedVisibility.publicVisibilityConditions` | إخفاء بائع محذوف من السطح العام |
| H-03 | promote بـ clerkId | تطابق مالك ACL |

---

## 6) ماذا أُغلق في الكود (L1) مقابل ماذا بقي (L3+)

| مجموعة | الحالة المعمارية |
|--------|------------------|
| M01–M27 stabilize UX | كود موجود في mobile |
| M28–M31 شركات + material + market + hub new_law | عقد + API + mobile + web parity |
| أمان P0 | كود + اختبارات (بعضها يحتاج DB) |
| Live Replit | **STALE** — لم يُنشر الفرع بعد |
| Smoke / EAS / Device / Store | مفتوحة عند المشغّل |

---

## 7) ترتيب العمل الصحيح من الآن (لا تقفز)

1. Redeploy Replit على `fix/mobile-master-stabilize`  
2. `post-redeploy-verify.mjs` → FRESH  
3. smoke بـ JWT على `banco-ca-oom.replit.app` (ليس janeway ميت)  
4. schema verify  
5. EAS preview  
6. Device QA (ACCEPTANCE + SECTION-COMPANIES)  
7. Production store  

الموقع / Paymob / مجلدات reference: **خارج هذا المسار**.

---

## 8) ملفات الحقيقة (مرجع سريع)

| ملف | دور معماري |
|-----|------------|
| `lib/search-contract/src/types.ts` | Criteria + CLEAR |
| `lib/search-contract/src/buildSearchParams.ts` | بوابات الإصدار للـ API |
| `lib/search-contract/src/engines.ts` | محركات رحلة (param واحد/شريحة) |
| `lib/taxonomy/src/categories.ts` | 4→3 mapping |
| `artifacts/api-server/.../SearchService.ts` | حقيقة البحث/الخريطة |
| `allowCommodityMaterialFilter.ts` | بوابة material خالصة |
| `feedVisibility.ts` / `uploadClaims.ts` | أمان السطح العام / الرفع |
| `MOBILE-PUBLISH-SUCCESS-GATE.md` | بوابة النشر الوحيدة |
| `SECTION-ISOLATION-STRICT-2026-07-10.md` | عزل strict حقل/زر/خريطة |
| `ARCHITECTURE-FILE-INDEX.md` | فهرس البنية الكامل |
| `NEXT-OPS-REPLIT-REDEPLOY.md` | خطوة L3 التنفيذية |

---

## 10) عزل الأقسام (طبقة إضافية 2026-07-10)

بعد M28–M31، مراجعة حقل-بحقلة كشفت تسرّبات **محددة** (ليست تخميناً):

| طبقة | آلية |
|------|------|
| UI | `CLEAR_SECTION_ATTRS` + إخفاء chrome + مسح suggestions عند التبديل |
| عقد | `buildSearchParams` يحذف installment خارج car/RE |
| API | autocomplete بـ `category` + `industrial_type` |
| خريطة | `criteriaKey` يخرج من sticky map؛ bookable RE-only |

الإثبات: `proof-isolation.mjs` + `lib-hardening` + ضمن `pnpm run confidence`.

---

## 9) مخاطر معمارية واعية

1. **ازدواج UI cat / API cat** — facilities/materials يشتركان في `industrial`؛ الخطأ يظهر كـ `industrial_type` خاطئ (مُخفَّف بعقد + API).  
2. **ازدواج chrome mobile/web** — العقد مشترك؛ الشرائح مكررة سطحياً.  
3. **bookable ضيّق** — فقط `furnished_daily`؛ إيجار طويل ≠ حجز.  
4. **Live متأخر عن الكود** — أكبر فجوة تشغيلية الآن.  
5. **اختبارات API الثقيلة** تحتاج `DATABASE_URL` قابل للوصول.

---

**الخلاصة:** المعمارية سليمة ومرتّبة؛ العمل المتبقي ليس «إعادة تصميم» بل **تشغيل الطبقة L3 فما فوق** بنفس الترتيب أعلاه.
