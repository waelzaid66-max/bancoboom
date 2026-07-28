# أقسام بايظة — أدلة ملف:سطر على `origin/main` (لا أعذار «مش شايف»)

**مُصدِر:** Cursor — فحص كود مباشر على الريبو  
**قاعدة الدليل:** `origin/main` @ `9f4dc94` (وما زال صالحاً على الشجرة الحالية للموبايل)  
**ممنوع الرد بـ:** «مش شايف» · «محتاج تشغيل» · «هتعلّم» · تخمين بلا سطر  
**المطلوب:** اقرأ الملفات المذكورة · أكّد أو انقض بدليل ملف:سطر · نفّذ TASK-003 فقط لـ MOB-01

---

## جدول العيوب (مرتّب بالأولوية)

| ID | شدة | القسم | العيب | الدليل (ملف:سطر) | مسار الإصلاح |
|----|-----|--------|-------|------------------|--------------|
| **MOB-01** | **P0** | Profile | شريحة «أضف هاتف» تفتح مودال تعديل **بدون حقل هاتف** — لا يمكن إكمال الـ nudge من هذا المسار | `profile.tsx:816` → `openEditProfile`؛ المودال `1867–` عنوان/فئة/bio فقط؛ الهاتف يُحفظ فقط عند التسجيل `238–241` + حقل signup `~2549`؛ `saveProfile` `389–410` يحدّث Clerk metadata فقط | **TASK-003** (أنت) |
| **MOB-02** | P1 | Banks | صفوف PRODUCTS ثابتة بـ chevron وليست `Pressable` — لا تنقّل | `banks.tsx:42–63` PRODUCTS؛ الرسم `406–449` = `<View>` بلا `onPress` | لاحقاً — صدق UI أو ربط حقيقي |
| **MOB-03** | P1 | Banks | نسخة «مؤسسات شريكة موثّقة» فوق قائمة **ستاتيك** محلية | `i18n.ts:1391` / `3320` subtitle؛ البيانات `banks.tsx:42–63` ليست من API شركاء | لاحقاً — نسخ صادق أو مصدر بيانات حقيقي |
| **MOB-04** | P1 | Profile RTL | أزرار الغلاف `right: 16` ثابتة — تخالف قاعدة i18n المنطقية | `profile.tsx:3487–3491` `coverActions` | Cursor فرع صغير (هذا الدور) |
| **MOB-05** | P1 | Search/Discover | `CategoryTabs` تبقى ظاهرة فوق/مع Discover وتصفّي Search المشترك | `search.tsx:819–823` دائماً؛ overlay Discover `646–658` | بعد دمج W1 — إخفاء عند `viewState==="discover"` أو معادل |
| **MOB-06** | P2 | Discover melt | على main: `SearchDiscover` يدفع `SECTION_ROUTE` و**لا يستدعي** `onBrowseSection`؛ لكن host ما زال يمرّر الجسر الميت | main: `SearchDiscover.tsx:78–82,122–124`؛ `search.tsx:519–523,652`؛ الإصلاح الكامل + حارس CI على PR **#32** | دمج #32 بعد TASK-002 |
| **MOB-07** | P2 | Map | `exploreOnMap` يحقن `category: "real_estate"` في معايير Search | `search.tsx:527–531` | لاحقاً — بوابة صادقة بلا حقن فئة |
| **MOB-08** | P2 | Legal | شاشات قانونية إنجليزية فقط | `app/legal/*` | لاحقاً — i18n parity |

---

## ما هو سليم (لا تلمسه — NO-WIPE)

| مسار | حالة | دليل |
|------|------|------|
| Discover → mini-apps عبر `SECTION_ROUTE` | يعمل في الكود | `SearchDiscover.tsx:32+,122–124` |
| قفل فئة الأقسام + MiniAppBottomNav | موجود | أقسام `app/(tabs)` / business routes (لا تعِد البناء) |
| Banks join CTA + inbox للأعضاء | موجود | `banks.tsx:72+` InstitutionInbox؛ CTA `486–496` |
| حفظ هاتف عند **التسجيل** عبر `updateMe` | موجود | `profile.tsx:238–241` |
| حارس الأقسام على فرع W1 | 5/5 + CI أخضر | PR #32 |

---

## أوامر تحقق فورية (انسخها — بلا أعذار)

```bash
git fetch origin main
# MOB-01 — شريحة الهاتف → openEditProfile بلا حقل هاتف في المودال
sed -n '810,820p;375,410p;1867,1925p' artifacts/banco-mobile/app/\(tabs\)/profile.tsx
# MOB-02
sed -n '42,63p;406,449p' artifacts/banco-mobile/app/business/banks.tsx
# MOB-04
sed -n '3487,3492p' artifacts/banco-mobile/app/\(tabs\)/profile.tsx
# MOB-05 / MOB-07
sed -n '519,532p;646,658p;816,823p' artifacts/banco-mobile/app/\(tabs\)/search.tsx
```

إذا نفّذت الأوامر ورأيت الأسطر — **أنت شايف**. أي ادعاء عكسي = رفض تسليم.

---

## ترتيب الصيانة المشترك (لا قفز)

1. **أنت الآن:** أنهِّ **TASK-002** (ACK + مراجعة #32 + مواصفات W3) إن لم تُسلَّم بعد  
2. **ثم TASK-003:** أصلح **MOB-01 فقط** (انظر الملف المخصّص)  
3. Cursor: MOB-04 + إغلاق جودة W1 بعد مراجعتك  
4. المالك: دمج #32 → سحب Replit (W0) → W2/#28  
5. فقط بعد أمر المالك: `Start W3 …`

**لا Start W3. لا توسيع عشوائي. لا مسح ميزات.**

— Cursor
