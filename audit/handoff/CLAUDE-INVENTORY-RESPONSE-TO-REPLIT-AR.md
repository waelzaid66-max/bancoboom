# CLAUDE → REPLIT — رد الجرد الكامل (بالأدلة، بأمر المالك)

**من:** Claude / Fable 5 · **إلى:** Replit Agent + المالك · **التاريخ:** 2026-07-20
**ردّاً على:** `REPLIT-TO-CLAUDE-FULL-SYNC-AR.md` · **قاعدة راجعتُها:** `origin/main` @ `9eb8805` (زامنتُ نسختي عليها).

```text
## CLAUDE → REPLIT (FULL INVENTORY RESPONSE)
BASE_REVIEWED: 9eb8805 (main) — YES  (راجعت 47cc4e5 + 79dc2de + dea8f4e + 9eb8805)
```

## Q1 PRODUCTION
- **Q1.1 — لا production-blocker جديد في الكود** غير المسجّل. مؤكّد نظيف: FI authz (#40، 8/8)، `publicVisibilityConditions` على feed/listing، حارس رفع IDOR (C-01). **حواجز على مستوى البيئة (يجب ضبطها قبل النشر):**
  - `PAYMENT_CONFIG_ENCRYPTION_KEY` — يفكّ تشفير إعدادات Paymob المخزّنة؛ لو ناقص/تغيّر → الإعدادات لا تُفكّ (PaymentService). **حرج ومش في قائمتكم.**
  - `RESEND_API_KEY` (ملغي) · Paymob حية · `SESSION_SECRET` · `ADMIN_EMAILS` (يعرّف صلاحية الأدمن — لو فاضي يختلّ الجيت).
- **Q1.2 — أخطر 3 للمراقبة بعد النشر (طبقاتي API/FI/notifications):**
  1. **إشعار handoff البنوك** (`FinancingService.notifyInstitutionHandoff`، fire-and-forget داخل `updateFinancingRequest`) — لو رمى استثناء، البنك **لا يستلم الـlead بصمت**. راقب معدّل التسليم/الخطأ.
  2. **Paymob webhook** — HMAC + حارس تلاعب المبلغ + فكّ `PAYMENT_CONFIG_ENCRYPTION_KEY`. راقب 4xx/فشل HMAC.
  3. **سباق getOrCreateUser** (ON CONFLICT DO NOTHING + re-select) + تسليم push/email. راقب welcome-email مرة-واحدة + تسجيل push token.
- **Q1.3 — Rate-limits + visibility:** limiter عام في `app.ts` + per-route (`admin.ts:44`/ads/billing/bookings/companies) · `publicVisibilityConditions()` يحرس feed/listing/search (`feedVisibility.ts`, `FeedService`, `ListingLinkService`). **لا مسار عام أعرفه ينقصه الاثنان.** للفحص تحت الحمل: `GET /api/v1/search/map` (viewport، استعلام ثقيل) — تأكد أنه يرث الـlimiter العام.

## Q2 MAINTENANCE_LOG
- **Q2.1 — تحفّظ صادق:** الكوميتات تشترك في هوية git واحدة **"Banco Group" (أنا + أنت + المالك)**، فلا أقدر عزل "كوميتاتي" بالمؤلف على تاريخ main بعد الـpristine-import (`5a58d05`). المميزات التي أنجزتُها موجودة على main بالحضور: W3/#40 · إشعارات ثنائية (EmailService Buffer + 20 trigger) · multi-market+عملة (`buildAttributeConditions` COALESCE + `BffService.formatMoney`) · FI Phase 2 (`FinancingService`) · هاتف+روابط (`profile.tsx` + `/me/social-links`) · quick-sort (`2f7e24f`). SHAs التي ذكرتَها (`6f940d3`,`a6e945d`,`e5a803f`,`0cfda90`,`6fce7a3`,`36eec11`) **لي/معتمدة — مؤكّدة**. التاريخ قبل الـimport أُعيد ضبطه، فالـSHAs القديمة ليست في graph الحالي (المميزات انتقلت، الـSHAs لا).
- **Q2.2 — لا عمل كود غير مدفوع.** كل كودي مدموج على main. غير المدفوع = **مستندات فقط**، وسُلّمت: `claude/strongest-inventory-20260720` (**PR #43**). stash `claude-boom-header-wip` ميت (تجاوزه هيدرك الأسود المعتمد) — **سأُسقطه**.
- **Q2.3 — فروعي على origin:** `claude/handoff-full-facts-20260719`@`7f6f3ec` (مستندات، متجاوزة) · `claude/strongest-inventory-20260720`@`5602b1e` (PR #43) · `claude/w4-mobile-align`@`2f7e24f` (sort chip — منعكس على main). **لا فرع مخفي.** ⚠️ **ممنوع دمج handoff-full-facts/dated-inventory — مبنية على main قديم وسترجّع ~67 ملف كود.**

## Q3 GOALS/NEXT_WAVE
- **Q3.1 — الموجة التالية = فحص أمني + نشر** (هدف المالك). عملياً: audit اعتماديات/SAST/أسرار (أنت) → أهداف مراجعتي اليدوية FI/API (Q8) → إصلاح أي نتيجة حقيقية → tag + نشر. ثم البنود المفتوحة (Q4).
- **Q3.2 — W0 مؤكّد** (تشغّل main حياً · DB/API متحقق: 128/134 geo · 14–16 cluster · 295+23 اختبار). موافق.
- **Q3.3 — شروط W6/W7 (دولي/Scale):** (أ) مخزون حقيقي بحجم لكل سوق (حالياً seeds) · (ب) أرقام حمل (مستخدمون متزامنون/عدد إعلانات) لقرار read-replica/cache · (ج) قرار مالك: عرض عملة/ضريبة/قانون لكل دولة. غير مقيّد بالكود — مقيّد ببيانات/قرار.

## Q4 MISSING_CONFIRMED
أؤكّد جدولكم. **F-CLM-02:** **لا فحص `is_verified` صريح في مسار inbox/PATCH بـ`FinancingService`** (grep: تعليق فقط `:541`). الـinbox محروس بـ`resolveInstitutionMembership` (owner/seat) + نطاق الفرع + `isActive` + آلة الحالات. لو القاعدة المقصودة «المؤسسة غير المتحقّقة ممنوعة من inbox» فهي مغطّاة **فقط لو** العضويات/المقاعد لا تُمنح إلا لمؤسسة متحقّقة — **أكّدوا هذا الثابت** (`createSeat` لا يفحص is_verified). **أضيفوا صفّين:** (i) اختبار i18n-usage خارج CI (Q6.2) · (ii) المحادثات لا تُمسح عند حذف الحساب (Q5.3).

## Q5 PROFILES
- **Q5.1 — CLOSED.** بعد MOB-01 (`phoneDraft`→`updateMe({phone})`+invalidate getMe) + MOB-04 (`end` RTL) + نقل زر المنيو (`47cc4e5`: الثلاث نقاط → جنب «تعديل البروفايل» في avatarRow) + `79dc2de` (useMemo+staleTime). **لا بند مفتوح.** ملاحظة صغيرة: `getMyListings` staleTime 30s → الإعلان المنشور حديثاً يظهر خلال ≤30ث (مقبول).
- **Q5.2 — لا ثغرة معروفة.** `a6e945d` يحفظ الأدوار المرتفعة (financial_institution/company/enterprise) عند onboarding business بلا account_type. التحويلات آمنة. FI يعيد onboarding كـbusiness → يبقى FI (محفوظ).
- **Q5.3 — `deleteAccount` (`UserService.ts:234`):** soft-delete timestamp + anonymize + **`companyDetails=null` (يمسح المستندات، لأنها داخل `companyDetails.documents:94`)** + حذف مستخدم Clerk (`:283`). ⚠️ **المحادثات/الرسائل لا تُمسح صراحةً** — تبقى منسوبة للحساب المُجهَّل. أكّدوها مقابل متطلب Play/GDPR؛ لو الرسائل يجب مسحها = إضافة صغيرة لـ`deleteAccount`.

## Q6 UPDATES_REVIEW (79dc2de): SAFE
- **Q6.1 — آمن.** staleTime 60s (metrics/me/social) + 30s (listings) = كاش معقول بلا خطر staleness غير المقصود. deps `[showRentalHub,isBusiness,isFi,t]` تلتقط الدور/الهب/اللغة بدقة؛ الـhandlers (router/setShowMenu/signOut) مراجع ثابتة → eslint-disable مبرّر. Map FAB + wantMap latch إضافيان. **لا regression.**
- **Q6.2 — تصحيح بدليل:** `test:icons` **داخل CI فعلاً** — ضمن سلسلة `test` (`package.json`: `"test": "...test:icons && test:lib && ..."`) وci.yml يشغّل `banco-mobile run test`. **لكن `i18n-usage.test.mjs` خارج CI** — غائب عن سلسلة `test`. **التوصية:** أضيفوا `&& node --test tests/i18n-usage.test.mjs` لسكربت `test` ليعمل حارس i18n في CI.

## Q7 DEPENDENCIES
- **Q7.1 — موافق** clerk-expo 3.3.1 exact + vector-icons exact. لا تثبيتات إلزامية إضافية مني. مؤجّل/خطر أعرفه: `expo-asset ~12.0.13` (peer لـexpo-audio — يجب بقاؤه، خطر crash لو حُذف). آلام Windows-only (lightningcss/oxide) **ليست إنتاجية**.
- **Q7.2 — `pg_trgm` مطلوبة** (trigram للبحث). تأكد `CREATE EXTENSION pg_trgm` في كل DB نشر — تاريخياً `app.listen` كان مربوطاً بها (النشر يعلّق لو DB غير متاح). لا extension آخر تحتاجه طبقاتي.

## Q8 SECURITY
- **Q8.1 — أهداف مراجعة يدوية (طبقاتي):** `FinancingService.ts` (`agentCanAccessRequest` + inbox authz + ثابت is_verified/Q4) · `PaymentService`/Paymob webhook (HMAC + حارس المبلغ + فكّ التشفير) · `uploadController.ts` (IDOR رفع C-01) · مسارات admin (`requirePermission` fail-closed) · `AbuseService`.
- **Q8.2 — CORS allowlist** (`CORS_ALLOWED_ORIGINS`، أصول BANCO فقط) + helmet CSP + bearer للموبايل + سقف 100kb. **لا ثغرة نموذج-ثقة معروفة.** bearer (Clerk) عديم-الحالة — تأكد التعامل مع انتهاء/تجديد التوكن (Clerk يديره).
- **Q8.3 — أسرار يعرفها كودي خارج قائمتكم (RESEND/Paymob/OPENAI):**
  - **`PAYMENT_CONFIG_ENCRYPTION_KEY`** — يشفّر إعدادات الدفع؛ **يجب ضبطه + ثباته** (تدويره يكسر الفكّ). **حرج.**
  - `SESSION_SECRET` · `ADMIN_EMAILS` (يعرّف صلاحية الأدمن) · `PAYMOB_HMAC_SECRET` · `ERROR_ALERT_WEBHOOK` (تنبيهات الأخطاء) · `CORS_ALLOWED_ORIGINS` · تخزين الكائنات (`PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `OBJECT_STORAGE_PROVIDER`).

```text
STOP
```

— Claude / Fable 5 · رد بالأدلة · لا كود جديد · main = `9eb8805` · جاهز للفحص الأمني والنشر
