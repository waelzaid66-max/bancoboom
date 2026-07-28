# دراسة عميقة — كل قسم = ميني-آب كامل · بنية · أهداف · استراتيجية · بلا Conflict

**تاريخ:** 2026-07-19  
**طلب المالك:** الميني-آب الصح = نُنشئ جوه كل قسم وننقل القسم **بكل مميزاته** ونصلح كل جزء **على حدى** · تقني عالي · دراسة كل حرف · داخلي+خارجي · شكل بلا انحراف · بنية تحتية ضخمة **ممنوع conflict**.  
**وضع هذه الوثيقة:** دراسة + قانون فهم · **لا كود تنفيذ حتى موافقة صريحة على وحدة مسمّاة.**

---

## 0) المعنى الصحيح (إعادة تعريف من كلامك + الكود)

| فهم غلط (حصل سابقاً) | الفهم الصح |
|----------------------|------------|
| «ميني-آب» = route يدفع لنفس محرك البحث مع pad مختلف | ميني-آب = **عالم كامل للقسم**: هوية · فلاتر · engines · نتائج · بطاقات · فراغ صادق · رجوع آمن |
| إصلاح طبقة pad على كل الملفات = صيانة الأقسام | الصيانة = **قسم × قسم** · جزء × جزء · داخل عمود طبقات ذلك القسم |
| توحيد Stay مع Section «عشان البساطة» | Stay **ميني-آب مختلف إنشائياً** (hero وردي + StayCard + rent lock) |
| تغيير شكل المربعات لما الشوت يبان غريب | المربعات بوابة فقط · الدقة الإنشائية داخل الميني-آب بعد الدخول |

**الجملة الذهبية:**  
Discover = فهرس بوابات.  
كل `/section/*` = تطبيق صغير مستقل يملك قسمه.  
البنية التحتية المشتركة (API · criteria · facets · FilterSheet · icons · i18n) = **مكتبة** تُستدعى بإعداد مقفول — لا ساحة مشتركة تذوب فيها الأقسام.

---

## 1) الاستراتيجية والأهداف (من دستور المشروع)

مصادر: `release/PROJECT_CONTEXT.md` · `PROJECT-PHILOSOPHY-DEPLOY-SECTION-GOALS-AR.md` · `CAPABILITY-SPLIT…` · `.agents/memory/banco-section-*`

### 1.1 المنتج
BANCO / B‑OOM: سوق متعدد القطاعات — سيارات · عقار (بيع/إيجار/أرض) · صناعي/مصانع · توريد B2B · تمويل.  
مراجع خارجية للمنتج (benchmarks داخل الدستور): Dubizzle/OLX (سيارات) · Booking/Trivago (إيجار سكني لا فنادق) · Alibaba (توريد).

### 1.2 فلسفة ملزمة (أي صيانة أقسام تخالفها = مرفوضة)
1. Never block trade  
2. Tiny floor  
3. Save all specs  
4. Publish then learn  
5. **No fabricated data — EVER**  
6. Additive only — لا rebuild واسع  
7. صدق الواجهة — لا ادّعاء شركاء/مخزون غير موجود  
8. i18n en+ar · RTL منطقي · أيقونات SVG registry  

### 1.3 هدف نجاح كل ميني-آب (قبول)
| ميني-آب | نجاح | فشل |
|---------|------|-----|
| Discover | كروت → `SECTION_ROUTE` · لا melt | ENTER / onBrowseSection |
| Car | قفل `car` · engines سيارات · نتائج سيارات أو فارغ صادق | اختلاط فئة · بيانات مختلقة |
| Real Estate | قفل `real_estate` · بيع/إيجار/أنواع · map من Discover فقط عبر `?map=1` | حقن criteria على Search tab |
| Factories | قفل `facilities` · industrial chips مرافق | ذوبان مع materials |
| Materials | قفل `materials` · origin/material | ذوبان مع facilities |
| Stay | قفل `real_estate`+`rent` · hero وردي · StayCard · taxonomy إيجار السوق | أزرق/فنادق/هيدر أسود |
| Banks (خارج stack الأقسام الخمسة) | honesty · لا دليل شركاء حي بلا بيانات | copy مضلّل |

