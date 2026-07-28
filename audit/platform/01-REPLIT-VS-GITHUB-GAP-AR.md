# تقرير 01 — فجوة GitHub ↔ Replit (ما اشتغل ولم يُرفَع)

**النوع:** فحص تشغيل فقط  
**قاعدة:** Replit يستورد من `-BANCO-CA-OOM-` · المصدر = `origin/main`

---

## 1) ثلاث طبقات مختلفة — لا تخلطها

| الطبقة | السؤال | إن كانت «لا» فالمشكلة |
|--------|--------|------------------------|
| A — مدمج على `main`؟ | هل الـ PR merged؟ | الكود غير موجود أصلاً للسحب |
| B — مسحوب على Replit؟ | هل `git pull` تم؟ | الجهاز يرى SHA قديم |
| C — معادات نشر العملية؟ | Stop/Run api + Expo؟ | كود جديد على القرص لكن runtime قديم |

---

## 2) حالة PRs الآن (2026-07-19)

### على `main` (جاهز للسحب على Replit)

| دمج | المحتوى | أثر الموبايل الحي |
|-----|---------|-------------------|
| #25 | استعادة Discover → `/section/*` | **حاسم** — بدونها الذوبان يعود على الجهاز |
| #11–#26 website | مشروع ويب مستقل | لا يغيّر Expo مباشرة |
| Claude FI commits التاريخية | inbox API/UI على main | يحتاج ربط أدمن ليعمل بالكامل |

### مفتوح — **ليس** على main → لن يصل Replit بـ pull main

| PR | النوع | هل يحتاج رفع لـ Replit؟ |
|----|-------|-------------------------|
| #28 FI P0 | كود استكمال | **نعم بعد الدمج** |
| #23 Boom Stay header | شكل | اختياري بعد الدمج |
| #27/#29/#24 | docs | لا |

---

## 3) لماذا تقول «اشتغل بس مترفعش»؟

سيناريوهات شائعة وصحيحة:

1. **Cursor/GitHub أخضر · Replit قديم** → لم يُنفَّذ pull بعد #25  
2. **فرع مفتوح (#28/#23) يشتغل في CI** → صحيح أنه «اشتغل» و«مترفعش» لأن الدمج لم يحدث  
3. **API FRESH على الكود · schema STALE** → pull بدون `push-force`/migrate (انظر تقارير wave 8 social_links)  
4. **Expo Go كاش** → يحتاج reload بعد pull  

---

## 4) Checklist مالك Replit (تجهيز)

```bash
# 1) مزامنة الكود
git fetch origin
git checkout main
git pull --ff-only origin main
git log -1 --oneline   # يجب أن يطابق تقريباً origin/main

# 2) اعتماديات + سكيمة عند الحاجة
pnpm install --frozen-lockfile
# إن لزم schema:
# pnpm --filter @workspace/db run push-force

# 3) إعادة تشغيل
# UI: Stop → Run  api-server
# Expo: أعد تشغيل الـ workflow / اعمل Reload

# 4) تحقق سريع
curl -sS https://banco-ca-oom.replit.app/api/healthz
# على الجهاز: Discover → كرت عقارات يجب أن يفتح /section/real-estate (ميني-آب) لا يبدّل CategoryTabs فقط
```

أو: `bash audit/mobile/REPLIT-SHELL-COPYPASTE.sh`

---

## 5) ما الذي تختبره بعد الرفع لإثبات أن الفصل رجع؟

| خطوة | النتيجة المتوقعة |
|------|-------------------|
| Discover → Cars | شاشة ميني-آب بدون شريط All/Cars/RE للتبديل الحر |
| Discover → Real Estate | نفس العزل |
| Discover → Booking | BOOM STAY / BookingStaysApp |
| تبويب Search السفلي | ما زال محركاً عاماً (هذا ليس فشلاً إن كان مقصوداً) |

إن رأيت CategoryTabs بعد الضغط على كرت Discover → **إمّا Replit خلف main، أو انحدار جديد.**

---

## 6) علاقة الأيقونات SVG بالرفع

سياسة SVG موجودة على `main` منذ إصلاح tofu.  
إن رأيت □ على أندرويد بعد pull حديث → غالباً build قديم أو مسار أيقونة خارج `@/components/icons` (يجب الإبلاغ كـ regression صيانة).
