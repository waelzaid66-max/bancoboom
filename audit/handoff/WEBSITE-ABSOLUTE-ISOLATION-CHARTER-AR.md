# ميثاق عزل الويب التام — غير قابل للتفاوض

**أمر المالك:** الويب بشرط العزل التام.  
**ينفّذ على:** Replit · Copilot · Cursor · أي وكيل لاحق.

---

## الأسطح

| سطح | المسار | مسموح |
|-----|--------|--------|
| **Website** | `artifacts/banco-website` فقط | ميزات ويب جديدة هنا |
| **Mobile** | `artifacts/banco-mobile` | موبايل فقط — لا «نسخ شكل التطبيق» إلى الويب |
| **Frozen** | `artifacts/banco-web` | **مجمّد** — لا توسعة |
| **Shared** | `lib/*` فقط (api-client · search-contract · taxonomy · design-tokens) | عقود مشتركة |

المرجع الأصلي: `artifacts/banco-website/README.md` Charter.

---

## محظورات مطلقة

1. **ممنوع** تعديل `banco-mobile` لجعل الويب يشبه شِل التطبيق.  
2. **ممنوع** `import` من `banco-mobile` أو `dealer-os` أو `admin-os` داخل الويب.  
3. **ممنوع** إعادة بناء ميني-آبس الأقسام `/section/*` كواجهة وهمية على الويب.  
4. **ممنوع** خلط فلاتر الموبايل Discover/Search داخل `banco-website`.  
5. **ممنوع** لمس `FinancingService` / Banks inbox من مهام عرض الويب.  
6. عند عرض الويب جنب Expo على Replit: **تشغيل متوازٍ فقط** — لا دمج كود.

---

## مسموح لـ Replit في موجة العرض

```bash
pnpm --filter @workspace/banco-website run dev   # :3000
# جنب Expo — شوتات مقارنة رحلة، بلا تعديل موبايل من أجل الويب
```

إن احتاج الويب API URL / Clerk: عبر env للويب فقط — لا تغيّر عقود الموبايل.

---

## بوابة PR (أي تغيير ويب)

- [ ] الملفات تحت `artifacts/banco-website/**` أو `lib/**` المشتركة فقط  
- [ ] صفر ملفات تحت `artifacts/banco-mobile/**` في نفس PR إلا إن المهمة موبايل صريحة ومنفصلة  
- [ ] لا يستورد من الموبايل  

**انتهاك الميثاق = رفض الدمج فوراً.**

— Cursor