---

## 2) البنية التحتية المشتركة (ضخمة — منطقة Conflict الحرمة)

> أي تعديل هنا يؤثر على **كل** الأقسام. ممنوع «إصلاح قسم» بتغيير جوهري هنا بدون أثر محسوب.

| طبقة تحتية | أين | دورها | Conflict إن… |
|------------|-----|-------|--------------|
| API search | `api-server` + OpenAPI/orval | استعلام موحد | تغيير عقد param بدون توافق كل الأقسام |
| `useSearchMiniApp` | hook | حالة+pagination لكل mount | مشاركة instance بين تاب Search وميني-آب |
| `SearchCriteria` / `buildSearchParams` | `lib/searchParams.ts` | ترجمة فلاتر→API | مسح حقل يحتاجه قسم آخر |
| `engines.ts` | car + RE فقط كقوائم engines | chips المعنى الواحد | إضافة engine يكسر facet gating |
| `facets.ts` | ظهور chips حسب مخزون حي | facilities/materials يشتركان API `industrial` | خلط group counts |
| `FilterSheet` | مشترك | `lockCategory` اختياري للميني-آب | إظهار category tabs داخل قسم |
| `SearchResultsSurface` / Map | مشترك | عرض نتائج | فرض UI Stay على Section أو العكس |
| `sectionTheme` / `SectionBackdrop` | هوية بصرية | accent/gradient/motif | أزرق لغير Banks |
| `icons` registry | SVG | لا tofu أندرويد | اسم أيقونة غير مسجّل |
| i18n | en+ar | نصوص | مفتاح ناقص لغة |
| Stack routes | `_layout.tsx` | تسجيل `section/*` | نسيان Screen → 404 |
| حارس | `section-miniapp-guard` 29/29 | يمنع melt/ENTER/أسود/67/iconBtn8 | حذف اختبار «عشان يعدّي» |

**قاعدة Conflict:**  
إصلاح داخل ميني-آب = أولاً في shell/`SectionSearchApp` فرع `if (category===…)` أو في `BookingStaysApp` فقط.  
تعديل تحتية مشتركة = وثيقة أثر على الأقسام الخمسة + موافقة Owner.

---

## 3) المعمارية التقنية المستهدفة (معنى «تقني عالي»)

### 3.1 نمط داخلي قائم (لا نخترع عجلة)
من `.agents/memory/banco-section-pages.md`:
- كل دخول = `useSearchMiniApp` **جديد** (reset بالـ lifecycle)
- dirty = فرق عن `baselineRef` وقت الهبوط
- Booking: `lockedEngine=rent` + إخفاء engine chips
- FilterSheet: `lockCategory` فقط هنا
- مسجّل في Stack مع animation

### 3.2 مرجع خارجي (مبادئ — ليس نسخ مكتبات)
(مع محدودية بحث الويب في البيئة؛ المبادئ مستقرة في هندسة المنتجات)

| مبدأ صناعي | تطبيقه عندنا |
|------------|--------------|
| **Feature / vertical slice** | كل قسم = شريحة منتج كاملة لا «تاب فلاتر» |
| **Micro-frontend isolation (مفهوم)** | حدود واضحة: route + state + chrome خاص · مشاركة مكتبة لا مشاركة state |
| **Nested navigation stack** | Expo Router Stack لـ `section/*` فوق Tabs — خروج = pop نظيف |
| **Composition over boolean soup** | لا `isStay && isCar` في Search tab — مكوّن/مسار لكل عالم |
| **Shared kernel, isolated shells** | kernel = criteria/API/facets · shell = Car/RE/…/Stay |

### 3.3 الوضع الحالي vs المعنى الكامل الذي تطلبه

