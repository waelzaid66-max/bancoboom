# تسليم للوكيل الأساسي (Replit) — نسخة موحّدة AWS + GCP + مرآات

**من:** Cloud Agent (ثانوي)  
**إلى:** الوكيل الأساسي على Replit (تخطيط + تنفيذ)  
**التاريخ:** 2026-07-08  
**الأولوية:** P0 — توحيد الريبوهين وتشغيل عالمي آمن

---

## 1) SHA المعتمد (مصدر الحقيقة)

| الريبو | URL | `main` المستهدف |
|--------|-----|-----------------|
| **أساسي** | https://github.com/waelzaid66-max/-BANCO-CA-OOM- | `30dcb2a` (CI أخضر على GitHub Actions) |
| **AWS** | https://github.com/waelzaid66-max/aws-virgen | يجب = merge من الأساسي + tag `v1.0.0-rc.2` |

**لا تعمل على SHA قديم** (`045112f`, `a8cc3e1`, `61af147` على virgen). اسحب `origin/main` أولاً.

```bash
git fetch origin main && git checkout main && git pull origin main
git rev-parse HEAD   # يجب 30dcb2a أو أحدث بعد دمج PRs المفتوحة
```

---

## 2) مهمتك بالترتيب (نفّذها أنت — ليس cursor[bot])

### المرحلة A — دمج وفحص كامل على الأساسي

