# تقرير جنائي — بنوك وممولين: طبقات · إنشاءات صحيحة · عرض ناقص

**الفرع:** `cursor/discover-enter-fix-4322`  
**Tip SHA:** اطبع `git rev-parse --short HEAD` عند القراءة (لا تثبت short قديم).  
**الحالة:** FORENSIC ONLY — لا كود حتى موافقة Owner صريحة.  
**الدخول:** Discover → `testID=discover-banks-hub` → `router.push("/business/banks")`

---

## 0) الحكم في جملة

الصفحة **تفتح مسارها الخاص** (`/business/banks`) وليست ذائبة داخل Search tab.  
ما يبدو «مش صفحة خاصة» هو أن **العرض العام brochure ثابت** بينما **الإنشاءات الحقيقية (دليل وسطاء · Inbox · فروع · مقاعد)** موجودة في طبقات أخرى ومقفولة أو غير موصولة بالهب العام.  
الوكلاء اختصروا عبر توسيع طبقات أقسام/أعمال أخرى بدل بناء عالم بنوك مكتمل للزائر.

> **مهم:** Claude هو من بنى قلب FI (Phase 2 + inbox + فروع). تقاريره/عنه في `audit/financing/*` و`CLAUDE-*` **أعمق من سطح الهب** — انظر §Claude أدناه قبل أي Start.

---

## Claude — ماذا قالت التقارير (مرجع إلزامي)

### مصادر Claude الأساسية (اقرأ بهذا الترتيب)

| ملف | ماذا يعطي |
|-----|-----------|
| `audit/financing/00-FI-FORENSIC-MASTER-V2-AR.md` | الحكم التنفيذي v2 |
| `audit/financing/08-CLAUDE-TIMELINE-AND-LAST-EDITS-AR.md` | أين وقف Claude (آخر سطح `36eec11`) |
| `audit/financing/09-CLAUDE-FAILURES-FULL-CATALOG-AR.md` | كتالوج نجاح/فشل كامل (F-SEP / F-ORD / F-CLM / F-SEC / F-UX) |
| `audit/financing/04-CLAIMS-VS-REALITY-MATRIX-AR.md` | ادعاء commit vs واقع الكود |
| `audit/financing/10-DEEP-REMAINING-PROBLEMS-AR.md` | R1–R10 الباقي العميق |
| `audit/financing/11-PREP-CHECKLIST-NO-CODE-AR.md` | قرارات منتج D1–D6 قبل كود |
| `audit/handoff/CLAUDE-MASTER-FEATURE-LIFECYCLE-SHEET-AR.md` §4 + §10 | دورة حياة FI + «معمول غلط» باعترافه |
| `audit/handoff/CLAUDE-RESPONSE-FULL-FACTS-AR.md` | تقسيم عمل: W3 أمان=Claude · W2 أدمن=Cursor |
| `audit/handoff/CLAUDE-NO-EXCUSES-BROKEN-SECTIONS-AR.md` | MOB-02/03 Banks على الموبايل |

### حكم Claude التنفيذي (مُلخَّص أمين)

> Claude بنى **نظام وساطة تمويل حقيقي** وتوقّف عند سطح البنك المشروط بالعضوية.  
> الإخفاق الأكبر **ليس** «الكود فاضي»، بل **كسر الحلقة التشغيلية + صدق الواجهة العامة + AuthZ**.

نِسَب تقديرية من تقرير 04/09 (منتج، مش سطور):

| طبقة | تقدير Claude/التدقيق |
|------|----------------------|
| Backend FI Phase 2 | ~85% |
| Mobile bank inbox | ~75–80% |
| Mobile **public** hub | ~10–40% (brochure) |
| فصل التسجيل (قبل P0) | ~35% |
| تشغيل أدمن Phase 2 (قبل P0) | ~15% |
| دليل بنوك عام | ~10% |
| AuthZ وكيل صارم | ~60% list فقط — PATCH ثغرة |

### ما نجح Claude فيه (لا يُبخَس — MUST-KEEP)

من كتالوج 09 §A وشيت Claude §4:

1. Schema Phase 2: وسيط / فروع / مقاعد / `branch_id`  
2. API بنك: `/v1/financing/inbox*` + عضوية  
3. API أدمن: CRUD وسطاء + فروع/مقاعد  
4. Auto-handoff إشعارات عند forward  
5. UI inbox داخل الهب + توجيه فرع (`a3820d2` / `36eec11`)  
6. نوع حساب FI + نشاط بنك + إصلاح demote الجزئي (`a6e945d`)  
7. CRM طلبات تمويل أدمن حقيقي + deep-link نوتيفيكيشن → banks  

