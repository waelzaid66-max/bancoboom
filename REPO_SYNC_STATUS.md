# BANCO — حالة مزامنة الريبوهات (نسخة الإنتاج)

**التاريخ:** 2026-07-19  
**HEAD على `main` (local):** `cb2397f` — `chore(memory): update map coordinates + search FAB findings`  
**HEAD على `origin/main`:** `47cc4e5` — `feat(mobile): BOOM STAY black header + profile menu fix`  
**الفارق:** 2 commits محلية غير مدفوعة (سبب: GITHUB_TOKEN غير صالح — يحتوي نص عربي)  
**Replit:** يعمل من الريبو (`-BANCO-CA-OOM-`) — بعد إصلاح الـPAT نفّذ `git push origin main`

---

## GitHub Actions CI على `origin/main`

| الحالة | SHA | ملاحظة |
|--------|-----|--------|
| ✅ 5/5 أخضر | `47cc4e5` | آخر push ناجح — before current session |

---

## الريموتات

| الاسم | GitHub URL | دور | الحالة |
|-------|------------|-----|--------|
| **origin** | `waelzaid66-max/-BANCO-CA-OOM-` | مصدر التطوير | 2 commits behind local |
| **bancooom** | `waelzaid66-max/bancooom` | GCP deploy | يحتاج sync |
| **aws-virgen** | `waelzaid66-max/aws-virgen` | AWS EC2/CD | يحتاج sync |
| **gitsafe-backup** | `gitsafe:5418/backup.git` | Replit backup | pre-receive hook declined |

---

## Commits معلّقة (local main → origin/main)

```
cb2397f chore(memory): update map coordinates + search FAB findings
  + .agents/memory/MEMORY.md (2 insertions)

79dc2de perf(mobile): menuItems useMemo + staleTime + discover map FAB
  + artifacts/banco-mobile/app/(tabs)/profile.tsx (useMemo + staleTime)
  + artifacts/banco-mobile/app/(tabs)/search.tsx (discover map FAB + wantMap)
```

**TypeScript:** 0 أخطاء ✅  
**لا توجد تغييرات مكسورة:** additive-only

---

## تقارير التشغيل

| التقرير | المسار |
|---------|--------|
| مرجع شامل | `BANCO_MASTER_REFERENCE.md` ← **جديد** |
| تسليم الوكيل | `release/PRIMARY_AGENT_HANDOFF.md` |
| تشغيل موحّد | `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md` |
| GCP كامل | `deploy/gcp/reports/00-README.md` |
| مشغّلات Google | `deploy/gcp/TRIGGER_MIGRATION.md` |
| AWS | `deploy/aws/reports/00-README.md` |
| فهرس النشر | `docs/DEPLOYMENT_GUIDES.md` |

---

## أوامر الإغلاق على Replit (مالك المستودع)

```bash
# 1. إصلاح GITHUB_TOKEN في Replit Secrets (PAT حقيقي من GitHub)

# 2. push origin
git push origin main

# 3. مزامنة كل المرآة
MIRROR_PUSH_TOKEN="<PAT>" ./scripts/push-mirror-remotes.sh

# 4. اختبارات
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run confidence
pnpm --filter @workspace/api-server test

# 5. aws-virgen sync (اختياري)
export AWS_VIRGEN_SYNC_TOKEN="<PAT>"
./scripts/publish-aws-virgen-rc.sh v1.1.4-production-2026-07-19
```

---

## قرار الإصدار

| النطاق | الحكم |
|--------|--------|
| كود + TypeScript | **GO** — 0 أخطاء ✅ |
| CI على `origin/main` | **GO** — 5/5 أخضر ✅ |
| Map clusters (live) | **GO** — 14-16 clusters مؤكدة ✅ |
| GITHUB_TOKEN push | **BLOCKED** — PAT منتهي/غير صالح |
| RESEND email | **DEGRADED** — log mode فقط |
| PAYMOB payments | **NOT READY** — مفاتيح اختبار |
| GCP Console triggers | **NEEDS SETUP** — `TRIGGER_MIGRATION.md` |
| متاجر عالمية | **NO GO** — EAS + OPS ناقص |

---

## الفروع المفتوحة (المهمة)

| الفرع | الحالة | الإجراء |
|-------|--------|--------|
| `cursor/booking-notif-test-contract-4322` | ⛔ **لا تدمج** | 478 ملف + 36k حذف — مدمّر |
| `claude/handoff-full-facts-20260719` | 📚 مرجعي | توثيق فقط |
| `fix/mobile-master-stabilize` | 📦 قديم | مُتجاوَز بـmain |

*يُحدَّث بعد كل push.*
