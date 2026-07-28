# جرد وخطة المحفظة والفوترة — BANCO OOM

**التاريخ:** 2026-07-07  
**الغرض:** فهم حقيقي لما هو موجود ومُوصَل، وترتيب صيانة/إضافات **دون هدم** الوضع المجاني الحالي أو تعطيل المستخدمين.  
**مبدأ حاكم:** الخطط المجانية والحدود الكبيرة (50/50) تبقى كما هي حتى قرار إداري صريح؛ بوابة الدفع **مُعطّلة افتراضياً** من الأدمن.

---

## 1. ملخص تنفيذي

| البند | الحالة |
|--------|--------|
| **محرك المال (Ledger)** | ✅ موجود — `WalletService.applyTransaction` نقطة وحيدة |
| **محفظة المستخدم (موبايل)** | ✅ رصيد + شحن + معاملات + رصيد إعلاني |
| **اشتراكات + خطط** | ✅ API كامل؛ موبايل يشترك/يلغي؛ أدمن يتحكم بالخطط |
| **رصيد إعلاني (Promo)** | ✅ منفصل عن المحفظة؛ أدمن يشغّل/يوقف الحملة |
| **فواتير (خادم)** | ✅ تُنشأ مع المعاملات؛ **لا واجهة مستخدم** |
| **Paymob (PSP)** | ✅ خلف مفتاح أدمن `enabled`؛ معطّل = لا شحن خارجي |
| **كوبونات / ضريبة / سحب أرباح** | ❌ غير موجود (مقصود لاحقاً أو خارج v1) |
| **مركز مالي موحّد (13 قسم)** | ⚠️ أجزاء مبعثرة — تحتاج Hub تدريجي |

**قرار التشغيل الحالي:** المنصة **مجانية فعلياً** للنشر (baseline 50 إعلان نشط/شهر)، مع آليات دفع **جاهزة لكن غير مُفعّلة** حتى تفعّل Paymob + تعدّل الخطط من الأدمن.

---

## 2. خريطة المعمارية (ما يتصل بماذا)

```
المستخدم (موبايل / تاجر)
    │
    ├─► GET/POST /v1/wallet*          → WalletService (رصيد، شحن، معاملات)
    ├─► GET /v1/wallet/promo          → PromoAdCreditService (رصيد إعلاني افتراضي)
    ├─► /v1/subscriptions*            → SubscriptionService + PlanService
    ├─► POST /v1/dealer/listings/boost → AdsService (خصم محفظة/رصيد إعلاني)
    ├─► POST /v1/leads/contact        → LeadService (CPL من المحفظة)
    └─► GET /v1/billing/*             → BillingService (فواتير + تقرير شهري) — غير مستخدم في UI

Paymob webhook POST /v1/payments/webhook → تسوية payment_intents → WalletService

الأدمن (admin-os)
    ├─ Plans      → PATCH /v1/admin/plans/{id}  (حصص، أسعار، baseline)
    ├─ Settings   → Payment Provider enabled + credentials
    ├─ Promo      → حملة الرصيد الإعلاني
    ├─ Revenue    → إيراد التعزيز فقط (live)； اشتراكات/CPL = "0" في العرض
    └─ Ads        → قائمة حملات التعزيز
```

**ملفات مرجعية:**

| طبقة | مسار |
|------|------|
| Ledger | `artifacts/api-server/src/services/WalletService.ts` |
| فوترة | `artifacts/api-server/src/services/BillingService.ts` |
| خطط | `artifacts/api-server/src/services/PlanService.ts` |
| PSP | `artifacts/api-server/src/lib/paymentProvider.ts` |
| Schema | `lib/db/src/schema/index.ts` (`transactions`, `invoices`, `plans`, `subscriptions`, `promo_ad_*`) |
| موبايل محفظة | `artifacts/banco-mobile/app/wallet.tsx` |
| موبايل خطط | `artifacts/banco-mobile/app/plans.tsx` |
| أدمن دفع | `artifacts/admin-os/src/pages/settings.tsx` (PaymentSection) |
| أدمن خطط | `artifacts/admin-os/src/pages/plans.tsx` |
| أدمن promo | `artifacts/admin-os/src/pages/promo.tsx` |

---

## 3. جرد المستخدم (13 قسم) — موجود / جزئي / ناقص

### 1) المحفظة (Wallet)