**هذه هي «الإنشاءات الصحيحة» التي يقصدها المالك/Replit — موجودة، لكن الزائر العام لا يراها كدليل.**

### إخفاقات Claude المصنّفة (قلب المشكلة)

| عائلة | IDs | المعنى للمالك |
|-------|-----|----------------|
| **فصل** | F-SEP-01…05 | CTA→dealer · فورم مشترك · نجاح→listing · hub brochure · باقة FI ناقصة |
| **ترتيب تشغيلي** | F-ORD-01…05 | Verify لا يفتح inbox · ربط UUID يدوي · لا جسر KYC↔تمويل |
| **ادّعاء > واقع** | F-CLM-01…07 | «مقفول حتى التوثيق» بلا إنفاذ · «شركاء موثّقون» · chevron ميت · suite 3/3 مبالغ |
| **أدمن** | F-ADM-01…06 | API بلا UI (كان) · KYC أعمى · لا delete lifecycle |
| **أمان** | F-SEC-01…07 | **Critical:** agent PATCH يتجاوز فرعه · لا state machine · owner لأي user |
| **اكتشاف UX** | F-UX-01…05 | لا اختصار inbox في البروفايل · Join فوق الأعضاء · أخطاء inbox تُخفى |

Claude نفسه سمّى أخطاءه (شيت §10 W1–W7): تغطية مبالغة، نسخ بلا إنفاذ، تسويق مكان الدليل، AuthZ غير متماثل، إصلاح demote جزئي.

### حالة البنود على **هذا الفرع** (تحديث بعد تقارير Claude القديمة)

تقارير Claude كُتبت و#28 «غير مدموج على main». على tip الحالي:

| بند Claude | حالة tip `cursor/discover-enter-fix-4322` |
|------------|-----------------------------------------------|
| F-SEP-01 `intent=fi` | **مُغلق هنا** — `banks.tsx` → `onboarding?intent=fi` (P0 مدمج في الفرع `e5d2553`) |
| F-SEP-03 نجاح→listing | يُفترض مُعالَج في P0 — أعد تحقق قبل الاعتماد |
| F-ADM-01 UI فروع/مقاعد/owner | **موجود جزئياً** في `admin-os/.../financing.tsx` على الشجرة (hooks branches/seats/owner) — ما زال UUID خام / بلا picker كامل |
| MOB-03 / F-CLM-04 نسخ شركاء | **مُصلح نصياً** — subtitle: «ليست دليل شركاء حي» |
| MOB-02 chevron | **أُزيل الإيحاء** — صفوف بلا chevron؛ الشكل ما زال بطاقات PRODUCTS |
| F-SEP-04 / R7 دليل حي | **ما زال مفتوحاً** — لا API عام · لا قائمة مؤسسات للزائر |
| F-SEC-01 agent PATCH | **ما زال Critical مفتوحاً** — لا Start W3 بلا أمر Owner |
| F-CLM-02 قفل حتى verified | **ما زال مفتوحاً** — inbox بعضوية لا بـ `is_verified` |
| F-ORD-01 Verify→link | **ما زال مفتوحاً** — الحلقة البشرية تحتاج أدمن |
| باقة FI / نقل آمن / state machine | **مفتوحة** (R2/R8/R9) |

### تقسيم العمل الذي وافق عليه Claude (لا تصادم)

| موجة | مالك | ملاحظة |
|------|------|--------|
| W2 استكمال FI تشغيلي / #28 | Cursor (+ مراجعة Claude) | جزئياً على هذا الفرع؛ تحقق main قبل الاعتماد |
| **W3 أمان FI** (AuthZ/state/docs) | **Claude** | ممنوع Cursor يبدأه بدون Start Owner صريح |
| W4 صدق البنوك / directory أو copy | Claude + قرار Owner (D1) | يطابق خيار ب/ج عندنا |
| ملفات محرّمة بلا إعلان | `banks.tsx` · `FinancingService.ts` · `schemas.ts` · `onboarding.tsx` | أي لمس = إعلان في handoff أولاً |

### قرارات منتج Claude طلبها قبل كود (11-PREP)

| # | القرار | يربط خيارنا |
|---|--------|-------------|
| D1 | هب = دليل حي أم brochure؟ | أ/ب vs ج |
| D2 | Verify يفتح inbox أم ربط يدوي؟ | د / تشغيل |
| D3 | مقعد موظف يشترط دور FI؟ | W3 |
| D4 | نقل بين بنوك بموافقة؟ | مؤجّل |
| D5 | باقة FI مدفوعة؟ | مؤجّل |
| D6 | دمج #28 قبل أم بعد AuthZ؟ | ترتيب مخاطر |

---

## 1) مسار الفتح — حقيقة vs شعور

