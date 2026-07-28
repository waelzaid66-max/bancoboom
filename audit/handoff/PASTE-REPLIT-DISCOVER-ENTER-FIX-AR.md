# ⛔ مُلغى — ENTER redesign مرفوض · اذهب إلى `REPLIT-RUN-FULL-NOW-AR.md`

# Replit — اسحب إصلاح دخول الأقسام الآن

## الهدف
معاينة Expo يجب أن تطابق التقسيم الصحيح: Discover = بوابات دخول، الفلاتر داخل الميني-آب فقط، هيدر Stay قصير.

## أوامر

```bash
git fetch origin
git checkout cursor/discover-enter-fix-4322
git pull origin cursor/discover-enter-fix-4322
# أو بعد الدمج إلى main:
# git checkout main && git pull origin main
```

تحقق:

```bash
git rev-parse --short HEAD
rg -n "sectionPortal|sectionList" artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n "viewState !== \"discover\"" artifacts/banco-mobile/app/\(tabs\)/search.tsx
```

ثم أعد تشغيل Expo (أعد تحميل كامل / امسح كاش المعاينة إن لزم).

## شوتات مطلوبة بالترتيب

1. **S013 Discover** — بوابات أفقية، بلا CategoryTabs فوقها، بلا شريط فلاتر بين البوابات و Booking.
2. ضغط **عقارات** → شاشة `/section/real-estate` بهيدر القسم + شريط فلاتر القسم فقط.
3. رجوع → ضغط **Booking & Stays** → هيدر BOOM STAY أسود **قصير** + نتائج تحتها.
4. ضغط **سيارات** → `/section/car` بنفس منطق الدخول.

## إن ظهر الشكل القديم
المعاينة على SHA قديم — لا تغيّر كود عشوائي؛ أعد السحب وأعد التحميل.