| الميزة | الحالة | ملاحظة |
|--------|--------|--------|
| الرصيد الحالي | ✅ | `GET /v1/wallet` + `wallet.tsx` |
| إضافة رصيد | ✅ | Paymob checkout + `POST topup/confirm`؛ طرق تفضيلية (فودافون/فوري/…) |
| سحب الأرباح للبائعين | ❌ | **غير في النطاق v1** — المحفظة للدفع للمنصة وليس escrow بائع |
| سجل المعاملات | ✅ | `GET /v1/wallet/transactions` |

**أدمن:** لا شاشة تعديل رصيد يدوي (فقط `adjustment` في seed/DB).

---

### 2) طرق الدفع (Payment Methods)

| الميزة | الحالة | ملاحظة |
|--------|--------|--------|
| بطاقات / محافظ | ⚠️ | عبر **Paymob** عند تفعيل البوابة — ليس Apple/Google Pay مباشرة |
| حفظ بطاقة للمستخدم | ❌ | لا tokenization على مستوى المنصة |
| إضافة وسيلة دفع | ❌ | المستخدم يختار طريقة عند الشحن فقط |

**أدمن:** `payment_provider_config.enabled` — **إيقاف الدفع الخارجي بالكامل** دون لمس المحفظة الداخلية.

---

### 3) الاشتراكات (Subscriptions)

| الميزة | الحالة | ملاحظة |
|--------|--------|--------|
| الخطة الحالية | ✅ | `GET /v1/subscriptions/me` + `plans.tsx` |
| تاريخ التجديد | ✅ | `expiresAt` في الاشتراك |
| تغيير الخطة | ✅ | `POST /v1/subscriptions` (محفظة أو Paymob) |
| إلغاء | ✅ | `POST /v1/subscriptions/cancel` |
| سجل الاشتراكات | ⚠️ | في `transactions` كـ `subscription_charge`؛ لا شاشة تاريخ منفصلة |

**أدمن:** تعديل `listing_quota`, `active_listing_cap`, `monthly_price`, `is_baseline`, `is_active`.

**Baseline مجاني (seed):** `individual_free` / `dealer_free` — **0 EGP**, **50/50** (تعليق seed: فتحة إطلاق).

---

### 4) رصيد الإعلانات (Advertising Credits)

| الميزة | الحالة | ملاحظة |
|--------|--------|--------|
| الرصيد الإعلاني | ✅ | `users.promo_ad_balance` + `GET /v1/wallet/promo` |
| شراء رصيد | ❌ | الرصيد **مجاني شهري** من الحملة وليس شراء |
| استهلاك | ✅ | `PromoAdCreditService.consume` قبل خصم المحفظة في التعزيز |
| سجل الاستخدام | ⚠️ | `promo_ad_transactions` في DB؛ لا UI |

**أدمن:** `promo.tsx` — `enabled`, مبالغ موثّق/غير موثّق، `renew`.

**افتراضي:** `enabled: false` في الكود — **لا يُمنح رصيد حتى تشغّل الحملة**.

---

### 5) الفواتير (Invoices)

| الميزة | الحالة | ملاحظة |
|--------|--------|--------|
| قائمة الفواتير | ⚠️ API فقط | `GET /v1/billing/invoices` |
| تفاصيل | ⚠️ | `GET /v1/billing/invoices/{id}` |
| PDF / طباعة / مشاركة | ❌ | |
| حالة مدفوعة/غير مدفوعة | ⚠️ | `invoice_status` في DB (`paid` \| `void`)؛ لا void API |

الفواتير تُنشأ تلقائياً مع: شحن، اشتراك، تعزيز، CPL.

---

### 6) الإيصالات (Receipts)

| الميزة | الحالة |
|--------|--------|
| كيان Receipt منفصل | ❌ |
| بديل عملي | الفاتورة + صف المعاملة في المحفظة |

---

### 7) المعاملات (Transactions)

| الميزة | الحالة |
|--------|--------|
| كل العمليات | ✅ `transactions` + قائمة في المحفظة |
| أنواع: شحن، تعزيز، اشتراك، lead، refund، adjustment | ✅ في schema |
| فلترة بالتاريخ | ⚠️ cursor pagination فقط؛ لا فلتر UI |
| تصدير | ❌ |

---

### 8) الضرائب (Tax)