| فحص | النتيجة | دليل |
|------|---------|------|
| Discover CTA | `Pressable` → `"/business/banks"` | `SearchDiscover.tsx` ~449–451 |
| هل Banks داخل `SECTION_ROUTE`؟ | **لا — متعمّد** | `SECTION_ROUTE` = car / real-estate / factories / materials فقط |
| شاشة الوجهة | `app/business/banks.tsx` | ملف كامل: hero أزرق + PRODUCTS + Join + Inbox شرطي |
| مسار أقسام أخرى | `/section/*` ميني-آب Search | Banks **خارج** هذا الـ stack |

**معنى ملاحظة المالك «مش بتفتح صفحة خاصة بيها»:**  
ليس 404 ولا melt لتاب Search. الشعور يأتي من أن الزائر يتوقع ميني-عالم (قائمة مؤسسات / منتجات حية / فلاتر) فيجد **هب تسويقي** يشبه بطاقة Business أخرى، بينما القدرات الثقيلة مخفية أو أدمن-فقط.

---

## 2) خريطة الطبقات — ما هو Banks فعلاً؟

```
Discover (hub portal أزرق)
        ↓ push /business/banks

Layer A — Public Hub (banks.tsx)
  hero + subtitle صادق + PRODUCTS[] ثابت
  Join CTA → onboarding?intent=fi
  note صدق

Layer B — FI Staff (نفس الملف، شرطي)
  InstitutionInboxSection
  GET /v1/financing/inbox (أعضاء فقط)
  branch assign · contacted/closed

Layer C — Admin CRM (غير موبايل عام)
  listIntermediaries · seats · forward
  permission: manage_financing

Layer D — Listing financing (عالم آخر)
  payment_options / bank_finance على إعلان
  seed BANK_FINANCE_PARTNERS ≠ دليل بنوك
```

**قاعدة الهوية:** أزرق trust = Banks فقط (`BANKS_ACCENT` / `SECTION_GRADIENT.banks`). Stay وردي — ممنوع استعارة أزرق Stay.

---

## 3) إنشاءات صحيحة موجودة — لكنها مش معروضة للعامة

| إنشاء | أين يعيش | يظهر للزائر؟ | ملاحظة |
|--------|----------|--------------|--------|
| جدول `financing_intermediaries` + `listIntermediaries()` | API أدمن | **لا** | لا endpoint عام للموبايل |
| Inbox مؤسسة + تحديث حالة/فرع | `banks.tsx` + `/v1/financing/inbox` | فقط عضو FI موقّع | يختفي بصمت لغير الأعضاء (403 → null) |
| `intent=fi` على Join | CTA → onboarding | نعم مسار | فُتح بـ P0 / #28 مسار |
| دور `financial_institution` | backend enum | نعم بعد onboarding | فصل عن dealer موجود |
| فروع + seats + auto-handoff | FI phase 2 | داخل inbox فقط | تشغيل يومي يحتاج ربط أدمن |
| أنواع منتجات (عقار/سيارات/…) | `PRODUCTS[]` محلي | نعم كنص | **ليست** بيانات بنك حي |

مرجع سابق متوافق: `audit/financing/01-BANKS-HUB-REAL-DATA-AR.md` (PARTIAL).

---

## 4) ما يُبنى غلط / ناقص في العرض

| ID | العرض الحالي | المشكلة |
|----|--------------|---------|
| MOB-02 | صفوف PRODUCTS كبطاقات | كانت توحي بتنقّل (chevron)؛ أُزيل الـ chevron لكن الصفوف ما زالت «شكل كتالوج» بلا وجهة |
| MOB-03 (مغلق نصياً) | كان «شركاء موثّقون» | النسخ الآن صادق: «ليست دليل شركاء حي» — لكن الشكل ما زال brochure |
| S6 | نفس الشاشة = تسويق + inbox مخفي | توقعات الزائر ≠ حقيقة القسم |
| Directory gap | لا قائمة مؤسسات من API | التوقع الأكبر غير مبني على الموبايل العام |
| Onboarding مشترك | حقول dealer/company/FI | توسعة طبقة أعمال قديمة بدل عالم FI مستقل (S2/S3 في تقرير 05) |

Replit matrix يؤكد السطحين فقط كقبول بصري حالي:
- **S056** hub صادق (منتجات بلا chevron · Join · note)
- **S057** inbox إن حساب FI

لا يوجد في المصفوفة «دليل شركاء حي» كسطح جاهز.

---

## 5) اختصار الوكلاء — توسيع طبقات أقسام أخرى

