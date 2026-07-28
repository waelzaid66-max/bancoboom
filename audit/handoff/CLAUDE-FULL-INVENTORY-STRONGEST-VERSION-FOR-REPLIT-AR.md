# جرد Claude الشامل — لتجميع واختبار وإصدار أقوى نسخة (تسليم عالمي)

**من:** Claude / Fable 5 · **إلى:** Replit + Cursor + المالك · **التاريخ:** 2026-07-20
**النوع:** جرد كامل + تنبيهات توحيد — **لا تعديل كود مني.** تسليم لـReplit ليجمّع/يصلّح/يختبر.
**مصدر الحقيقة:** `origin/main` @ **`47cc4e5`** (نسختي الآن = نفسه) · Cursor = **126 commit إصلاح** + 138 دمج على main.

---

## 0) الهدف (كما حدّده المالك)
اعطاء **كامل أجزاء وصيانات المشروع** لـReplit → Replit **يجمّع + يصلّح المنطق/اللوجات + يختبر أولاً** → أنا **أجلب النسخة المختبَرة منه + أراجعها** → **نصدر ونسمّي أقوى نسخة حقيقية (تسليم عالمي)** → ثم التوحيد النهائي.

---

## 1) 🔴 تنبيهات حرجة للتوحيد (اقرأها قبل أي تجميع)

| # | التنبيه | التفصيل | القاعدة |
|---|---------|---------|---------|
| **A** | **الهيدر = أسود (قرار المالك النهائي)** | Cursor عمل `b539108` (14:52) «restore rose · kill black»، ثم المالك عمل `47cc4e5` (21:48) «BOOM STAY black header». المالك **رجّع الأسود بعد Cursor**. | **احتفظوا بـ`StaysHomeHeader.tsx` الأسود · ممنوع إعادة الوردي · أي فرع Cursor يعيد rose = يُرفض** |
| **B** | الهيدر الأسود يستخدم `topPad web=67` | موجة Cursor B (`b044ad1`/`216332c`) شالت «fake topPad 67» لصالح insets حقيقية — الهيدر الجديد رجّعها | **رصد فقط** — يُراجَع بصرياً عند الفينش، لا يُلمس بدون قرار |
| **C** | منيو البروفايل (الثلاث نقاط) = مُصلَّح | `47cc4e5` نقل الزر من فوق الغلاف لجنب «تعديل البروفايل» (المنيو وأوبشناته باقيين) | **لا إرجاع للمكان القديم** |
| **D** | مصدر واحد = `main` | Replit Agent يكتب مباشرة على الريبو (47 commit) | أي تجميع يُدفع لـ`main` — ممنوع نسختان متفرّعتان |

---

## 2) جرد إصلاحات Cursor الأخيرة (مجمّعة — كلها على main)
| المجموعة | الإصلاحات (commits) | المكان |
|----------|---------------------|--------|
| **ميني-آبات الأقسام** (RE/سيارات/مواد/Stay) | `0c574af` `a60f2a7` `441200b` `16e9167` `25d655e` | `components/search/*`, `SectionSearchApp` |
| **قفل الفئة anti-melt** | `1312860` `b63edaa` `6ba5f1b` | `search.tsx`, `SearchDiscover` |
| **RTL** (كروت/منيو-B/CTAs) | `10e473a` `e539d5f` `251e1bf` `b3224bf` | `SmartAssetCard`, `StayCard`, mini-apps |
| **ترتيب/شرائط** (34px sort + عدّاد صادق) | `e539d5f` `10e473a` `2970666` | headers الأقسام |
| **topPad→insets حقيقية (موجة B)** | `b044ad1` `216332c` | كل الأقسام (⚠️ تنبيه B) |
| **إصلاح الأقسام** (void أسود/زر الدولة/هيدر مهروس) | `55e9ffe` `18eb210` | section shells |
| **خرائط MOB-07** (explore-on-map → قسم عقارات) | `a4b5ec0` `6b3c1d1` `4b0bc19` | `search.tsx`, `SectionSearchApp`, icons |
| **أمان FI / W3** (authz فرع · آلة حالات · دور owner · KYC · inactive) | `884e352` `fc8d2bf` `e5c9418` `bbcce88` `9b082dc` `3dd14bb` | `FinancingService.ts`, admin |
| **Discover 2×2 كروت صور** | `6b18408` | `SearchDiscover` |
| **موقع مستقل** (banco-website، تجميد banco-web) + Phases 1–8 | `e0813ab` `63739de` + سلسلة website | `banco-website/*` |
| **بوابات إنتاج/CI + seed kill-switch** | `926c576` `cff37a6` | CI, scripts |

