# ⛔ مُلغى كأمر تشغيل — اذهب إلى `REPLIT-RUN-FULL-NOW-AR.md`

# قناة حية — Replit (تشغيل) ↔ Cursor (إنتاج)

**أدوار:** `ROLES-CURSOR-VS-REPLIT-AR.md` · **ذهبي:** `GOLDEN-PATH-REPLIT-CURSOR-AR.md`  
**Cursor** = تسليم برودكشن (كود/مراجعة/تيست).  
**Replit** = سحب · تشغيل · شوت · لوج · ما تراه العين — **ممنوع تعديل كود**.  
**قناة الرد:** تعليقات [PR #37](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37)  
**Copilot:** UNTRUSTED

---

## 0) النسخة الكاملة المعتمدة الآن

| حقل | قيمة |
|-----|------|
| Branch | `cursor/discover-enter-fix-4322` |
| **أمر النسخة** | `git reset --hard origin/cursor/discover-enter-fix-4322` ثم اطبع `git rev-parse HEAD` |
| Code floor (سلف إلزامي) | `6b3c1d1c7ef5dda545f92dd0425de60d83529fc4` |
| حارس | **25/25 PASS** (`section-miniapp-guard`) — rose Stay · لا StaysHomeHeader |
| مسار ذهبي | `GOLDEN-PATH-REPLIT-CURSOR-AR.md` |
| PR | https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37 |

**قاعدة tip:** بعد `fetch`+`reset --hard` اركب ما يطبعه `git rev-parse HEAD` — لا تثبتوا SHA قديم من رسالة سابقة. إن `CODE_FLOOR` ليس سلفاً → توقفوا.

---

## 1) قواعد حديدية

1. **لا تخفِ شيئاً** — كل عيب مرئي/لوج = تبليغ حرفياً.  
2. **ممنوع تعديل أي كود** — لا commit · لا push · لا «إصلاح سريع».  
3. **لا تجميل الشوت** — صوّروا العطل كما هو.  
4. **Website / W3 / NO-WIPE** — لا تلمسوا.  
5. **أنتم لا تعرفون الدومين** — لا تقرروا منتجاً؛ صفوا ما ترونه لـ Cursor.

---

## 2) مرحلة A — تركيب النسخة (قبل أي شوت)

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git fetch origin
git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322

echo "SYNC_SHA=$(git rev-parse HEAD)"
echo "SHORT=$(git rev-parse --short HEAD)"
git log -1 --oneline

git merge-base --is-ancestor 6b3c1d1c7ef5dda545f92dd0425de60d83529fc4 HEAD
echo "CODE_FLOOR_OK=$?"

# بصمات
rg -n "sectionPortal|sectionList" artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n 'category\s*===\s*"real_estate"' artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n 'router\.push\("/section/real-estate\?map=1"\)' "artifacts/banco-mobile/app/(tabs)/search.tsx"
rg -n "SectionBackdrop|styles\\.hero|StaysHomeHeader" artifacts/banco-mobile/components/search/BookingStaysApp.tsx
# expect SectionBackdrop + hero; StaysHomeHeader must be ABSENT
rg -n "Array\.isArray\(\s*params\.map\s*\)" artifacts/banco-mobile/components/search/SectionSearchApp.tsx

cd artifacts/banco-mobile
node --test tests/section-miniapp-guard.test.mjs
# المتوقع: 25/25 pass

# نظّف الضجيج ثم شغّل
npx expo start --clear
```

الصق خرج الأوامر أعلاه في تعليق PR #37 تحت عنوان: `## REPLIT SYNC`.

---

## 3) مرحلة B — إثبات بصري (لا تتخطَّ)

من `PASTE-PRODUCTION-MOBILE-REPLIT-COPILOT-AR.md` + إضافات:

| ID | ماذا تصوّر / تتحقق |
|----|---------------------|
| P01 | Discover: بوابات ENTER أفقية (ليس مربعات فلتر) |
| P02 | ضغط سيارات → `/section/car` (ميني-آب) |
| P03 | عقارات / مصانع / مواد → أقسامها |
| P04 | Booking & Stays → `/section/booking` + هيدر مضغوط |
| P05 | لا CategoryTabs/engines على Discover |
| P06 | Banks: نص صدق (ليست دليل شركاء حي) |
| P07 | Legal إن وُجد في المسار |
| P08 | Stay فلتر داخل الميني-آب فقط |
| P09 | عربي RTL عام |
| P10 | لا انهيار / شاشة بيضاء |
| P11 | Explore on map → عقارات `?map=1` (CTA يظهر فقط إن trending عقاري بإحداثيات) |
| P12 | اقتراحات بحث عربية لا تتداخل مع زر الفلتر + محاذاة نص |
| P13 | Profile شبكة: شارات منطقية تحت RTL |

كل شوت: `PASS|FAIL` + مرفق + `SYNC_SHA`.

---

## 4) مرحلة C — لوجات · ضجيج · توصيلات · سرعة (إلزامي)

انشر في PR تحت `## REPLIT RUNTIME FORENSICS` بدون تلخيص مخادع:

### C1 — Logs
- الصق **آخر 80–120 سطر** من Metro / Expo بعد Full Reload.  
- صنّف كل سطر صاخب: `ERROR` / `WARN` / `Noise(ignore)` / `Actionable`.  
- أي `ERROR` أحمر = سطر كامل + الشاشة التي كنت عليها.

### C2 — Connections
| فحص | كيف | نتيجة |
|-----|-----|--------|
| API base | هل `EXPO_PUBLIC_DOMAIN` مضبوط؟ | OK/FAIL + القيمة المموّهة |
| Clerk | جلسة ضيف / مسجّل | OK/FAIL |
| شبكة طلبات فاشلة | من اللوج أو Network | قائمة URL+status |
| Deep link / section routes | تنقّل الأقسام | OK/FAIL |

### C3 — Speed / jank
| سطح | TTFF تقديري | ملاحظات |
|-----|-------------|---------|
| Discover أول رسم | …ث | |
| دخول قسم سيارات | …ث | |
| Stay هيدر | …ث | |
| Map (إن ظهر CTA) | …ث | |
| أي تقطيع / re-render واضح | نعم/لا | صف أين |

### C4 — Noise budget
- عدّ تحذيرات Metro المتكررة (نفس الرسالة × N).  
- إن > 20 تحذير متكرر لنفس السبب → سجّل كـ `NOISE-P1` مع نص التحذير.

---

## 5) مرحلة D — عيب مرئي (بلّغ فقط — Cursor يصلح)

1. شاشة · خطوات · متوقع · حاصل · شوت  
2. أسطر اللوج الحمراء إن وُجدت  
3. **توقّف — ممنوع تعديل الكود / commit / push**  
4. Cursor يصلح ويختبر ويدفع tip جديد؛ أنتم تعيدون السحب والشوت فقط

---

## 6) قالب الرد (انسخوه)

```text
## REPLIT → CURSOR (RUNTIME ONLY — NO CODE)

SYNC_SHA: …
GUARD: 25/25 PASS|FAIL
EXPO: OK|FAIL

### P01…P13
P01: PASS|FAIL + شوت
…
P13: PASS|FAIL + شوت

### WHAT I SAW BROKEN (description only — no fixes)
- …

### RUNTIME FORENSICS
LOGS: …
CONNECTIONS: …
SPEED: …
NOISE: …

### ASK CURSOR (commands/clarity only)
- …
```

---

## 7) ماذا يفعل Cursor بعد تقريركم

- يمتلك الإصلاح والحراس والتيست والدفع.  
- يعيد نشر tip؛ Replit يعيد التشغيل والشوت فقط.  
- دمج #37 بعد أدلة ميدانية + موافقة المالك.

— Cursor owns production · Replit runtime proof only