| الميزة | الحالة |
|--------|--------|
| VAT / رقم ضريبي / بيانات شركة | ❌ بالكامل |
| العملة | EGP، بدون ضريبة في `billing.ts` |

---

### 9) العروض والكوبونات (Promotions)

| الميزة | الحالة |
|--------|--------|
| كوبون خصم / إدخال كود | ❌ |
| رصيد إعلاني شهري | ✅ (ليس كوبوناً) |

---

### 10) الإشعارات المالية

| الميزة | الحالة |
|--------|--------|
| نجاح/فشل دفع، انتهاء اشتراك، فاتورة | ❌ غير مُنفّذ |
| نوع `payment_failure` في تنبيهات الأدمن | ⚠️ معرّف في الأنواع لكن **لا يُولَّد** |

---

### 11) مركز البريد المالي (Email)

| الميزة | الحالة |
|--------|--------|
| إعداد SMTP في الأدمن | ✅ `EmailConfigService` + settings |
| إرسال فواتير/إيصالات/كشوف | ❌ لا قوالب billing |

---

### 12) كشوف الحساب (Statements)

| الميزة | الحالة |
|--------|--------|
| تقرير شهري API | ✅ `GET /v1/billing/report?month=YYYY-MM` |
| PDF / Excel | ❌ |
| UI | ❌ |

---

### 13) دعم الفوترة (Billing Support)

| الميزة | الحالة |
|--------|--------|
| تذاكر دعم عامة | ✅ `support` |
| مسار "مشكلة دفع" / استرداد | ❌ مخصص |

---

## 4. تحكم الأدمن — كيف تبقي المنصة مجانية الآن

| الرافعة | أين | التأثير |
|---------|-----|---------|
| **إيقاف بوابة الدفع** | Admin → Settings → Payment → **Enabled = off** | لا شحن Paymob ولا اشتراك خارجي |
| **الخطط المجانية** | Admin → Plans → baseline `is_baseline=true`, سعر 0 | كل مستخدم بدون اشتراك مدفوع يبقى على free |
| **حد الإعلانات** | نفس الصفحة → `listing_quota` / `active_listing_cap` | 50/50 حالياً في seed |
| **إيقاف الرصيد الإعلاني** | Admin → Promo → **enabled = off** | لا منح شهري؛ التعزيز يخصم محفظة فقط إن وُجد رصيد |
| **تعطيل خطة مدفوعة** | `is_active = false` على الخطة | تختفي من واجهة الاشتراك |

**لا تغيّر في الإصدار الحالي:** أسعار baseline، `is_baseline`، أو تفعيل Paymob دون اختبار staging.

---

## 5. مصفوفة النضج (Backend / Mobile / Dealer / Admin)

| المجال | API | موبايل | Dealer-OS | Admin |
|--------|-----|--------|-----------|-------|
| محفظة | ✅ | ✅ | قراءة فقط | ❌ |
| شحن PSP | ✅ | ✅ | ❌ | إعداد |
| اشتراكات | ✅ | ✅ | قراءة | خطط |
| معاملات | ✅ | ✅ | ✅ | ❌ |
| فواتير/كشوف | ✅ | ❌ | ❌ | ❌ |
| رصيد إعلاني | ✅ | ✅ | ❌ | ✅ |
| تعزيز | ✅ | ✅ | API | قائمة |
| CPL | ✅ | غير مباشر | ❌ | إيراد=0 في UI |
| كوبون/ضريبة/سحب | ❌ | ❌ | ❌ | ❌ |

---

## 6. خطة الموجات — ترتيب منطقي (بدون هدم)

### موجة B0 — جرد وتوثيق (هذا الملف) ✅

- لا كود إنتاجي؛ تثبيت الحقيقة والرافعات الإدارية.

### موجة B1 — ربط العرض (قراءة فقط، آمن 100%)

**هدف:** إظهار ما يوجد في الخادم دون تغيير سلوك الدفع.

| # | مهمة | خطر |
|---|------|-----|
| B1.1 | شاشة **فواتيري** في الموبايل → `listInvoices` + تفاصيل | صفر |
| B1.2 | تبويب "فواتير" في `wallet.tsx` أو `billing.tsx` hub | صفر |
| B1.3 | ربط `AdminService.revenueSummary` بمجموع `subscription_charge` و `lead_charge` من ledger | صفر للمستخدم |
| B1.4 | OpenAPI لـ `/v1/payments/webhook` و `/return` | صفر |
| B1.5 | Dealer-OS: نفس قائمة الفواتير (قراءة) | صفر |

