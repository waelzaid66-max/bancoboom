# ⛔ مُلغى كأمر تشغيل — اذهب إلى `REPLIT-RUN-FULL-NOW-AR.md`

# Replit — مزامنة النسخة الصحيحة (Exact Branch Tip + Code Floor)

**من:** Cursor · قائد الجودة التقنية  
**هدف:** تشغيل Expo على بايتات `origin/cursor/discover-enter-fix-4322` كما هي على GitHub — لا كاش، لا فرع خاطئ، لا «تقريباً».

## مصدر الحقيقة (لا تفاوض)

| عنصر | قيمة |
|------|------|
| Remote | `origin` |
| Branch | `cursor/discover-enter-fix-4322` |
| PR | https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37 |
| **أمر المزامنة** | `git reset --hard origin/cursor/discover-enter-fix-4322` |
| **Tip منشور عند كتابة البروتوكول** | `53b47b085da83e719bf3e7957e6b5147d4a1f907` (`53b47b0`) |
| **Code floor (كود الموبايل المعتمد)** | `6b3c1d1c7ef5dda545f92dd0425de60d83529fc4` (`6b3c1d1`) |
| رسالة الـ floor | `fix(mobile): harden MOB-07 map latch, RTL chrome, section guards` |
| **قناة حية Replit↔Cursor** | `PASTE-REPLIT-LIVE-CHANNEL-CURSOR-AR.md` |

**تعريف النسخة الصحيحة:** أي `HEAD` على هذا الفرع بعد `fetch` + `reset --hard`، بشرط:

```text
git merge-base --is-ancestor 6b3c1d1c7ef5dda545f92dd0425de60d83529fc4 HEAD   # exit 0
```

الكوميتات فوق الـ floor مسموحة فقط إذا كانت docs/handoff على نفس الفرع. **ممنوع** معاينة على SHA أقدم من `6b3c1d1`.

---

## 0) قواعد حديدية

1. معاينة بدون `reset --hard` إلى `origin/…` = **باطلة**.  
2. `HEAD` لا يحتوي `6b3c1d1` كسلف = **باطلة**.  
3. ممنوع تعديل كود التطبيق لإخفاء عيب.  
4. ممنوع لمس `artifacts/banco-website`.  
5. NO-WIPE.  
6. بعد المزامنة: `npx expo start --clear`.

---

## 1) مزامنة قسرية — انسخ ونفّذ

```bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git fetch origin
git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322

SYNC_SHA="$(git rev-parse HEAD)"
SYNC_SHORT="$(git rev-parse --short HEAD)"
echo "SYNC_SHA=$SYNC_SHA"
echo "SHORT=$SYNC_SHORT"
git log -1 --oneline

git merge-base --is-ancestor 6b3c1d1c7ef5dda545f92dd0425de60d83529fc4 HEAD
echo "CODE_FLOOR_OK=yes"

# رفض صريح إذا الفرع خلف الـ floor (لا يجب أن يحدث بعد reset صحيح):
git merge-base --is-ancestor 6b3c1d1c7ef5dda545f92dd0425de60d83529fc4 HEAD \
  || { echo "CODE_FLOOR_OK=NO — STOP"; exit 1; }
```

الصق `SYNC_SHA` / `SHORT` / `git log -1` في الرد. لا تصوّر قبل نجاح هذا القسم.

---

## 2) بصمات ملفات (finish pack)

```bash
rg -n "sectionPortal|sectionList" artifacts/banco-mobile/components/SearchDiscover.tsx
rg -n 'router\.push\("/section/real-estate\?map=1"\)' "artifacts/banco-mobile/app/(tabs)/search.tsx"
rg -n "Array\.isArray\(\s*params\.map\s*\)" artifacts/banco-mobile/components/search/SectionSearchApp.tsx
rg -n "SectionBackdrop|styles\\.hero|StaysHomeHeader" artifacts/banco-mobile/components/search/BookingStaysApp.tsx
# expect SectionBackdrop + hero; StaysHomeHeader must be ABSENT
rg -n '"key":\s*Key' artifacts/banco-mobile/components/icons.tsx
rg -n '"business":\s*Building2' artifacts/banco-mobile/components/icons.tsx

cd artifacts/banco-mobile && node --test tests/section-miniapp-guard.test.mjs
# المتوقع: 25/25 pass
```

---

## 3) Expo نظيف

```bash
cd artifacts/banco-mobile
npx expo start --clear
```

أو Replit: **Stop → Run** + مسح Metro cache.

---

## 4) إثبات بصري P01…P13

الملفات:

- `audit/handoff/PASTE-PRODUCTION-MOBILE-REPLIT-COPILOT-AR.md`
- `audit/handoff/PASTE-FINAL-MAINTENANCE-REPLIT-COPILOT-AR.md`

قالب الرد:

```
SYNC_SHA: <خرج git rev-parse HEAD بعد reset>
SHORT: <قصير>
CODE_FLOOR: 6b3c1d1 ANCESTOR_OK
GUARD: 25/25 PASS|FAIL
EXPO: OK|FAIL
COPILOT: IGNORED (UNTRUSTED)

P01…P13: PASS/FAIL + مرفق
انحرافات حرفية:
```

---

## 5) بعد الأخضر (مالك / Cursor)

| # | إجراء |
|---|--------|
| 1 | دمج PR #37 → `main` |
| 2 | Replit: `reset --hard origin/main` + `CODE_FLOOR` يصبح merge SHA الجديد |
| 3 | مراجعة #28 FI P0 — بدون W3 |
| 4 | W3 فقط بجملة Start صريحة |

— Cursor · Exact sync (tip + code floor `6b3c1d1`)