| البعد | الآن (حقائق كود) | المعنى الكامل (هدفك) |
|-------|------------------|----------------------|
| الدخول | ✅ route منفصل لكل قسم | يبقى |
| قفل الفئة | ✅ seed + hard-lock update | يبقى ويُختبر بالشوت |
| محرك واحد مشترك UI | `SectionSearchApp` واحد بفروع `category` | مقبول **طالما** كل فرع يحمل مميزات قسمه كاملة ولا يسرّب للآخر |
| Stay | ✅ ملف منفصل `BookingStaysApp` | يبقى منفصلاً — ممنوع دمجه في Section |
| اكتشاف مميزات ناقصة داخل قسم | يحتاج دراسة جزء×جزء بالشوت+كود | **مرحلة التنفيذ بعد الموافقة** |
| شكل بلا انحراف | حارس + CANONICAL dp | تدقيق بصري طبقة×طبقة لكل قسم |

> نقل «القسم بالكامل» **لا يعني** نسخ ملفات خمسة أضعاف بلا داعٍ (يعارض Additive).  
> يعني: **كل مميزات القسم تعيش وتُصلَح داخل حد الميني-آب**، والـ kernel لا يعيد خلطها في Search.

---

## 4) دراسة كل قسم — حرفياً (من الكود + الذاكرة)

### 4.1 Discover (بوابة — ليس ميني-آب نتائج)
- **ملف:** `SearchDiscover.tsx` داخل host `search.tsx`
- **مميزات:** شبكة 2×2 كروت مصوّرة · بوابة Stay عرض كامل · map CTA → RE?map=1 · car-import hub → `/section/car`
- **طبقات المربع:** wrap→card118→photo→scrim→watermark→badge→label→chevron  
- **ممنوع:** CategoryTabs · EngineChips · ENTER · melt criteria  
- **هدف شكلي:** مربعات بنفس الدقة الإنشائية (ارتفاع/فجوة/radius) — أي انحراف = تدقيق طبقة المربع لا redesign

### 4.2 Cars — `/section/car`
| عنصر | الحقيقة |
|------|---------|
| Shell | `category="car"` + عناوين i18n |
| Engines | `CAR_ENGINES`: all/new/used/import/bank/islamic/auto/manual/fuel… |
| فلاتر خاصة | brand/model · fuel · transmission · years · origin · payment |
| UI خاص | CarPicker · brand chips |
| هوية | accent سيارات من `sectionTheme` |
| فارغ صادق | empty + CTA طلب/RFQ حسب المنطق الموجود — بلا اختلاق قوائم |

**أجزاء تُصلَح على حدى (لاحقاً بموافقة):** C1 هيدر · C4 engines · CarPicker · بطاقة نتيجة · empty · map إن وُجد.

### 4.3 Real Estate — `/section/real-estate`
| عنصر | الحقيقة |
|------|---------|
| Engines | sale/rent/villa/apartment/land/…/furnished… |
| خاص | `rentalTerm` عند engine=rent · taxonomy سوق |
| Map | latch `?map=1` من Discover فقط · لا update Search tab |
| هوية | rose عائلة العقار |

**أجزاء:** هيدر · chip strip · rental terms · map pill · FilterSheet · نتائج.

### 4.4 Factories — `/section/factories` (category داخلي = `facilities`)
| عنصر | الحقيقة |
|------|---------|
| API | مجموعة industrial · `industrial_type` |
| UI | **industrial chips** بدل engine bar الكلاسيكي غالباً |
| خطر conflict | مشاركة سطح industrial مع Materials — الفصل بالـ group/type |
| فارغ | جسور RFQ/wanted إن مفعّلة في الكود |

**أجزاء:** قفل facilities · chips صناعية · industry filter · empty RFQ · نتائج IndustrialAssetCard حيث ينطبق.

### 4.5 Materials — `/section/materials`
| عنصر | الحقيقة |
|------|---------|
| خاص | `originType` chrome · `material` filter · industrial subtypes (machine/production_line…) |
| خطر | لا تُعرض chips المرافق داخل مواد والعكس |
| Engines | عبر facets/industrial لا قائمة CAR/RE |

**أجزاء:** origin row · material · industrial types · empty · نتائج.

### 4.6 Booking & Stays — `/section/booking`
| عنصر | الحقيقة |
|------|---------|
| ملف | `BookingStaysApp` (fork واعٍ — ليس SectionSearchApp) |
| قفل | `real_estate` + `rent` دائماً |
| UI | Hero وردي + B-OOM STAY wordmark + Where to? · **لا أزرق** |
| بطاقات | `StayCard` — photo-first · سلوك reaction كـ SmartAssetCard |
| بيانات | لا اختلاق rooms/rating · `price_display` حرفياً · bookable غالباً `furnished_daily` |
| Taxonomy | furnished_daily / new_law / old_law / annual_contract حسب السوق |

