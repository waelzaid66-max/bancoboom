# أمر دخول Replit — اتبع Cursor الآن (الصق حرفياً)

**من:** Cursor · **إلى:** وكيل Replit (الوكيل الأساسي على الجهاز)  
**المالك أمر:** ادخل · اتبع Cursor · استلم كل التحديثات · صيانة قوية · Expo + ويب جنباً إلى جنب · شوتات · نشر حقيقي

---

## الصق هذا لـ Replit Agent الآن

```text
أنت وكيل Replit الأساسي لـ BANCO. Cursor يقود الجودة والصيانة على GitHub.
اتبع Cursor. لا تعِد بناء المنتج. لا تمسح ميزات. Additive only.

═══ 1) اسحب أقوى نسخة مستقرة على main ═══
git fetch origin main
git checkout main
git pull origin main
# يجب أن ترى SHA = 58ddddc (أو أحدث بعد دمج W1+#33+#34)
git rev-parse HEAD
git log -3 --oneline

═══ 2) اقرأ التغذية الكاملة (إلزامي) ═══
audit/handoff/REPLIT-FULL-FEED-UPDATES-PROBLEMS-AR.md
audit/handoff/REPLIT-STABLE-EXPO-WEBSITE-RUNBOOK-AR.md
audit/handoff/MAINTENANCE-GOALS-TOTAL-AR.md
audit/handoff/CURSOR-RECEIPT-CLAUDE-TOTAL-FACTS-AR.md
audit/handoff/CLAUDE-NO-EXCUSES-BROKEN-SECTIONS-AR.md
release/PROJECT_CONTEXT.md

═══ 3) ثبّت البيئة ═══
pnpm install --frozen-lockfile
# schema additive إن لزم:
pnpm --filter @workspace/db run push-force
# seeds idempotent إن DB فارغة/قديمة — انظر REPLIT runbook

═══ 4) شغّل API + موبايل Expo + الويب معاً ═══
# API (workflow المعتاد على Replit أو):
pnpm --filter @workspace/api-server run dev
# Website جنب الصفحات (منفذ 3000):
pnpm --filter @workspace/banco-website run dev
# Mobile Expo — workflow Replit / npx expo start حسب إعداد المشروع
# تأكد أن الموبايل يشير لـ API الحي على نفس الـ deployment

═══ 5) افحص وأرسل تقريراً + شوتات ═══
أنشئ وادفع على فرع replit/w0-stable-verify-4322 أو علّق على PR #31:

audit/handoff/REPLIT-VERIFY-REPORT-AR.md

يجب أن يتضمن:
- SHA الفعلي على Replit
- GET /healthz → 200
- لقطات Expo: Discover→سيارات · Discover→عقارات · Profile (nudge) · Banks · Search
- لقطات Website: الصفحة الرئيسية + قسم/ماركت ظاهر جنب الموبايل
- أي فرق عن GitHub main
- قائمة أعطال ظاهرة (ملف:سطر إن قدرت)

═══ 6) قواعد ═══
- ممنوع Start W3 / FinancingService أمان قبل أمر المالك
- ممنوع مسح بيانات أو DROP
- المشاكل P0 المتبقية للموبايل موثّقة (MOB-01 هاتف edit → Copilot)
- #28 FI P0 لم يُدمج بعد — لا تلوم الكود إن CTA بنك ما زال ناقصاً على main
- كل تواصل مع Cursor = commit+push أو تعليق PR #31 (شات Replit وحده لا يصل)

أول سطر في تقريرك:
«Replit online · HEAD=<sha> · اتبع Cursor · Expo+Website شغّال · أرفع شوتات»
```

---

## للمالك — نفّذ أنت أيضاً إن الوكيل لم يسحب

على Replit Shell:

```bash
git fetch origin main && git checkout main && git pull origin main
git rev-parse HEAD   # توقّع 58ddddc
```

ثم Reload workflows + افتح Expo + `banco-website` على :3000.

— Cursor
