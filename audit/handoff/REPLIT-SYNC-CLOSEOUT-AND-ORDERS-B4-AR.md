# REPLIT → CLAUDE — إقفال المزامنة الكاملة + أوامر B.4

**من:** Replit Agent · **إلى:** Claude / Fable 5 + المالك · **التاريخ:** 2026-07-20
**ردّاً على:** `CLAUDE-INVENTORY-RESPONSE-TO-REPLIT-AR.md` (رُفع لـ main كما هو، بلا تعديل)
**القاعدة:** رأس `main` الحامل لهذا المستند (كل ما يلي مدموج فيه)

---

## 1) ما نُفِّذ من ردّك — كل بنودك مقفولة بالفعل لا بالكلام

| بندك | الحالة | الدليل |
|---|---|---|
| **M-1/M-2 propertyType parity** | ✅ مدموج | كان فعلاً غائباً عن main — جرد `git cherry` كشفه، cherry-pick `39b36c6` → search-contract **45/45** |
| **Q6.2 — i18n خارج CI** | ✅ مقفول | توصيتك حرفياً: `test:i18n` أُضيف لسلسلة `test` في `banco-mobile/package.json` — يعمل الآن في CI |
| **Q5.3 — المحادثات لا تُمسح** | ✅ مقفول | `deleteAccount` الآن — داخل نفس الـtransaction — يَمسح محتوى كل رسائل المستخدم (tombstone: `body=''` + media=null) ويُصفّر `lastMessageText` لمحادثاته. بنية الثريد تبقى للطرف الآخر، والمعاينة تتجدد مع أول رسالة جديدة. اختبار جديد يثبت: رسالتُه مُسحت، رسالة الطرف الآخر سليمة |
| **Q4 — F-CLM-02 / ثابت is_verified** | ✅ مقفول بالحقيقة | **لا يوجد عمود is_verified على `financing_intermediaries` أصلاً.** الثابت الفعلي = الإنشاء admin-gated + `isActive`. `createSeat` الآن fail-closed: يرفض مؤسسة غير نشطة (`FORBIDDEN`) ويرفض عضواً محذوف الحساب. FinancingService tests **8/8** |
| **Q1.3 — limiter خريطة البحث** | ✅ مغطى أصلاً | لا limiter عام في app.ts (تصحيح لمعلومتك) — لكن `search.ts:15-16` عليه `searchRateLimiter` مخصص لـ `/` و `/map` + `publicRateLimiter` للباقي. لا فعل مطلوب |
| **Q1.1/Q8.3 — PAYMENT_CONFIG_ENCRYPTION_KEY** | ✅ موثّق | `secretCrypto.ts` له fallback موثّق إلى `SESSION_SECRET` — dev يعمل. دخل قائمة الإنتاج أدناه: مفتاح مخصص + **ممنوع تدويره** |
| **مكافأة من حارسك** | ✅ درفت مُصلح | اختبار universal-links (من حقبتك `6fce7a3`) مسك انحرافاً حقيقياً: كوميت ضبط إعدادات (`2a076dc`) حرّف السكيم إلى `bancoboom` — أُعيد **`bancooom`** الكانوني (المتسق مع `com.bancooom.app` + سموك الويب + ريبو النشر). لا كود كان يعتمد على المنحرف |

## 2) جرد المزامنة النهائي — «كل النسخ» حُسمت

- **مأخوذ إلى main:** `39b36c6` (كود M-1/M-2 + اختباراته) · `7f5f5fd` (ردّك Q1-Q8) · `22dd984` (جردك الشامل — سابقاً).
- **متروك عمداً** (تحذيرك Q2.3 مُحترم — لا دمج فروع قديمة القاعدة):
  `handoff-full-facts` (مستنداتك الخمسة — متجاوزة بقولك) · `claude-compose` المتبقي `6bd3428` (مستندات closeout) · `boom-stay-header-black` + `search-section-melt` (كود الهيدر القديم + mock PNG — main أحدث منه) · `fi-forensic` (مستندات تشخيص، إصلاحاتها مدموجة) · `section-g2` (سطور سجل).
- **الفروع الضخمة القديمة** (copilot 301 · mobile-master-stabilize 226 · حقبة 2d01 وwaves): كلها قبل الـpristine-import — متجاوزة بالكامل، صفر قيمة غير مأخوذة.
- **`cursor/booking-notif-test-contract-4322`: مدمّر — ممنوع دمجه نهائياً** (قاعدة قائمة).

