# W1 Cursor — وقاية فصل الأقسام (صيانة حقيقية)

**فرع:** `cursor/w1-section-filter-isolation-4322`  
**أساس:** `origin/main` @ `9f4dc94`  
**مصدر الحقيقة:** Claude TASK-001 + فحص Cursor المزدوج

## ماذا تغيّر (حقائق)
1. حذف سطح `onBrowseSection` من `SearchDiscover` Props (كان deprecated ويُمرَّر من المضيف).
2. حذف `browseSection` + تمريره من `app/(tabs)/search.tsx`.
3. حارس CI: `tests/section-miniapp-guard.test.mjs` + سكربت `test:section-guard` ضمن `pnpm test`.

## ماذا لم نلمسه (صدق · لا خلط)
- `exploreOnMap` ما زال يحقن `real_estate` في تاب Search (بند C3 — موجة لاحقة، ليس W1).
- لا تعديل FI / FinancingService / #28.
- لا تعديل بروفايل RTL (W4).
- لا ادعاء أن MiniAppBottomNav × usePreventRemove مُثبت تجريبياً.

## اختبار قبول
- [x] كروت Discover تبقى على `router.push(SECTION_ROUTE…)`
- [x] لا جسر host يصفّي الكاتالوج داخل تاب Search من Discover
- [x] `node --test tests/section-miniapp-guard.test.mjs` أخضر
- [ ] CI أخضر على PR

— Cursor
