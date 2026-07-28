# تقرير Cursor الكامل — دفعة الإصلاح الجراحية (PR #41)

**من:** Cursor · **إلى:** المالك  
**التاريخ:** 2026-07-19  
**فرع:** `cursor/section-g2-finish-4322`  
**PR:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/41  
**Tip هذه الدفعة:** `8ae6c9b`  
**حارس:** `section-miniapp-guard` → **42/42 PASS**

---

## 0) جملة الحكم

الميني-آبات الخمسة (سيارات · عقارات · مصانع · توريدات · Stay) صارت **مفصولة · مربوطة فلاتر · RTL-safe على الكروت الرئيسية · ريست باك أوتوماتيك · بلا melt Discover**.  
لا اختراع FI · لا هيدر Stay أسود · لا تنفيذ Replit · لا W3 بلا `Start W3`.

---

## 1) سلسلة commits على الفرع (الأحدث أولاً)

| SHA (قصير) | الموضوع |
|------------|---------|
| `2d05f59` | SmartAssetCard RTL + Section sort في badge + تقارير |
| `915b376` | Stay sort 34px + StayCard start/end |
| `ec12aab` | Stay: auto-reset باك · rental strip · map latch |
| `c59e927` | Materials/توريدات: طبقات + FilterSheet حي |
| `2625734` | RE/Car: strips · market · ENTER |
| `e99220f` | RE: فصل عرض vs نوع |
| `d1e339f` | G2: Stay trim · market · لا وميض فلاتر |

Base merge: `0696c66` (#39).

---

## 2) ماذا أُصلح — حسب الميني-آب

### 2.1 Stay / Booking (`/section/booking`)
| طبقة | الحالة | دليل |
|------|--------|------|
| S1 Rose hero | ✅ MUST-KEEP | حارس يمنع `StaysHomeHeader` |
| S2 Type strip + sort 34px | ✅ | `stays-sort-cycle` |
| S3 Market matrix | ✅ | دول + عملات |
| S4 Rental strip | ✅ | = `criteria.rentalTerm` |
| S5 StayCard | ✅ | `start`/`end` · `?focus=booking` |
| S6 Map | ✅ | `?map=1` latch |
| EXIT | ✅ | `resetAndLeave` — **لا Alert** |
| FilterSheet | ✅ | أنواع Stay فقط · rent lock |

### 2.2 Materials / توريدات (`/section/materials`)
| طبقة | الحالة |
|------|--------|
| Material strip | ✅ |
| Origin strip | ✅ |
| Market matrix | ✅ |
| FilterSheet `showMaterial` / `showOrigin` / `showIndustry` | ✅ حي (لا تسريب أصل للمصانع) |

### 2.3 Real Estate (`/section/real-estate`)
| طبقة | الحالة |
|------|--------|
| Offer strip (بيع/إيجار) | ✅ منفصل عن الأنواع |
| Type strip | ✅ |
| Market matrix | ✅ |
| Map `?map=1` | ✅ |
| FilterSheet refinements | ✅ |

### 2.4 Car (`/section/car`)
| طبقة | الحالة |
|------|--------|
| Brand + origin strips | ✅ |
| Discover ENTER import | ✅ `?engine=import` |
| SECTION_ROUTE | ✅ لا melt |

### 2.5 Factories (`/section/factories`)
| طبقة | الحالة |
|------|--------|
| Industrial type chips | ✅ |
| FilterSheet industry | ✅ (مواقع — ليس chrome invent) |
| Globe market على الشريط | ✅ مقصود (مصفوفة RE/materials فقط) |

### 2.6 كروت النتائج (مشتركة)
| كرت | RTL badges/actions |
|-----|-------------------|
| StayCard | ✅ `start`/`end` |
| SmartAssetCard (Car/RE/Materials/Factories) | ✅ **هذه الدفعة** |
| IndustrialAssetCard ad badge | ✅ `start:6` |

### 2.7 صدق عدّاد الفلاتر
| سطح | sort في badge؟ |
|-----|----------------|
| Stay | ✅ |
| Section (كل الأقسام الأربعة) | ✅ **هذه الدفعة** |

---

## 3) ما فُحص وأُغلق من ادعاءات Claude (قديمة)

| ادعاء Claude | حكم tip الحي |
|--------------|--------------|
| C1 `browseSection` يحتاج CI kill | ✅ **مغلق** — prop/helper محذوف · حارس يفشل إن عاد |
| Profile `coverActions` `right:16` | ✅ **مغلق** — `end:16` على main |
| §MINIAPP confirm Alert | ⚠️ **قديم** — الحقيقة = auto-reset بلا ديالوج |
| #23 هيدر Stay أسود | ❌ **مرفوض Owner** — وردي فقط |
| W3 أمان FI | ⏸ بانتظار `Start W3` |

إيصال مفصل: `CURSOR-RECEIPT-CLAUDE-THREE-FILES-STAY-AR.md`.

---

## 4) هذه الدفعة بالتفصيل (كود)

| ملف | التغيير |
|-----|---------|
| `SmartAssetCard.tsx` | `topBadges`/`videoIndicator` → `start` · `topRightActions` → `end` |
| `IndustrialAssetCard.tsx` | `adBadge` → `start:6` |
| `SectionSearchApp.tsx` | `activeFilterCount` يشمل `sort !== "recommended"` |
| `section-miniapp-guard.test.mjs` | +2 اختبارات → **42/42** |

---

## 5) خارج النطاق (صريح)

- Banks directory حي / FI AuthZ / state machine (W3)
- دمج PR #23 أسود
- Website
- تنفيذ أوامر Replit (تسجيل فقط: `PASTE-REPLIT-RECORD-RE-CAR-WAVE-AR.md`)
- لغة ثالثة / Scale ملايين

---

## 6) خطة قبول Owner / Replit (شوتات)

1. Discover → 5 بوابات → routes صحيحة · لا melt  
2. Stay: وردي · sort chip · rental strip · باك يصفّر بلا ديالوج  
3. Materials: خامة + أصل + سوق  
4. RE: عرض / نوع / سوق · map  
5. Car: ماركة + أصل · import deep-link  
6. RTL: بادجات الكروت على الحافة المنطقية (عربية)  
7. ترتيب غير recommended → بادج الفلاتر > 0 في Section و Stay  

---

## 7) أوامر تحقق

```bash
node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs
# Expect: 42/42 pass
git rev-parse --short HEAD
```

---

## 8) فهارس التقارير المرافقة

| ملف | دور |
|-----|-----|
| `CURSOR-BATCH-FULL-REPORT-AR.md` | **هذا** — التقرير الجامع |
| `CURSOR-GAP-CLOSEOUT-AR.md` | فجوات هذه الجولة · مغلقة/مفتوحة |
| `CURSOR-RECEIPT-CLAUDE-THREE-FILES-STAY-AR.md` | استلام ملفات Claude |
| `SURGICAL-WAVE-WORKING-REF-AR.md` | مرجع تشغيل الموجة |
| `PASTE-REPLIT-RECORD-RE-CAR-WAVE-AR.md` | طبقات لكل قسم · تسجيل Replit فقط |
| `SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md` | خطة الوحدات (عقد الفصل) |

— Cursor · صدق جنائي · لا ادّعاء بلا إثبات
