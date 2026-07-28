# خطة النسخة الكاملة للموقع + حزمة التحضير

**التاريخ:** 2026-07-18  
**الحالة:** Phases 0–6 **منفّذة ومدموجة** — التشغيل الحي (CDN/أسرار) يبقى OPS  
**الميثاق الملزم:** [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)  
**ريبو:** نفس المونوريبو (`-BANCO-CA-OOM-`) — سطح `artifacts/banco-web` فقط  

---

## 0. الهدف من فوق (كما اتُفق)

1. **نسخة كوبي كاملة** من تجربة BANCO على الويب: نفس الشكل، اللوجو، الأقسام، الرحلات الأساسية.  
2. لاحقاً: **دمج BANCO Market ككوبي** داخل تجربة الموقع (بدون كسر `dealer-os` الأصلي).  
3. أخيراً: **هيدرز / كروم ويب** تلائم الشاشات والأجهزة بأمان.  
4. يبقى الموقع **جهازاً منفصلاً بفيشة** — يُفصل عند العطل.  
5. **عدم المساس** بخط الإنتاج الحالي (موبايل / API / ماركت / أدمن / Replit).

---

## 1. ضمان عدم المساس (كيف نثبته عملياً)

| آلية | ماذا تفعل |
|------|-----------|
| ميثاق NO-TOUCH | قائمة سوداء/بيضاء ملزمة |
| فرع عمل ويب فقط | `cursor/website-*` — diff لا يخرج عن البيضاء |
| `verify-website-boundaries.mjs` | يمنع import من موبايل/ماركت/أدمن/API/DB |
| `ci-website.yml` path-filtered | فشل الويب لا يوقف `ci.yml` |
| لا `.replit-artifact` لـ banco-web | نشر Replit الحالي لا يعتمد على الويب |
| مراجعة diff قبل الدمج | رفض أي ملف أسود |

**خط الإنتاج الحالي يبقى على `main` الأخضر كما هو؛ مسار الويب لا يُدمَج إلا بموجات معزولة ومراجَعة.**

---

## 2. الوضع الحالي (جرد 2026-07-18 — قراءة فقط)

### 2.1 ما يوجد في `artifacts/banco-web`

| بند | عدد / حالة |
|-----|------------|
| صفحات `page.tsx` | **42** (AR + EN) |
| مكوّنات | **57** تقريباً |
| Stack | Next.js + Clerk + `@workspace/{api-client-react,taxonomy,search-contract,design-tokens}` |
| بحث / خريطة / hubs / workspace | موجودة كهيكل |
| Feature flags | `WEB_SEARCH_LIVE` / `WEB_SEARCH_MAP` افتراضياً off (آمن) |
| في core CI | **لا** |
| `.replit-artifact` | **لا** |

مسارات مهمة موجودة: `/`, `/search`, `/listing/[id]`, hubs (cars/real-estate/industrial), `/workspace/*`, `/directory`, locales `/en/*`.

### 2.2 الفجوة مقابل «نسخة كاملة بنفس الشكل»

| فجوة | المعنى |
|------|--------|
| هوية بصرية | قد لا تطابق لوجو/هيرو/كروم الموبايل حرفياً — يحتاج تدقيق بصري موجّه |
| أعلام البحث | LIVE/MAP off → تجربة «نصف حيّة» حتى تفعيل staging |
| `lint:website` | سكربت مذكور في CI وقد يكون مكسوراً — إصلاح **داخل مسار الويب/scripts فقط** |
| Market داخل الويب | حالياً رابط/لوحة B2B خفيفة — **ليست** كوبي كاملة لـ dealer-os |
| هيدرز أجهزة | `SiteChrome` / `SiteMainNav` تحتاج موجة مخصّصة بعد اكتمال النسخة |
| Staging CDN | معلّق تشغيلياً (أسرار/دومين) — لا يمس الإنتاج |

### 2.3 ما لن نلمسه أثناء التنفيذ

موبايل · api-server · admin-os · dealer-os (حتى موجة Market-copy) · db schema · OpenAPI breaking · `ci.yml` gates.

---

## 3. المناهج (اختيار موصى به)

