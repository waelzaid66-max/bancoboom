# ⛔ مُلغى كأمر تشغيل — اذهب إلى `REPLIT-RUN-FULL-NOW-AR.md`

# لصق لـ Replit الآن — إثبات بالشاشات بعد التحديث (دقة قصوى)

**من:** Cursor  
**إلى:** Replit Agent / Canvas Expo  
**أهمية:** برنامج BANCO دولي — سيُسلَّم لشركة كبيرة وملايين مستخدمين. كل حرف في هذه التعليمات إلزامي. لا اختصار. لا «شكله تمام» بدون شوت.

---

## 0) افهم المهمة بجملة واحدة

اسحب الفرع الصحيح → شغّل Expo → صوّر بالترتيب أدناه → أرسل الشوتات + `git rev-parse --short HEAD`.  
Cursor يصلح الكود؛ أنت تثبت أن المعاينة تطابق الكود. Copilot يمسح الريبو عن عيوب أخرى.

---

## 1) سحب الكود (لا تعمل على SHA قديم)

```bash
git fetch origin
git checkout cursor/discover-enter-fix-4322
git pull origin cursor/discover-enter-fix-4322
git rev-parse --short HEAD
git log -1 --oneline
```

بعد دمج الـ PR إلى `main`:

```bash
git checkout main
git pull origin main
git rev-parse --short HEAD
```

**شرط القبول:** في اللوج أو الرسالة اكتب الـ SHA حرفياً. أي شوت بدون SHA = مرفوض.

تحقق سريع أن الإصلاح موجود:

```bash
rg -n "sectionPortal|sectionList" artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n 'viewState !== "discover"' "artifacts/banco-mobile/app/(tabs)/search.tsx"
rg -n "SectionBackdrop|styles\\.hero|StaysHomeHeader" artifacts/banco-mobile/components/search/BookingStaysApp.tsx
# expect rose hero; StaysHomeHeader ABSENT
```

ثم **Full Reload** لـ Expo (امسح كاش المعاينة إن ظهر الشكل القديم).

---

## 2) قواعد ذهبية أثناء التصوير

1. لا تعدّل كود الموبايل لإخفاء عيب — بلّغ + صوّر.
2. لا تلمس `artifacts/banco-website` لهذه المهمة.
3. كل شوت: اسم ملف واضح + ماذا يُفترض أن يظهر + هل نجح نعم/لا.
4. إن فشل الدخول للقسم: صوّر قبل الضغط وبعده فوراً (نفس الجلسة).
5. لا ملفقة بيانات — مخزون حقيقي أو فراغ صادق.

---

## 3) مصفوفة الشوتات الإلزامية (بالترتيب)

| # | الاسم | ماذا تفعل | ماذا يجب أن يظهر (نجاح) | فشل = أرسل |
|---|--------|-----------|-------------------------|------------|
| R1 | `discover-home` | افتح تبويب Search بدون كتابة بحث | بوابات **أفقية** (صفوف دخول) للأقسام؛ **لا** شريط All/Cars/RE فوقها؛ **لا** شريط New/Used أو For Sale **بين** البوابات وبطاقة Booking | CategoryTabs أو EngineChips على Discover |
| R2 | `enter-real-estate` | اضغط بوابة العقارات | تنتقل إلى `/section/real-estate` — هيدر القسم + فلاتر القسم داخل الميني-آب | تبقى على Discover مع شريط اختيارات وسط الأيقونات |
| R3 | `enter-cars` | ارجع ثم اضغط السيارات | `/section/car` بنفس منطق الدخول الكامل | ذوبان في Search المشترك |
| R4 | `enter-booking-stay` | Discover → Booking & Stays | هيدر **BOOM STAY أسود قصير** (ليس نصف الشاشة) + بحث + تبويبات نوع + نتائج تحتها | هيدر يأكل نصف الشاشة أو عدم دخول |
| R5 | `discover-no-filter-btn` | على Discover انظر يمين البحث | **لا** زر فلتر (sliders) بجانب البحث | زر فلتر ظاهر على Discover |
| R6 | `section-back` | من داخل قسم اضغط رجوع | تعود لـ Discover النظيف (R1) | كروم مختلط |

---

## 4) رسالة الإثبات التي ترجعها لـ Cursor (انسخ القالب)

```
SHA: ________
الفرع: ________
Expo: OK / FAIL

R1 discover-home: PASS/FAIL — مرفق
R2 enter-real-estate: PASS/FAIL — مرفق
R3 enter-cars: PASS/FAIL — مرفق
R4 enter-booking-stay: PASS/FAIL — مرفق
R5 discover-no-filter-btn: PASS/FAIL — مرفق
R6 section-back: PASS/FAIL — مرفق

ملاحظات حرفية (إن وجد عيب):
- الملف المتوقع / العرض الفعلي:
```

---

## 5) ممنوع / مسموح

**ممنوع:** دمج عشوائي، تعديل website، إعادة تصميم من رأسك، تجاهل SHA، شوت واحد فقط.

**مسموح:** سحب الفرع، تشغيل Expo، شوتات، تقرير عيوب بصري، إعادة Full Reload.

---

## 6) مرجع التحليل

اقرأ إن احتجت: `audit/handoff/OWNER-SCREENSHOT-FORENSIC-DISCOVER-ENTER-AR.md`
