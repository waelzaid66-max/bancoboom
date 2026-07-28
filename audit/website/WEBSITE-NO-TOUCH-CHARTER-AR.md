# ميثاق عدم المساس — خط الإنتاج الحالي × مسار الويب

**التاريخ:** 2026-07-18  
**الحالة:** ملزم لكل وكيل / PR لمسار الويب  
**المالك:** Banco Group  

---

## 1. الضمان

مسار **موقع BANCO** يُنفَّذ كـ **جهاز منفصل بفيشة**:

- يستهلك نفس الـ API العامة والهوية البصرية (لوجو / ألوان / أقسام).
- **لا يغيّر** ولا يكسر خط الإنتاج الحي: موبايل · API · ماركت · أدمن · نشر Replit الحالي.
- لو الويب عطل: **يُفصل** (إيقاف CDN / workflow) بدون لمس باقي السطوح.

هذا الميثاق يلغي أي تفسير سابق بأن «الويب معزول = مُهمَل».  
العزل = **حماية للإنتاج**، والمطلوب = **نسخة كاملة** ثم دمج ماركت ككوبي ثم هيدرز ويب.

---

## 2. القائمة السوداء — ممنوع تماماً بدون أمر مالك صريح منفصل

| مسار / سطح | ممنوع |
|------------|--------|
| `artifacts/banco-mobile/**` | أي تعديل |
| `artifacts/api-server/**` | أي تعديل (لا endpoints جديدة من أجل الويب في نفس PR) |
| `artifacts/admin-os/**` | أي تعديل |
| `artifacts/dealer-os/**` | أي تعديل في مرحلة النسخة الكاملة (الدمج لاحقاً كموجة مستقلة) |
| `lib/db/**` | migrations / schema |
| `lib/api-spec/openapi.yaml` | breaking changes؛ أي إضافة optional تحتاج موافقة منفصلة + codegen لكل المستهلكين |
| `.github/workflows/ci.yml` | لا تجعل نجاح الويب شرطاً لـ Mobile/API |
| `deploy/aws/scripts/**` · `deploy/gcp/**` الخاصة بالـ API | لا تغيّر نشر الإنتاج الحالي |
| أسرار / env إنتاج الموبايل أو API | لا تلمس |

**استثناء وحيد:** إصلاح أمني حرج يأمر به المالك كتابةً — خارج مسار «نسخة الويب».

---

## 3. القائمة البيضاء — مسموح لمسار الويب

| مسار | دور |
|------|-----|
| `artifacts/banco-web/**` | سطح Next.js للنسخة الكاملة |
| `artifacts/landing/**` | hub فقط إن لزم توجيه/دمج لاحقاً — بحذر وبدون كسر Replit path |
| `lib/design-tokens/**` | مشاركة هوية بصرية (additive) |
| `lib/search-contract/**` | parity بحث — مع إبقاء اختبارات الموبايل خضراء بدون تعديل ملفات الموبايل |
| `lib/taxonomy/**` | تصنيفات مشتركة (additive فقط) |
| `scripts/website-*.mjs` · `scripts/verify-website-boundaries.mjs` | بوابات الويب |
| `.github/workflows/ci-website.yml` · `ci-website-docker.yml` | CI معزول |
| `deploy/aws/Dockerfile.banco-web` · `docker-compose.banco-web.yml` | نشر ويب منفصل |
| `audit/website/**` | خطط وتقارير |
| `artifacts/banco-web/.env*.example` | قوالب env ويب فقط |

---

## 4. قواعد PR

كل PR لمسار الويب يجب أن يمرّر:

1. `node scripts/verify-website-boundaries.mjs` → PASS  
2. **صفر** ملفات من القائمة السوداء في الـ diff  
3. core `ci.yml` على `main` يبقى غير معتمد على نجاح `ci-website`  
4. قالب الاستقلال: [`WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md`](./WEBSITE-MOBILE-INDEPENDENCE-CHECKLIST.md)  
5. عنوان/وصف يوضح: «website-only — no production surface edits»

---

## 5. نموذج الفيشة (تشغيل)

```
[موبايل EAS] ──┐
[API Replit/AWS/GCP] ──┼── خط إنتاج حي (لا يُمس)
[Admin / Dealer artifacts] ──┘

[banco-web CDN] ──── فيشة اختيارية
   │ فشل build / CDN down → الموبايل والـ API يعملان
   │ إيقاف من edge/flag → بدون redeploy موبايل
```

---

## 6. توقيع

| الدور | الاسم | التاريخ |
|-------|-------|---------|
| مالك المنتج | | |
| وكيل التنفيذ | Cursor Agent (prep) | 2026-07-18 |

**بالعمل على مسار الويب يُعتبَر الوكيل موافقاً على هذا الميثاق.**