| # | المنهج | إيجابيات | سلبيات |
|---|--------|----------|--------|
| **A — موصى به** | إكمال/محاذاة `banco-web` داخل المونوريبو تحت الميثاق | نفس العقود واللوجو/التوكينز؛ فيشة CI/CDN | انضباط صارم على الـ diff |
| B | ريبو فرونت منفصل | عزل نفسي أقصى | مزامنة taxonomy/API/لوجو يدوياً — تعب ومخاطر انحراف |
| C | دمج مبكر لـ dealer-os داخل الويب | ماركت أسرع | يكسّر مبدأ الفيشة ويلامس ماركت مبكراً |

**القرار المقترح للتنفيذ لاحقاً (بعد موافقتك): المنهج A.**

---

## 4. موجات التنفيذ (بعد الموافقة — ترتيب صارم)

> لا تبدأ موجة قبل إغلاق بوابة الموجة السابقة. كل موجة = PRs ويب-only.

### Phase 0 — Freeze & Prep ✅

- [x] ميثاق عدم المساس  
- [x] خطة + جرد  
- [x] قائمة بيضاء/سوداء  
- [x] موافقة تنفيذ عبر مسار الموجات (PR #11–#17)  

### Phase 1 — Visual parity (النسخة الشكلية)

**الهدف:** الصفحة الأولى + كروم + لوجو + ألوان = نفس إحساس التطبيق/البراند.  
**مسموح:** `banco-web/components/Site*`, tokens, assets تحت `banco-web` فقط.  
**ممنوع:** أي ملف موبايل.  
**خروج:** لقطات قبل/بعد · checklist هوية · boundaries PASS.  
**حالة:** تنفيذ على PR — انظر [`WEBSITE-PHASE1-VISUAL-PARITY-STATUS-AR.md`](./WEBSITE-PHASE1-VISUAL-PARITY-STATUS-AR.md).

### Phase 2 — Journey parity (رحلات المستهلك)

**الهدف:** بحث · تفاصيل · حفظ · تواصل تعمل على staging بنفس عقد الـ API.  
**Flags:** تفعيل LIVE بحذر على staging فقط.  
**خروج:** smoke staging · parity search-contract بدون تعديل موبايل.  
**حالة:** تقوية كود + audit CI — انظر [`WEBSITE-PHASE2-JOURNEY-PARITY-STATUS-AR.md`](./WEBSITE-PHASE2-JOURNEY-PARITY-STATUS-AR.md). staging CDN smoke معلّق OPS.

### Phase 3 — Seller workspace parity

**الهدف:** إنشاء/تعديل/إعلاناتي/leads بمستوى عملي (W5 الموجود يُكمَّل لا يُعاد من صفر).  
**خروج:** رحلة بائع على ويب staging.  
**حالة:** تقوية كود + audit CI — انظر [`WEBSITE-PHASE3-SELLER-WORKSPACE-PARITY-STATUS-AR.md`](./WEBSITE-PHASE3-SELLER-WORKSPACE-PARITY-STATUS-AR.md).

### Phase 4 — Market copy (BANCO Market داخل الويب)

**الهدف:** كوبي تجربة ماركت للتاجر داخل `banco-web` (مسارات `/market` أو `/workspace/b2b` موسّعة).  
**قاعدة:** `dealer-os` الأصلي **يبقى**؛ لا ننقل ملفاً منه — نعيد بناء/نسخ تجربة عبر API المشتركة.  
**خروج:** تاجر ينجز مهامه من الويب؛ dealer-os artifact كما هو للـ Replit/AWS.  
**حالة:** MVP قراءة (overview/RFQs/supply) + flag — انظر [`WEBSITE-PHASE4-MARKET-COPY-STATUS-AR.md`](./WEBSITE-PHASE4-MARKET-COPY-STATUS-AR.md).

### Phase 5 — Headers / responsive chrome

**الهدف:** هيدرز ويب آمنة (موبايل متصفح / تابلت / ديسكتوب) بدون كسر SEO.  
**خروج:** لا تداخل مع محتوى؛ a11y أساسي؛ اختبار عرض متعددة.  
**حالة:** هيدر sticky + درج موبايل + workspace عمود واحد — انظر [`WEBSITE-PHASE5-RESPONSIVE-CHROME-STATUS-AR.md`](./WEBSITE-PHASE5-RESPONSIVE-CHROME-STATUS-AR.md).

### Phase 6 — Plug hardening

**الهدف:** kill-switch / flag إيقاف موقع · مراقبة منفصلة · توثيق فصل CDN.  
**خروج:** وثيقة «كيف تفصل الفيشة في 5 دقائق».  
**حالة:** `WEB_PLUG_ENABLED` + صيانة + health — انظر [`WEBSITE-PHASE6-PLUG-HARDENING-STATUS-AR.md`](./WEBSITE-PHASE6-PLUG-HARDENING-STATUS-AR.md) و [`WEBSITE-PLUG-DETACH-5MIN-AR.md`](./WEBSITE-PLUG-DETACH-5MIN-AR.md).

---

## 5. حزمة التحضير (ما جهّزناه الآن)

| أصل | مسار |
|-----|------|
| ميثاق عدم المساس | `WEBSITE-NO-TOUCH-CHARTER-AR.md` |
| هذه الخطة | `WEBSITE-FULL-COPY-PLAN-AND-PREP-AR.md` |
| رؤية سابقة | `WEBSITE-MASTER-PLAN-AR.md` |
| مصفوفة ميزات | `WEBSITE-FEATURE-MATRIX.md` |
| بوابات توقيع | `WEBSITE-READINESS-GATES.md` |
| استقلال موبايل | `WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md` |
| سكربت الحدود | `scripts/verify-website-boundaries.mjs` |
| CI ويب معزول | `.github/workflows/ci-website.yml` |
| Docker ويب | `deploy/aws/Dockerfile.banco-web` |
| Env ويب | `artifacts/banco-web/.env.example` |

### أوامر جاهزة (ويب فقط — بعد الموافقة)

```bash
# حدود العزل
node scripts/verify-website-boundaries.mjs

# CI ويب محلي إن وُجد السكربت
pnpm run ops:website-ci   # أو إصلاح السكربت داخل scripts/ فقط إن نقص

# بناء ويب بدون لمس موبايل
pnpm --filter @workspace/banco-web run build
```

### ما نحتاجه منك تشغيلياً (OPS — ليس كود إنتاج)

1. موافقة كتابية على هذه الخطة (المنهج A).  
2. دومين/CDN staging للويب (منفصل عن API).  
3. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `NEXT_PUBLIC_API_URL` لبيئة ويب staging.  
4. قرار توقيت تفعيل `WEB_SEARCH_LIVE` على staging.

---

## 6. تعريف الإنجاز (Definition of Done)

| معيار | محقق عندما |
|-------|------------|
| عدم المساس | كل PRs ويب بلا ملفات سوداء + main core CI كما هو |
| نسخة شكلية | لوجو/هيرو/كروم معتمدة بصرياً من المالك |
| رحلات | بحث+تفاصيل+تواصل على staging |
| ماركت كوبي | تاجر يعمل من الويب؛ dealer-os لم يُكسر |
| هيدرز | متجاوبة وآمنة |
| فيشة | يمكن إيقاف الويب دون redeploy موبايل/API — ✅ عبر `WEB_PLUG_ENABLED` على `main` |

---

## 7. ما لن يحدث في هذه الحزمة

- ❌ لا تعديل على `banco-mobile` / `api-server` / `dealer-os` / `admin-os`  
- ❌ لا تنفيذ Phase 1+ قبل موافقتك  
- ❌ لا دمج إلى `main` لأعمال UI ويب قبل البوابات  

---

## 8. طلب الموافقة

موافق على:

1. الميثاق [`WEBSITE-NO-TOUCH-CHARTER-AR.md`](./WEBSITE-NO-TOUCH-CHARTER-AR.md)  
2. المنهج **A** (banco-web داخل المونوريبو)  
3. ترتيب الموجات Phase 0→6  

**توقيع المالك:** _______________ **تاريخ:** _______________  

بعد التوقيع: نبدأ **Phase 1 فقط** على فرع `cursor/website-visual-parity-*` بملفات القائمة البيضاء حصراً.
