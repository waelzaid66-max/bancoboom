# Cursor Scan Report — Production Mobile (بديل Copilot)

**فرع:** `cursor/discover-enter-fix-4322`  
**وقت المسح:** 2026-07-19  
**القاعدة:** Copilot = UNTRUSTED · أدلة فقط  
**حارس بعد الإصلاحات:** **26/26 PASS** (`section-miniapp-guard.test.mjs`)

---

## نتيجة البند (evidence-only)

| # | بند | حكم | دليل |
|---|-----|-----|------|
| A1 | Discover `SECTION_ROUTE` + `router.push` | **PASS** | `SearchDiscover.tsx` SECTION_ROUTE + handleSectionPress |
| A2 | لا `onBrowseSection` | **PASS** | grep TS/TSX = 0 matches |
| A3–A5 | إخفاء CategoryTabs/engines/filter على Discover | **PASS** | `search.tsx` `viewState !== "discover"` |
| A6 | بوابات `sectionPortal` صفوف ENTER | **PASS** | `SearchDiscover.tsx` styles + map |
| A7 | Stack `section/*` + booking | **PASS** | `app/_layout.tsx` |
| B1 | `StaysHomeHeader` mounted | **PASS** | `BookingStaysApp.tsx` |
| B2 | لا Hotels في تبويبات Stay | **PASS** | types studio/apartment/villa/chalet |
| MOB-07 | map → `/section/real-estate?map=1` | **PASS** | `search.tsx` exploreOnMap |
| MOB-07 latch | `string\|string[]` + Array.isArray | **PASS** | `SectionSearchApp.tsx` |
| Icons | key / key-outline / business / bed-outline | **PASS** | `icons.tsx` |
| Banks honesty | ليست دليل شركاء حي | **PASS** | `i18n.ts` + `banks.tsx` |
| Melt bridges | لا update({category}) من Discover | **PASS** | Discover + guard |
| RTL suggestions inset | host Search | **PASS** | left/right حسب isRTL |
| RTL suggestion textAlign | كان ناقصاً | **FIXED** | search + Section + Stays |
| Map CTA honesty | كان يقبل أي coords | **FIXED** | يتطلب `category === "real_estate"` |
| Guard coverage | كان ناقصاً لـ Stay/icons/banks/RTL/map | **FIXED** | اختبارات إضافية في guard |

---

## ما يبقى خارج هذا المسح (لا يدّعي Cursor إغلاقه)

| بند | مالك |
|-----|------|
| إثبات شوتات جهاز Replit P01–P13 | Replit |
| دمج #37 / #38 / #28 | Owner |
| W3 FI security | محظور بدون Start |
| Staging secrets / EAS | OPS Owner |
| Website soft-launch CDN | مسار website فقط |

---

## أوامر إعادة التحقق

```bash
cd artifacts/banco-mobile
node --test tests/section-miniapp-guard.test.mjs
# المتوقع بعد توسيع الحارس: كل الاختبارات PASS
```

— Cursor · يحلّ محل أي ادّعاء Copilot
