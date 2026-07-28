# مستودع النشر الرسمي: `bancooom`

**الغرض:** نسخة جاهزة للنشر على Google Cloud فقط — مرتبطة بمشغّلات Cloud Build و Artifact Registry، **بدون** الاعتماد على اسم مستودع GitHub الذي يبدأ بشرطة (`-BANCO-CA-OOM-`).

| مستودع | الدور |
|--------|--------|
| `waelzaid66-max/-BANCO-CA-OOM-` | تطوير أولي / CI كامل |
| **`waelzaid66-max/bancooom`** | **نشر GCP (Cloud Build + Cloud Run)** — استخدمه في المشغّل |
| `waelzaid66-max/aws-virgen` | مرآة إنتاج / AWS (اختياري) |

---

## سبب فشل البناء exit 125 (الوسم الذي أرسلته)

```
invalid argument ".../cloud-run-source-deploy/-banco-ca-oom-/banco-oom:b2d6f7f..." for "-t, --tag" flag: invalid reference format
```

| العنصر | القيمة في الخطأ | المشكلة |
|--------|------------------|---------|
| آلية البناء | **Cloud Run source deploy** (مسار `cloud-run-source-deploy/...`) | لا تستخدم `cloudbuild.yaml` من الريبو |
| مقطع المسار | **`-banco-ca-oom-`** | يبدأ وينتهي بشرطة → **مرجع Docker غير صالح** |
| السبب الجذري | اسم GitHub `-BANCO-CA-OOM-` يُحوَّل إلى lowercase في مسار الصورة | ليس خطأ في `Dockerfile` أو `pnpm` |

**الحل:** ربط المشغّل بمستودع **`bancooom`** + ملف إعداد **`deploy/gcp/cloudbuild.deploy.yaml`** (أو `cloudbuild.yaml` للبناء فقط) مع:

| substitution | قيمة مقترحة (مشروعك `me-central1`) |
|--------------|--------------------------------------|
| `_REGION` | `me-central1` |
| `_AR_REPO` | `banco` (أو اسم مستودع AR الجديد الذي أنشأته — **بدون** شرطة في البداية/النهاية) |
| `_IMAGE_NAME` | `api` |
| `_SERVICE` | `banco-api` |

مسار الصورة الصحيح:

```text
me-central1-docker.pkg.dev/$PROJECT_ID/banco/api:$BUILD_ID
```

**ممنوع** الاعتماد على: `.../cloud-run-source-deploy/-banco-ca-oom-/banco-oom:...`

---

## إعداد Cloud Build Trigger (Console)

1. **Repository** → GitHub → `waelzaid66-max/bancooom`، فرع `main`.
2. **Configuration** → **Cloud Build configuration file** → `deploy/gcp/cloudbuild.deploy.yaml` (أو `cloudbuild.yaml` أولاً للتجربة).
3. **Build context** → `.` (جذر الريبو).
4. **Substitutions** → كالجدول أعلاه؛ لا تضف شرطة زائدة في `_AR_REPO` أو `_IMAGE_NAME`.
5. **لا** تستخدم "Dockerfile (autodetected)" من واجهة Cloud Run source deploy لهذا المشروع.

تفاصيل إضافية: [TRIGGER_MIGRATION.md](./TRIGGER_MIGRATION.md).

---

## مزامنة المحتوى من المونوريبو الرئيسي

على جهازك أو Replit (حساب المالك + `gh auth login`):

```bash
export BANCOOOM_SYNC_TOKEN='ghp_...'   # PAT بصلاحية push على bancooom
./scripts/publish-bancooom-deploy.sh
```

أو من GitHub Actions على `-BANCO-CA-OOM-`: workflow **Sync bancooom (deploy repo)** مع secret `BANCOOOM_SYNC_TOKEN`.

---

## تحقق محلي (بدون Docker)

```bash
node scripts/verify-gcp-docker-build-config.mjs
```

يجب أن يمرّ فحص مقاطع `_AR_REPO` / `_IMAGE_NAME` وفحص توثيق `cloud-run-source-deploy`.

---

## English

Use **`bancooom`** as the GCP deploy Git remote so image paths never embed `-banco-ca-oom-`. Point triggers at repo YAML with `_AR_REPO=banco`, `_IMAGE_NAME=api`, `_REGION=me-central1`, and context `.`. Exit **125** on step 0 is an **invalid `-t` tag**, not an application compile failure.
