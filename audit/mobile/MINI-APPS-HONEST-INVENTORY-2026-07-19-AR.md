# جرد صادق — ميني-آبس الأقسام (2026-07-19)

**فرع:** `cursor/discover-enter-fix-4322`  
**PR:** #37  
**قاعدة:** دليل كود فقط — لا تخمين جهاز.

---

## مصفوفة الاكتمال

| سطح | الحالة | دليل |
|-----|--------|------|
| Discover portals | **PASS** | `SECTION_ROUTE` + `router.push` — لا `update({category})` |
| Car `/section/car` | **PASS** | `SectionSearchApp` + lock + empty bridges |
| Real estate + map | **PASS** | `?map=1` latch + normalize `string\|string[]` |
| Factories | **PASS** | `facilities` + industrial group |
| Materials | **PASS** | `materials` + materials chrome |
| Booking `/section/booking` | **PASS*** | Stay header + lock rent/RE + demand bridge + rentalTerm في الشارة (*بعد إصلاح هذه الموجة) |
| Host Search melt | **PASS** | لا جسر `onBrowseSection` |
| Fake inventory | **PASS** | لا صفوف وهمية؛ صور البوابات غلاف فقط |

\* قبل هذه الموجة: Booking كان **GAP** (empty بلا post-request · شارة تتجاهل `rentalTerm`).

---

## إصلاحات هذه الموجة (مثبتة)

| ID | العيب | الإصلاح |
|----|--------|---------|
| B-01 | شارة فلتر Stay لا تحسب `rentalTerm` رغم وجوده في FilterSheet | `activeFilterCount` يشمل `!!criteria.rentalTerm` |
| B-02 | empty Stay dead-end بدون جسر طلب | `stays-empty-post-request` → `/listings/create?request=1` |
| B-03 | empty CTAs `flexDirection:"row"` ثابت | `flexDirection: rowDir` + شارات `end` بدل `right` |

حارس: `section-miniapp-guard.test.mjs` → **24/24** (كان 21).

---

## ما لم يُلمَس عمداً (خطر تكبير المشاكل)

- جسر Discover→host category
- مشاركة `useSearchMiniApp` بين host والأقسام
- إزالة `lockCategory`
- تقسيم industrial group
- Banks live directory (قرار منتج Owner)
- W3 FI / website

---

## متبقٍ خارج نطاق كود الميني-آبس

| بند | طبقة |
|-----|------|
| إثبات جهاز P01–P13 على tip | L3 Replit runtime only |
| دمج #37 / #28 | MERGE |
| Staging secrets / EAS | OPS Owner |
| W3 | BLOCKED حتى Start |

---

— Cursor · Honest inventory
