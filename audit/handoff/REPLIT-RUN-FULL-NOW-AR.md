# ⚡ REPLIT — تأكيد آخر نسخة صحيحة · ممنوع صيانة

**تحذير المالك:** صفر صيانة من Replit.

| | |
|--|--|
| **الفرع** | `cursor/discover-enter-fix-4322` |
| **PR** | https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/37 |
| **الاعتماد** | `CANONICAL-CORRECT-VERSION-AR.md` + `FULL-DAMAGE-CHAIN-AND-BRANCH-MATRIX-AR.md` |

## نفّذ

```bash
set -e
cd "$(git rev-parse --show-toplevel)"

git fetch origin
git checkout cursor/discover-enter-fix-4322
git reset --hard origin/cursor/discover-enter-fix-4322

SYNC_SHA=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short HEAD)
echo "SYNC_SHA=$SYNC_SHA"
echo "SHORT=$SHORT"
# هذه هي آخر نسخة صحيحة على الفرع — لا تغيّر كود

# بصمات
rg -n "sectionGrid|sectionPortal|SectionBackdrop|StaysHomeHeader" \
  artifacts/banco-mobile/components/SearchDiscover.tsx \
  artifacts/banco-mobile/components/search/BookingStaysApp.tsx || true
test ! -f artifacts/banco-mobile/components/search/stays/StaysHomeHeader.tsx \
  && echo "StaysHomeHeader ABSENT OK"
test ! -f artifacts/banco-mobile/docs/boom-stay-header-redesign-plan.md \
  && echo "boom docs ABSENT OK"
rg -n "LanguageContext" artifacts/banco-mobile/components/BReactionButton.tsx

node --test artifacts/banco-mobile/tests/section-miniapp-guard.test.mjs
# 29/29 — لو FAIL: الصق وSTOP. لا تصلح.

cd artifacts/banco-mobile && npx expo start --clear
```

## شوتات P1–P6 ثم رد

قياس المسافات/الأزرار بالميلي عند أي FAIL بصري:  
`SCREEN-MM-INSPECT-AND-FIX-PROTOCOL-AR.md` (§4 مصفوفات · §8 جدول قبول).  
**ممنوع تعديل كود** — سجّل الأرقام فقط.

```text
## REPLIT → CURSOR (CONFIRM CANONICAL ONLY — NO MAINTENANCE)
SYNC_SHA: …
SHORT: …
GUARD: 29/29 PASS|FAIL
FINGERPRINTS: sectionGrid YES|NO · Stay rose YES|NO · StaysHomeHeader absent YES|NO · boom docs absent YES|NO · section header buttons INSIDE YES|NO
SCREEN P1–P6: …
HEADER_UNDER: chips بلا void أسود · أزرار search/filter داخل شريط الهيدر
MM_CHECK (إن FAIL):margins/cardH/gap/buttons — بروتوكول الميلي + PAGE inventory
PLAN: SURGICAL-MINIAPP-MAINTENANCE-PLAN-AR.md — وحدة A الحالية فقط
METRO: NONE | …
SHOTS: attached
STOP
```

— Cursor · Confirm-only