**ممنوع في B1:** تفعيل Paymob، خفض الحصص المجانية، إجبار اشتراك.

---

### موجة B2 — مركز مالي (Hub) + معاملات أفضل

| # | مهمة |
|---|------|
| B2.1 | `app/billing/index.tsx` — روابط: محفظة، خطط، فواتير، معاملات، دعم |
| B2.2 | فلتر معاملات (نوع + شهر) على API إن لزم |
| B2.3 | سجل استهلاك الرصيد الإعلاني (قراءة من `promo_ad_transactions`) |
| B2.4 | سجل اشتراكات (قراءة من `subscriptions` + معاملات) |

---

### موجة B3 — إشعارات وإيميل (عند الاقتراب من مدفوع)

| # | مهمة |
|---|------|
| B3.1 | أنواع إشعار: `payment_success`, `payment_failed`, `subscription_expiring` |
| B3.2 | قوالب email: فاتورة، إيصال (نص/HTML) |
| B3.3 | توليد `payment_failure` في تنبيهات الأدمن عند فشل webhook |

---

### موجة B4 — PDF وتصدير (قبل إعلان مدفوع رسمي)

| # | مهمة |
|---|------|
| B4.1 | PDF فاتورة (server-side template) |
| B4.2 | تصدير كشف شهري PDF/CSV من `billing/report` |
| B4.3 | مشاركة/طباعة من WebView أو ملف |

---

### موجة B5 — تفعيل مدفوع (قرار إداري فقط)

**شروط قبل B5:**

1. Staging: Paymob test + شحن + اشتراك تجريبي  
2. أدمن: خفض baseline تدريجياً **أو** إبقاء free مع paid اختياري  
3. إشعارات B3 جاهزة  
4. فواتير B1/B4 مرئية للمستخدم  

| # | مهمة |
|---|------|
| B5.1 | تفعيل `payment_provider_config.enabled` في production |
| B5.2 | تفعيل promo campaign إن رُغب |
| B5.3 | مراقبة revenue + alerts |

---

### خارج v1 (كما طلبت — لا تنفيذ الآن)

- محفظة بين المستخدمين / تحويل أموال  
- سحب أرباح البائع (marketplace payout)  
- تقسيط مدفوعات المنصة  
- نقاط ومكافآت  
- كوبونات خصم (نظام منفصل عن promo ad credit)  
- Apple Pay / Google Pay native (إلا عبر Paymob لاحقاً)  
- VAT كامل  

---

## 7. فخاخ تسمية (لا تخلط)

| الاسم | المعنى الحقيقي |
|-------|----------------|
| `PaymentService.ts` | تمويل **الإعلان** (أقساط على السيارة) — ليس Paymob |
| `payment_options` (DB) | خيارات دفع البائع على الإعلان |
| `PromoBanner.tsx` | تسويق — ليس الرصيد الإعلاني |
| `financing` (admin) | CRM بنوك — ليس اشتراكات المنصة |

---

## 8. اختبارات موجودة (ثقة في الماكينة)

- `WalletService.test.ts`
- `BillingService.test.ts`
- `SubscriptionService.test.ts`
- `PromoAdCreditService.test.ts`
- `PaymentIntentService.webhook.test.ts`
- `billing.test.ts` (مبالغ EGP)

**قبل B5:** تشغيل suite على staging مع `upload_claims` و Paymob test.

---

## 9. الخطوة التالية الموصى بها

**ابدأ موجة B1.1–B1.4** — واجهات قراءة + إصلاح عرض إيراد الأدمن؛ **صفر تأثير** على المستخدم المجاني.

بعدها: دمج موجات البحث 4–5 على `main` (منفصلة عن الفوترة).

---

## 10. مراجع API مالية

```
GET/POST  /v1/wallet*
GET       /v1/billing/invoices[/{id}]
GET       /v1/billing/report
GET/POST  /v1/subscriptions*
POST      /v1/payments/webhook
GET       /v1/admin/payment-config
PUT       /v1/admin/payment-config
GET/PATCH /v1/admin/plans*
GET/PUT   /v1/admin/promo-campaign
GET       /v1/admin/revenue
```