1. دمج PRs المفتوحة ذات الصلة (على الأقل):
   - [#5](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/5) aws-virgen sync + manifest
   - [#3](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/3) GCP CI gate + `TRIGGER_MIGRATION.md`
   - [#4](https://github.com/waelzaid66-max/-BANCO-CA-OOM-/pull/4) توثيق CI (اختياري)
2. على Replit (شبكة npm تعمل):

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run confidence                    # يشمل verify-gcp-docker-build-config
pnpm --filter @workspace/api-server test   # Postgres محلي أو Replit DB
pnpm --filter @workspace/banco-mobile run test:icons
pnpm --filter @workspace/banco-mobile run test:lib
pnpm --filter @workspace/banco-mobile run test:resilience
```

3. تأكد **GitHub Actions CI** أخضر على `main` بعد الدمج (4 jobs).

### المرحلة B — aws-virgen (نسخة كاملة شاملة)

```bash
# بعد دمج PR #5 على main
export AWS_VIRGEN_SYNC_TOKEN="<PAT classic repo scope>"
./scripts/publish-aws-virgen-rc.sh v1.0.0-rc.2
```

أو: Actions → **Sync aws-virgen (full main)** (سر `AWS_VIRGEN_SYNC_TOKEN`).

التحقق:

```bash
git ls-remote https://github.com/waelzaid66-max/aws-virgen.git refs/heads/main
# يجب أن يحتوي merge من آخر main + release/AWS_VIRGEN_SYNC_MANIFEST.json
```

### المرحلة C — Google Cloud Platform (شروط الاستضافة والنشر)

**الكود في الريبو يغطي البناء والنشر؛ Console/OPS تكمّل:**

| الملف | الغرض |
|-------|--------|
| `deploy/gcp/reports/00-README.md` | ترتيب القراءة + Go/No-Go |
| `deploy/gcp/reports/01-GCP_HOSTING_REQUIREMENTS.md` | متطلبات Cloud Run / Build / SQL / Secrets |
| `deploy/gcp/reports/06-READINESS_CHECKLIST_GONOGO.md` | قائمة تحقق قبل إنتاج عالمي |
| `deploy/gcp/TRIGGER_MIGRATION.md` | إصلاح مشغّلات Cloud Build (exit 125) |
| `deploy/gcp/env/SECRET_MANAGER_MAPPING.md` | أسماء الأسرار |
| `deploy/gcp/scripts/bootstrap-project.sh` | APIs + AR + SA (مرة واحدة) |
| `deploy/gcp/cloudbuild.deploy.yaml` | build + deploy + probes + secrets (substitutions) |

**خطوات GCP (ملخّص):**

1. `bash deploy/gcp/scripts/bootstrap-project.sh` (مع `gcloud` على مشروعك)
2. أنشئ أسرار Secret Manager حسب `SECRET_MANAGER_MAPPING.md`
3. Cloud SQL + ربط `--add-cloudsql-instances` عبر substitution `_CLOUDSQL_INSTANCE`
4. حدّث **كل** مشغّل Cloud Build ليستخدم YAML من الريبو (ليس Dockerfile تلقائي) — انظر `TRIGGER_MIGRATION.md`
5. أول نشر: `cloudbuild.yaml` (build فقط) ثم `cloudbuild.deploy.yaml` مع substitutions
6. بعد النشر: `BANCO_API_URL=… CLERK_BEARER_TOKEN=… node scripts/staging-p0-smoke.mjs`

### المرحلة D — مرآات GitHub الأخرى

```bash
./scripts/push-mirror-remotes.sh   # b-banco, b.deals, B-OOM
```

---

## 3) توحيد النسختين (أقصى قوة — بدون drift)

| قاعدة | التطبيق |
|-------|---------|
| مصدر واحد | `-BANCO-CA-OOM-` فقط؛ `aws-virgen` = merge + tag |
| لا force-push لـ `main` | merge فقط في virgen |
| نفس CI | `ci.yml` + `deploy.yml` على الاثنين بعد sync |
| نفس tag للإصدار | `v1.0.0-rc.2` ثم `v1.0.0` عند GO |
| بعد كل دمج مهم | sync virgen + mirrors + تحديث `REPO_SYNC_STATUS.md` |

---

## 4) التقارير التي تحتاجها أنت والمبرمجون

| المسار | المحتوى |
|--------|---------|
| `audit/production-readiness/` | جاهزية المتجر والنشر العالمي |
| `audit/maintenance/MASTER-MAINTENANCE-READINESS-PLAN.md` | موجات الصيانة |
| `deploy/aws/reports/` | AWS كامل |
| `deploy/gcp/reports/` | GCP كامل (جديد في هذه الموجة) |
| `release/AWS_VIRGEN_SYNC_MANIFEST.json` | فهرس الملفات عند النشر |
| `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md` | تشغيل Replit + سحابة |
| `STATUS_REPORT.md` | أدلة الاختبارات |
| `scripts/production-confidence-check.mjs` | 12 بوابة محلية |

---

## 5) Replit تحديداً

- `replit.md` — تشغيل API، Postgres، اختبارات
- `packageManager: pnpm@11.9.0` — لا تغيّر بدون تحديث lockfile + CI
- الأسرار: لا تُ commit؛ استخدم Replit Secrets + نفس أسماء `deploy/gcp/env` / AWS SSM

---

## 6) ماذا لا يستطيع الوكيل الثانوي فعله

- push إلى `aws-virgen` أو المرآات (403 لـ cursor[bot])
- تشغيل `gcloud` على مشروعك
- EAS / متاجر التطبيقات

---

## 7) تعريف «نجاح كامل»

- [x] `main` على الأساسي: CI 5/5 أخضر (run 28978878224 @ `482eb34`)
- [ ] `pnpm` محلي على Replit: typecheck + lint + api tests + mobile tests
- [ ] `aws-virgen/main` = merge من نفس `main` + tag `v1.0.0-rc.2` (**نفّذ `publish-aws-virgen-rc.sh` بحساب المالك**)
- [ ] GCP: مشغّلات Console محدّثة (`TRIGGER_MIGRATION.md`) + أسرار/SQL
- [ ] smoke staging (عند توفر URL + JWT)
- [x] `REPO_SYNC_STATUS.md` محدّث

### لماذا virgen لم يُدفع من Cloud Agent؟

بيئة Cursor ترفض `git push` إلى `aws-virgen` بهوية **cursor[bot]** حتى مع PAT في URL. الدمج يُنجَز محلياً في السكربت؛ **الدفع الأخير** يجب أن يكون من Replit بعد `gh auth login` كمالك المستودع.

---

## English summary (for programmers)

1. Pull `origin/main` @ `482eb34` (PR #5 merged).
2. Run full `pnpm` verification locally on Replit.
3. Publish **full tree** to `aws-virgen` via `publish-aws-virgen-rc.sh` or sync workflow (owner PAT).
4. GCP: follow `deploy/gcp/reports/`, fix Cloud Build **triggers** in Console, bootstrap secrets/SQL, deploy with `cloudbuild.deploy.yaml`.
5. Keep both repos aligned via merge-only sync; never let virgen drift.

**Contact artifact:** `release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md`
