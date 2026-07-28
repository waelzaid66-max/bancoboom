# المسار الذهبي — تشغيل Replit فقط (Cursor يملك الإنتاج)

**اقرأ أيضاً:** `audit/handoff/ROLES-CURSOR-VS-REPLIT-AR.md`  
**قرار المالك:** Replit منفّذ (جمع · تشغيل · نشر معاينة · شوتات · تحقيقات مرئية).  
**Cursor** مسؤول تسليم البرودكشن: كود · مراجعة · تيست · دقة عالمية.

| | |
|--|--|
| PR للرد | https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37 |
| Branch | `cursor/discover-enter-fix-4322` |
| أمر النسخة | `git reset --hard origin/cursor/discover-enter-fix-4322` |
| Code floor | `6b3c1d1` سلف إلزامي لـ `HEAD` |
| Copilot | UNTRUSTED |
| **تعديل كود من Replit** | **ممنوع منعاً باتاً** |

---

## ما يفعله Replit فقط

### 1) سحب النسخة التي جهّزها Cursor

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git fetch origin
git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322
echo "SYNC_SHA=$(git rev-parse HEAD)"
git log -1 --oneline
git merge-base --is-ancestor 6b3c1d1c7ef5dda545f92dd0425de60d83529fc4 HEAD
```

### 2) تشغيل الحارس (قراءة نتيجة — لا تعديل اختبارات)

```bash
cd artifacts/banco-mobile
node --test tests/section-miniapp-guard.test.mjs
# الصق: PASS count (المتوقع 26/26) أو الفشل حرفياً
```

### 3) تشغيل Expo ونشر المعاينة

```bash
npx expo start --clear
```

### 4) شوتات P01…P13 + ما تراه العين

جدول P في `PASTE-REPLIT-LIVE-CHANNEL-CURSOR-AR.md`.  
كل شاشة مكسورة = FAIL + شوت + وصف ما تراه — **بدون محاولة إصلاح**.

### 5) تحقيقات تشغيل (ما تلاحظه فقط)

- لصق 80–120 سطر Metro بعد reload  
- هل التطبيق فتح؟ هل API يبدو ميتاً؟  
- بطء واضح؟ تقطيع؟ شاشة بيضاء؟  
- ضجيج تحذيرات متكرر (انسخ نص التحذير)

### 6) رد على PR #37 ثم توقّف

```text
## REPLIT → CURSOR (RUNTIME ONLY — NO CODE)

SYNC_SHA: …
GUARD: 26/26 PASS|FAIL (+ لصق الفشل إن وُجد)
EXPO: OK|FAIL

P01…P13: PASS/FAIL + شوتات
ما رأيته مكسوراً (وصف فقط — لا إصلاح):
…

LOGS (أخطاء حمراء حرفياً):
…
SPEED / NOISE (ملاحظات عين):
…
ASK CURSOR: (لا شيء إلا إن احتجتم أمر تشغيل أوضح)
```

---

## ممنوع على Replit

- `git commit` / `git push` لأي كود تطبيقي  
- تعديل ملفات تحت `artifacts/` أو `lib/` أو `.github/`  
- «إصلاح سريع» أو فهم الدومين أو قرارات منتج  
- لمس website / W3 FI / حذف ميزات  
- الاعتماد على Copilot  

إن رأيت باجاً → **بلّغ Cursor بالشوت واللوج فقط.** Cursor يصلح ويختبر ويدفع نسخة جديدة؛ أنتم تعيدون السحب والشوت.

---

## ما يملكه Cursor (ليس Replit)

- كل تاسكات البرودكشن الكبيرة  
- Discover / Stay / MOB-07 / FI / CI / seed / حراس  
- مراجعة الدقة العالمية والتيست  
- قراءة شوتاتكم كأدلة ميدانية ثم الإصلاح هنا  

— Cursor owns production · Replit executes runtime proof only
