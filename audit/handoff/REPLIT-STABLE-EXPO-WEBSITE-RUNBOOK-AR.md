# Runbook Replit — نسخة مستقرة · Expo كامل · Website جنب الصفحات · نشر

**هدف المالك:** يشوف كل حاجة — موبايل على Expo + ويب مفروش جنب الصفحات + صيانة ثم رفع/نشر حقيقي.

**SHA المستقر:** `58ddddc` على `origin/main`

---

## أ) سحب وتثبيت (مرة بعد الدمجات)

```bash
cd ~/workspace   # أو مسار مشروع BANCO على Replit
git fetch origin main
git checkout main
git pull origin main
git rev-parse HEAD
# توقّع: 58ddddc…

pnpm install --frozen-lockfile
```

### قاعدة بيانات (additive — إن لزم)

```bash
pnpm --filter @workspace/db run push-force
# إن كانت فارغة أو ناقصة مرجع:
pnpm --filter @workspace/api-server run seed
pnpm --filter @workspace/api-server run seed:reference
pnpm --filter @workspace/api-server run seed:car-brands
pnpm --filter @workspace/api-server run seed:car-models
```

أسرار Replit (موجودة مسبقاً غالباً): `DATABASE_URL` · Clerk · `OPENAI_API_KEY` · Resend · Paymob · Object Storage — انظر `release/REPLIT_HANDOFF.md` و `release/PROJECT_CONTEXT.md`.

---

## ب) تشغيل ثلاثة أسطح معاً (المطلوب الآن)

### 1) API
Workflow Replit المعتاد **أو**:

```bash
pnpm --filter @workspace/api-server run dev
```

تحقق:

```bash
curl -sS "$API_BASE/healthz" || curl -sS http://127.0.0.1:$PORT/healthz
# 200
```

### 2) Website — `banco-website` (جنب الصفحات)

```bash
pnpm --filter @workspace/banco-website run dev
# Next يستمع 0.0.0.0:3000
```

افتح رابط Replit للمنفذ 3000 بجانب Expo.  
**ميثاق:** الويب لا يعدّل منطق الموبايل؛ للعرض والتوافق البصري/الرحلات.

### 3) Mobile Expo

- شغّل workflow Expo / Metro الخاص بالمشروع.  
- تأكد `EXPO_PUBLIC_API_URL` (أو المكافئ في المشروع) يشير لـ API على Replit الحي — ليس localhost من جهاز خارجي بدون نفق.  
- افتح على جهاز/محاكي عبر رابط `*.expo.worf.replit.dev` أو Expo Go حسب إعدادكم.

---

## ج) جولة شوتات إلزامية (ارفع الملفات أو روابط في التقرير)

| # | أين | ماذا تصوّر |
|---|-----|------------|
| S1 | Expo Discover | أقسام ظاهرة |
| S2 | Expo | ضغطة سيارات → mini-app قسم (ليس ذوبان Search) |
| S3 | Expo | ضغطة عقارات/إقامات → قسم معزول |
| S4 | Expo Profile | بطاقة إكمال إن ناقصة · غلاف أزرار في العربية (RTL) |
| S5 | Expo Banks | hub + إن عضو inbox |
| S6 | Expo Search | نتائج بدون خلط قسم |
| S7 | Website :3000 | هوم + تنقّل قسم/ماركت |
| S8 | Website | صفحة بجانب نفس الرحلة تقريباً للموبايل |

احفظ تحت مثلاً: `audit/handoff/replit-shots/` أو ارفع على PR #31 كتعليق.

---

## د) اختبارات سريعة على Replit بعد السحب

```bash
pnpm --filter @workspace/banco-mobile run test:section-guard
pnpm --filter @workspace/banco-mobile run test:icons
# إن توفر الوقت:
pnpm run typecheck
pnpm --filter @workspace/api-server test
```

---

## هـ) مسار النشر الحقيقي (مع Cursor — لا تتخطَّ)

1. **الآن:** ثبات على `58ddddc` + شوتات + تقرير verify.  
2. **بعد موافقة Owner:** مناقشة دمج #28 (FI P0) ثم سحب جديد.  
3. **W3 أمان FI:** فقط بعد جملة Start من المالك.  
4. **إنتاج GCP/EAS:**  
   - `release/PRIMARY_AGENT_HANDOFF.md`  
   - `release/BANCOOOM_DEPLOY_AR.md`  
   - `deploy/gcp/reports/00-README.md` + Go/No-Go  
   - EAS: `release/EAS_BUILD.md`  
5. لا تستخدم `deploy` إنتاجي كتجربة — ثبّت staging/Replit أولاً.

---

## و) أعطال متوقعة على الشاشة (ليست بالضرورة رجوع سحب)

| عرض | السبب الحقيقي |
|-----|----------------|
| لا بطاقة «أكمل الملف» | البروفايل مكتمل أصلاً |
| شريحة هاتف لا تضيف هاتف | **MOB-01** معروف — Copilot يصلحه |
| بنك Join يوصل onboarding عام | #28 غير مدمج |
| ويب فارغ | API/ENV للويب غير مربوط — افحص Clerk/API URL للـNext |

— Cursor