| اختصار لُوحظ تاريخياً | طبقة مستعارة | لماذا غلط لـ Banks |
|----------------------|--------------|---------------------|
| معاملة Banks كميني-آب Search (`SectionSearchApp` / criteria) | طبقات Car/RE/Factories | Banks ليس `Category` في `SECTION_ROUTE` ولا محرك بحث إعلانات |
| إصلاح «فراغ» بـ `topPad = web?67` | نمط layout أقسام | ضغط هيدر؛ صُحّح لـ insets حقيقية على #37 |
| أزرق لـ Stay / Booking | هوية Banks | كُسر ثم رُمّم وردي Stay |
| Join → onboarding بلا `intent=fi` | مسار تاجر | فرد يصبح dealer |
| نجاح onboarding → إنشاء إعلان | عالم بائع | رحلة بنك تُدفع لمسار listing |
| الاعتماد على seed `BANK_FINANCE_PARTNERS` كـ «دليل» | طبقة listing payment_options | أسماء خطط تمويل على إعلانات تجريبية ≠ directory |
| نسخ «شركاء موثّقون» فوق PRODUCTS | تسويق مكان بيانات | أُصلح نصياً؛ الشكل ما زال مضلّلاً جزئياً |

**خلاصة الاختصار:** المشكلة ليست أن Banks «ناقص ملف» — الملف موجود وغني (inbox حقيقي). المشكلة أن **الطبقة العامة لم تُبنَ كعالم بنوك**؛ وُضعت brochure فوق أنابيب CRM/FI بينما الدليل الحي بقي أدمن-فقط.

---

## 6) مقارنة سريعة مع الأقسام الخمسة

| بُعد | Car / RE / … / Stay | Banks |
|------|---------------------|-------|
| Route | `/section/*` | `/business/banks` |
| نواة | `useSearchMiniApp` + نتائج | Hub + Inbox شرطي |
| بيانات عامة | إعلانات حية من search API | لا directory عام |
| هوية لون | أحمر/وردي عائلة | أزرق وحيد |
| هدف الزائر | تصفّح/فلترة مخزون | تعرّف أنواع تمويل + انضمام مؤسسة |
| هدف المؤسسة | (بائع/مضيف) | استلام طلبات محوّلة |

Banks **عالم سادس موازٍ** — ليس «قسم سادس بنفس طبقات البحث». أي إصلاح يحاول لصق `engines/facets` عليه = اختصار طبقات قديمة.

---

## 7) ماذا **ليس** مطلوب إصلاحه الآن (بدون Start)

- W3 FI AuthZ عميق  
- دليل شركاء حي كامل (يحتاج قرار منتج + API عام + UI)  
- إعادة تصميم Discover  
- دمج Banks داخل `SECTION_ROUTE`  
- لمس Financing CRM أدمن إلا بتنسيق معلن

---

## 8) خيارات Owner — موافقة قبل أي كود

| خيار | ماذا يعني | مخاطرة | يربط Claude |
|------|-----------|--------|-------------|
| **أ) Confirm-only** | Replit S056/S057 على tip؛ لا كود | صفر | — |
| **ب) Honesty شكلي أعمق** | تقليل إيهام كتالوج PRODUCTS بلا directory | UI صغير | D1=brochure + W4 copy |
| **ج) دليل شركاء حي (Start)** | API عام آمن + قائمة مؤسسات نشطة | منتج+API | D1=حي · مالك API غالباً Claude |
| **د) عالم FI / حلقة تشغيل** | Verify→link · مسار Profile · باقة | كبير | D2/D5 + F-ORD |
| **هـ) Start W3 أمان فقط** | AuthZ وكيل + state machine | Critical لكن نطاق ضيق | Claude يملك W3 — لا Cursor وحده |

**اقتراح Cursor (متوافق مع Claude):**  
1) **أ** تأكيد بصري · 2) حسم **D1** · 3) إن brochure→**ب** · إن دليل→**ج** بـStart · 4) **هـ/W3** بأمر منفصل لـClaude · لا خلط موجات.

---

## 9) أوامر تحقق سريعة (بدون تعديل)

```bash
rg -n "business/banks|discover-banks|SECTION_ROUTE" artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n "PRODUCTS|InstitutionInbox|intent=fi" artifacts/banco-mobile/app/business/banks.tsx
rg -n "listIntermediaries|/intermediaries|/inbox" artifacts/api-server/src/routes/v1/
sed -n '1391,1406p;3326,3341p' artifacts/banco-mobile/constants/i18n.ts
```

---

## 10) طلب موافقة

Owner: اختر **أ / ب / ج / د** (أو مزيج مرتّب).  
Cursor لا يلمس `banks.tsx` / Financing API لبناء directory أو إعادة تشكيل الهب حتى يردّ Start صريح على بند مسمّى.