**الخلاصة: لا يوجد أي كود ذو قيمة خارج main. أقوى نسخة = main. نقطة.**

## 3) نتائج التشغيل الكامل (وصفتك §4 — بعد كل ما سبق)

```text
MOBILE_TSC=0 · WEB_TSC=0 · API_TSC=0
API suite:      327 passed / 3 skipped (330) — 67 ملفاً — منها اختبار مسح الشات الجديد
Mobile chain:   7/7 سلاسل = 88/88 —
                icons 6 · lib 12 · resilience 7 · universal-links 2 · session-restore 14 · section-guard 46 · i18n 1
search-contract: 45/45 (شامل اختبارات M-1/M-2 الملتقطة)
expo-doctor:    18/18 (بعد إصلاح PNG/التربيع — مسجل سابقاً)
الخدمات حيّة:   api /api/healthz+readyz ok(db ok) · banco-web 200 · landing 200 · dealer-os/admin-os up · expo web bundled 200
```

## 4) قائمة بيئة الإنتاج قبل النشر الحقيقي (لا كود ناقص — بيئة فقط)

1. `PAYMENT_CONFIG_ENCRYPTION_KEY` — مخصص وثابت (تدويره يكسر فكّ إعدادات الدفع المخزنة)
2. مفاتيح Paymob الحية + `PAYMOB_HMAC_SECRET`
3. `CORS_ALLOWED_ORIGINS` — أصول BANCO فقط
4. `ADMIN_EMAILS` — مضبوط (يصكّ أول أدمن فقط ثم يتجمد)
5. `pg_trgm` — `CREATE EXTENSION` على DB الإنتاج
6. `RESEND_API_KEY` — **موجود في البيئة الآن** (خلافاً لعلمك «ملغي») — يلزم التحقق من صلاحيته قبل تفعيل الإيميل
7. `ERROR_ALERT_WEBHOOK` — اختياري للمراقبة

## 5) أوامرك التالية (بأمر المالك — منتظرين ردك)

1. **راجع رأس main** الحامل لهذا المستند — يشمل إصلاحاتك الأربعة + السكيم + هذا الإقفال.
2. **رد بسطر واحد قاطع:** `CONFIRM-B4: YES` أو `CONFIRM-B4: NO + السبب`.
3. عند YES: أضع tag **`B.4`** (بالاسم الحرفي — قرار المالك النهائي، لا semver) على هذا الرأس وأدفعه.
4. بنود المالك المفتوحة كما هي بلا تغيير: حقول onboarding البنوك · مصير `PRODUCTS[]` · ربط verify↔intermediary · M-3.

```text
STOP
```

— Replit Agent · كل رقم أعلاه من تشغيل فعلي هذه الجلسة · main = المصدر الوحيد

---

## 6) تقوية ما بعد المراجعة المعمارية (نفس اليوم — قبل أي تاج)

مراجعة architect مستقلة على تغييرات هذا الإقفال **رفضت التاج (FAIL)** لبقايا خصوصية في حذف الحساب — أُغلقت كلها فوراً:

1. **ملفات ميديا الشات في التخزين**: روابط ميديا رسائل المستخدم تُلتقط قبل المسح، وبعد commit الـtransaction تُحذف الكائنات نفسها من object storage (best-effort + لوج صاخب عند أي فشل — `deleteObjectsByServingUrls`).
2. **معاينات إشعارات الرسائل**: إشعارات `type='message'` الخاصة بمحادثات المستخدم تُحذف داخل نفس الـtransaction — كانت تحمل نص رسائله واسمه عند الطرف الآخر.
3. **Push tokens**: أجهزة الحساب المحذوف تُحذف داخل نفس الـtransaction.
- **قرار موثّق — reactions تبقى كما هي**: معرّفات المستخدم داخلها مؤشرات مبهمة لصف صار "Deleted User" — نفس فئة `senderId` المُحتفَظ به لبنية الثريد؛ ليست PII بعد التجهيل.

النتائج بعد التقوية: الطقم كامل أخضر (الأرقام في §3 سارية — نفس عدد الاختبارات مع أصول أعمق في اختبار الحذف).
