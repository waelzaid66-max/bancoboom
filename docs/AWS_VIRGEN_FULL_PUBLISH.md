# نشر نسخة كاملة إلى `aws-virgen`

**الهدف:** نسخة **مطابقة 100%** لآخر `main` على الريبو الأساسي `-BANCO-CA-OOM-`، مع **كل التقارير** ومسارات الفحص وملفات النشر — بدون قصّ للتاريخ (merge، ليس force-push عشوائي).

| الريبو | الرابط |
|--------|--------|
| أساسي | https://github.com/waelzaid66-max/-BANCO-CA-OOM- |
| AWS | https://github.com/waelzaid66-max/aws-virgen |

## ما يُرفع (شامل)

- كود المونوريبو كامل (`artifacts/`, `lib/`, `deploy/aws`, `deploy/gcp`, …)
- `audit/production-readiness/` — تقارير الجاهزية
- `audit/maintenance/` — خطة الصيانة
- `deploy/aws/reports/` — تدقيق AWS
- `reports/` — تقارير مجمّعة
- `release/` — CHANGELOG، EAS، هذا الدليل + `AWS_VIRGEN_SYNC_MANIFEST.json`
- `.github/workflows/ci.yml` + `deploy.yml`

## الطريقة 1 — من جهازك / Replit (موصى بها)

```bash
git fetch origin main
git checkout main
git pull origin main

node scripts/generate-aws-virgen-sync-manifest.mjs --tag v1.0.0-rc.2
git add release/AWS_VIRGEN_SYNC_MANIFEST.json
git commit -m "chore(release): aws-virgen sync manifest for v1.0.0-rc.2" || true

chmod +x scripts/publish-aws-virgen-rc.sh
./scripts/publish-aws-virgen-rc.sh v1.0.0-rc.2
```

السكربت يعمل: clone `aws-virgen` → merge `origin/main` → محاذاة `deploy.yml` → tag → push `main` + tag.

## الطريقة 2 — GitHub Actions (بعد إضافة سر واحد)

1. في **الريبو الأساسي**: Settings → Secrets → Actions → `AWS_VIRGEN_SYNC_TOKEN`  
   - Personal Access Token (classic) مع صلاحية **`repo`** على `aws-virgen` (ويفضل الأساسي أيضاً).
2. Actions → **Sync aws-virgen (full main)** → Run workflow  
3. أدخل الوسم (مثلاً `v1.0.0-rc.2`).

## التحقق بعد الدفع

```bash
git ls-remote https://github.com/waelzaid66-max/aws-virgen.git refs/heads/main
# يجب أن يطابق: git rev-parse origin/main (بعد merge commit على virgen)

git ls-remote https://github.com/waelzaid66-max/aws-virgen.git refs/tags/v1.0.0-rc.2
```

على EC2:

```bash
cd /opt/banco/aws-virgen && git fetch --all --tags && git checkout v1.0.0-rc.2
node scripts/production-confidence-check.mjs --skip-typecheck
```

## ملاحظة Cloud Agent

`cursor[bot]` **لا يستطيع** push إلى `aws-virgen` (403). التنفيذ الفعلي يتطلب **token المالك** أو workflow أعلاه.