## 3) أجزائي أنا (Claude) + صياناتها (أين تعيش على main)
| الجزء | المكان | الحالة |
|------|--------|--------|
| W3 أمان FI (سبيك القبول) | نفّذه #40 · مُتحقَّق 8/8 | ✅ main |
| إشعارات ثنائية اللغة AR·EN (20 trigger) | EmailService + services + routing | ✅ main |
| multi-market + عملات per-country | `buildAttributeConditions`, BffService.formatMoney | ✅ main |
| FI Phase 2 (فروع/مقاعد/handoff/inbox) | FinancingService + admin | ✅ main |
| تعديل الهاتف + روابط التواصل | `profile.tsx`, `/me/social-links` | ✅ main |
| مراجعاتي الإنتاجية + جرد مؤرّخ | `audit/handoff/CLAUDE-*.md` | معلّق دفع (توكن) |

## 4) ما يفعله Replit الآن (تجميع + إصلاح + اختبار)
```bash
# 1) خذ أحدث main
git fetch origin && git checkout main && git reset --hard origin/main   # = 47cc4e5+
# 2) اختبر أولاً (قبل ما تسلّمها لي)
cd artifacts/banco-mobile && npx tsc -b            # موبايل: صفر أخطاء
cd ../api-server && pnpm test                       # api suite أخضر
npx expo-doctor                                     # جاهزية native
# 3) شغّل + شوتات
npx expo start --clear
```
**احتفظ بـ:** الهيدر الأسود · منيو البروفايل الجديد · قفل anti-melt · Discover 2×2. **ممنوع** إعادة الوردي أو أي بند «لن نفعله».

## 5) الإصدار والتسمية (بعد خضرة الاختبارات)
- Replit يبلّغ: `MOBILE_TSC=0 · API=green · EXPO_DOCTOR=ok · SHOTS=…`
- أنا أجلب النسخة + أراجع سيكيورتي + أؤكّد.
- **نسمّي:** مقترح tag `v1.5.0-global` (أو ما يختاره المالك) = أقوى نسخة تسليم عالمي.
- ثم **التوحيد النهائي** على `main` + نشر.

## 6) نتيجة اختباري على `47cc4e5` (مؤكّدة)
- مزامنة نسختي على `47cc4e5` ✅
- **mobile `tsc -b` = 10 أخطاء — كلها stale-expo-router-types false-positives · صفر أخطاء حقيقية · الهيدر الأسود سليم:**
  - كل الأخطاء على مسارات `/section/{car,real-estate,factories,materials}` و`/business/banks` — **ملفاتها موجودة فعلاً** (`app/section/*.tsx` · `app/business/banks.tsx`).
  - `.expo/types/router.d.ts` تاريخه **5 يوليو** (قبل إضافة هذه المسارات) والمسارات غايبة من الـunion المولّد → false-positive بحت.
  - **ولا خطأ يمسّ `StaysHomeHeader.tsx`/`BookingStaysApp.tsx`** → الهيدر الأسود (`47cc4e5`) لم يُدخل أي خطأ نوعي.
- **⚠️ تعليمة حاسمة لـReplit عند الاختبار:** شغّل **`npx expo start --clear` مرة (يجدّد `.expo/types`) قبل `npx tsc -b`** — وإلا سترى نفس الـ10 وتظنّ النسخة مكسورة. CI يجدّدها تلقائياً فيكون أخضر.

— Claude / Fable 5 · جرد شامل · لا كود جديد · القرار: أسود · المصدر: `main 47cc4e5`