**أجزاء:** S1 hero · S2 actions · S3 search pill · S4 terms · StayCard · empty post-request · FilterSheet.

### 4.7 ما ليس ضمن الخمسة لكن يُخلط خطأً
- **Banks:** ميني-عالم تمويل · أزرق مسموح هنا فقط · honesty copy  
- **Search tab النشط:** نتائج عامة بعد كتابة بحث — **ليس** بديل الميني-آب  
- **Website:** معزول تماماً عن موجات الموبايل  

---

## 5) أدقّ أوديت مطلوب: الشكل والتنسيق بلا انحراف

لكل قسم بعد الدخول، افحص **بالترتيب الطبقي** (انظر `ARCHITECTURE-LAYERS-PER-MINIAPP-AR.md`):

```
بوابة Discover (إن خرجت منها)
→ C1/S1 هيدر أو Hero (أزرار جوه · لا سحق عنوان)
→ C2/S3 بحث
→ C4/S4 chips (لا void أسود · flexGrow 0)
→ صفوف خاصة بالقسم فقط (rental / origin / industrial)
→ نتائج / empty صادق
→ Map overlay إن وُجد
→ FilterSheet مقفول فئة
→ BottomNav
```

عتبات من `SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md`: Δ≤2dp · hit≥44 · لا فراغ أسود.

---

## 6) خطة التنفيذ الصحيحة بعد الدراسة (معلّقة على موافقتك)

```
المرحلة S0  اعتماد هذه الدراسة كقانون فهم          ← موافقة Owner
المرحلة S1  شوتات مرجع لكل ميني-آب (5+Discover)   ← Replit/Owner · لا كود
المرحلة S2  لكل قسم بالدور (Car ثم RE ثم …):
            S2.a جرد فجوات مميزات (كود↔شوت↔هدف)
            S2.b موافقة Owner على قائمة أجزاء ذلك القسم
            S2.c إصلاح جزء واحد مسمّى داخل القسم
            S2.d حارس + شوت + لا لمس تحتية مشتركة إلا بأثر
المرحلة S3  Stay كمسار منفصل بنفس الصرامة
المرحلة S4  أوديت شكل نهائي عبر الأقسام (اتساق بلا توحيد خاطئ)
```

**ممنوع في التنفيذ:**  
إعادة بناء SectionSearchApp من صفر · دمج Stay في Section · لمس API عقد بلا حاجة · Website · W3 بدون Start · redesign المربعات.

---

## 7) خلاصة الدراسة (جمل قصيرة)

1. نعم — الهدف ميني-آب **كامل المميزات** لكل قسم، إصلاح جزء×جزء.  
2. البنية التحتية مشتركة وممنوع تلغيمها؛ العزل = state+chrome+قفل+route.  
3. Stay استثناء إنشائي واعٍ.  
4. Factories/Materials يحتاجان انتباه conflict على industrial.  
5. أهم أوديت شكلي = طبقات كل شاشة داخل القسم، ليس pad عالمي.  
6. التنفيذ لا يبدأ إلا بموافقتك على مرحلة/قسم/جزء مسمّى.

---

## 8) طلب موافقة

اختر رداً واضحاً:

**أ)** اعتماد الدراسة كقانون فقط — لا كود  
**ب)** ابدأ **S1 شوتات فقط** للخمسة + Discover (بدون كود)  
**ج)** ابدأ دراسة فجوات تنفيذية لقسم واحد تسمّيه: `Car` | `RE` | `Factories` | `Materials` | `Stay` (ما زال بلا كود حتى قائمة أجزاء + موافقة ثانية)  
**د)** بعد ج: اسمح بإصلاح **جزء واحد** تسمّيه من القائمة  

مثال: `موافق أ` أو `موافق ب` أو `موافق ج: Car`

— Cursor · Deep mini-app study · Infrastructure-aware · No conflict · Awaiting Owner
