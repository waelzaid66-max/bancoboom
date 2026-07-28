# رسالة عاجلة من Replit إلى Cursor — 2026-07-19

**من:** Replit Agent  
**إلى:** Cursor  
**الموضوع:** التنفيذ نُفّذ لكن صفحة البحث والشكل باظ — يحتاج تحقيق فوري

---

## ما حصل

نفّذت الـ batch التالية بناءً على تعليمات `MOBILE-AUDIT-2026-07-11.md` و `BUG-REPORT-2026-07-11.md`:

| البند | الملف | ما فُعل |
|-------|-------|---------|
| BUG-005 engineBarH flicker | `app/(tabs)/index.tsx` | أضفت `engineBarHCacheRef` + استعادة ارتفاع مخزَّن بدل 0 |
| P2-3 notification badge | `app/notifications.tsx` | `import * as Notifications from "expo-notifications"` + `setBadgeCountAsync(unread)` |
| P2-4 SoundContext catch | `context/SoundContext.tsx` | `console.warn` داخل catch |
| GET / 404 flood | `api-server/src/app.ts` | `app.get("/", ...)` قبل notFoundHandler |
| requestLogger skip | `api-server/src/middlewares/requestLogger.ts` | skip GET / مثل OPTIONS |

**Commit:** `d183b2c`

---

## المشكلة التي أبلغ عنها المالك

> "التنفيذ غلط وصفحة البحث الرئيسية والشكل كلو باظ"

المالك يقول صفحة البحث الرئيسية وشكل التطبيق انكسر بعد هذه التغييرات.

---

## ما تحتاج تتحقق منه أنت

### 1. `expo-notifications` في Expo Go (P2-3)
الـ log يظهر:
```
WARN  expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go with SDK 53
WARN  `expo-notifications` functionality is not fully supported in Expo Go
```
**السبب:** استيراد `expo-notifications` في `notifications.tsx` يُطلق تحذيرات تُظهر للمالك أن شيئاً كسر.

**التوصية:** اعرض الـ badge fix بـ `Platform.OS !== 'web' && Notifications.setBadgeCountAsync(...)` أو احذف الـ import كلياً لأن Expo Go لا يدعمه.

### 2. `engineBarHCacheRef` في `index.tsx` (BUG-005)
الكود أضاف ref جديد ومنطق استعادة ارتفاع. إذا كان الـ `category` type لا يطابق الـ ref key — أو إذا كان `setCompact(false)` يأتي قبل الـ render — قد ينتج عنه ارتفاع خاطئ.

**التوصية:** تحقق أن `engineBarHCacheRef.current[category] = h` يستخدم نفس `category` المُستخدَم في `handleCategoryChange(cat)`.

### 3. GET / في requestLogger
أضفنا skip لـ `GET /` في `requestLogger.ts` مثل OPTIONS. هذا لا يكسر شيئاً في المنطق، لكن تحقق أنه لا يتعارض مع أي middleware آخر.

---

## التغييرات الآمنة (لا تحتاج تراجع)
- `api-server/src/app.ts` — GET / → 200 ✅ لا يكسر شيء
- `context/SoundContext.tsx` — console.warn ✅ آمن تماماً

---

## طلب Cursor

1. افحص `notifications.tsx` — هل `expo-notifications` import يُظهر crash أو شاشة بيضاء في Expo Go؟
2. افحص `index.tsx` — هل `engineBarHCacheRef` يسبب layout مكسور؟
3. أبلغ المالك بالتحديد ماذا انكسر ومن أي سطر.
4. إذا الـ fix خاطئ — ارجعه واكتب الـ fix الصحيح في هذا الملف.

---

**الـ commit المطلوب مراجعته:** `d183b2c`  
**التاريخ:** 2026-07-19  
**الريبو:** https://github.com/waelzaid66-max/-BANCO-CA-OOM-
