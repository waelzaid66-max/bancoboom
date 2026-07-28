# نشر `bancooom` — ملخص للمطور

## ماذا كان يفشل؟

Cloud Build خطوة 0 (docker) **exit 125** لأن الوسم:

`.../cloud-run-source-deploy/-banco-ca-oom-/banco-oom:<sha>`

غير صالح: المقطع **`-banco-ca-oom-`** يبدأ بشرطة (من اسم GitHub `-BANCO-CA-OOM-`).

## ماذا فعلنا في الكود؟

- توثيق كامل: `deploy/gcp/BANCOOOM_CANONICAL_DEPLOY.md` + تحديث `TRIGGER_MIGRATION.md`
- فحص آلي: `scripts/verify-gcp-docker-build-config.mjs` + `scripts/lib/docker-image-reference.mjs`
- نشر الريبو: `scripts/publish-bancooom-deploy.sh` + `.github/workflows/sync-bancooom.yml`

## ماذا تفعل في GCP (مرة واحدة)؟

1. أنشئ/استخدم Artifact Registry باسم **`banco`** (أو اسم جديد **بدون** شرطة في البداية/النهاية).
2. عدّل **Cloud Build Trigger**:
   - Repository: **`waelzaid66-max/bancooom`**
   - Config file: **`deploy/gcp/cloudbuild.deploy.yaml`**
   - Context: **`.`**
   - Substitutions: `_REGION=me-central1`, `_AR_REPO=banco`, `_IMAGE_NAME=api`, `_SERVICE=banco-api`
3. **لا** تستخدم Cloud Run “deploy from repository” الذي يملأ `cloud-run-source-deploy/...`.

## رفع النسخة الكاملة إلى bancooom

```bash
gh auth login
export BANCOOOM_SYNC_TOKEN="$(gh auth token)"
./scripts/publish-bancooom-deploy.sh deploy-main
```

أو من GitHub: Actions → **Sync bancooom (GCP deploy repo)** بعد إضافة secret `BANCOOOM_SYNC_TOKEN`.
