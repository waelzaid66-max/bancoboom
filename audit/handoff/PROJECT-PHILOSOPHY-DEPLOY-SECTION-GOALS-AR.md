# فلسفة المشروع · أوامر النشر · أهداف نجاح كل قسم

**مصدر الحقيقة (اقرأ قبل أي تحسين):**  
`release/PROJECT_CONTEXT.md` · `release/PRIMARY_AGENT_HANDOFF.md` · `audit/handoff/JOINT-ARCHITECTURE-EXECUTION-PLAN-AR.md` · `CAPABILITY-SPLIT-AND-HONESTY-PROTOCOL-AR.md`

---

## 1) الفلسفة (Adaptive Marketplace — لا تُخالَف)

من `PROJECT_CONTEXT.md`:

1. **Never block trade** — النشر لا يفشل بقسوة؛ تدهور لطيف.  
2. **Tiny floor** — أقل حقول إلزامية.  
3. **Save all specs** — مواصفات حرة في jsonb.  
4. **Publish then learn** — قبول المجهول ثم التعلّم بعد المراجعة.  
5. **No fabricated data — EVER** — لا أرقام/إحداثيات/شعارات مختلقة.

### قواعد صلبة (انحراف = ضرر)

- Additive only — لا rebuild واسع · لا DROP · لا مسح ملفات/بيانات.  
- لا تغيّر منطق أعمال أو APIs عامة إلا لإصلاح عيب مثبت.  
- i18n: كل مفتاح en+ar؛ RTL منطقي (`start`/`end`) لا `left`/`right` الفيزيائي.  
- أيقونات عبر `@/components/icons` (SVG) — **ليس** `@expo/vector-icons` على أندرويد.  
- الشعار/تصميم التبويب «B» لا يُعبث به.  
- عند الشك: **اسأل المالك** — لا تخمين منتجي.

### هدف الإطلاق

استقرار إنتاج Android · iOS · Web. المتبقي غالباً إعداد بيئة/لوحات (Clerk, Resend, Paymob, EAS) لا إعادة كتابة المنتج.

---

## 2) أوامر النشر والثقة (ملخّص تنفيذي)

من `PRIMARY_AGENT_HANDOFF.md` + دستور المشروع:

```bash
git fetch origin main && git checkout main && git pull origin main
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run confidence
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/banco-mobile run test:icons
pnpm --filter @workspace/banco-mobile run test:lib
pnpm --filter @workspace/banco-mobile run test:resilience
# بعد W1 (#32):
pnpm --filter @workspace/banco-mobile run test:section-guard
```

- **GCP:** `deploy/gcp/reports/00-README.md` → Go/No-Go · Secrets · Cloud Build.  
- **aws-virgen:** مزامنة من الأساسي بعد CI أخضر — لا SHA قديم.  
- **Agent mode:** عزل cloud agents عن نشر الإنتاج (`npx convex deploy` ممنوع في التطوير إن وُجد Convex؛ هنا API Express — لا تستخدم deploy إنتاجي للتجربة).

---

## 3) أهداف نجاح كل قسم (قبول واقعي)

| قسم | نجاح = | فشل = |
|-----|--------|-------|
| **Discover** | بطاقات الأقسام → `SECTION_ROUTE` mini-app؛ لا تذويب كتالوج في Search | `onBrowseSection` / حقن criteria مشتركة |
| **Search** | فلاتر Search تخص نتائج Search فقط؛ CategoryTabs عند البحث النشط | تبويبات فئة تخلط Discover |
| **Profile** | nudge الإكمال يفتح مساراً يصلح الإشارة الناقصة (صورة/bio/**هاتف**) | شريحة هاتف → مودال بلا هاتف (**MOB-01**) |
| **Banks / FI** | join حقيقي · inbox للأعضاء · لا ادّعاء «شركاء موثّقين» بلا بيانات | PRODUCTS ميتة + copy مضلّل |
| **Cars / RE / Industrial / Stay** | قفل فئة · رجوع آمن · بيانات حقيقية أو فارغ صادق | اختلاق قوائم · ذوبان فلاتر |
| **Legal** | محتوى قانوني بلغتي المنتج | إنجليزي فقط على واجهة عربية |
| **Auth / API** | AuthZ داخل كل مسار حسّاس · لا قفز حالة FI | PATCH وكيل بلا تحقق (#28/W3 لاحقاً) |
| **Mobile icons** | SVG shim فقط | خطوط أيقونات → tofu أندرويد |
| **Scale «ملايين»** | لبنات موجودة؛ **غير مثبت حمل** بعد — صدق في التقارير | ادّعاء إثبات حمل بلا قياس |

---

## 4) تقسيم القدرة (تذكير ملزم)

| Cursor | Claude | Owner |
|--------|--------|-------|
| عزل أقسام W1 · جودة UI صدق · MOB-04/05… بعد البوابات | W3 FI بعد أمر Start W3 · TASK-002/003 الآن | موافقات · أسرار · سحب Replit |

— Cursor
