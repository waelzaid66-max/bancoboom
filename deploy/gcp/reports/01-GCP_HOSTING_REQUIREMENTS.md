# 01 — GCP hosting requirements (Cloud Run / Cloud Build)

Checklist aligned with [Google Cloud Run](https://cloud.google.com/run/docs) and [Cloud Build](https://cloud.google.com/build/docs) production practice.

## Cloud Build

| Requirement | Repo status | Action if missing |
|-------------|-------------|-------------------|
| Configuration as YAML in repo | ✅ `cloudbuild.yaml`, `deploy/gcp/cloudbuild*.yaml` | Point Console triggers to YAML, not auto-Dockerfile |
| Build context = repo root | ✅ documented + `verify-gcp-docker-build-config.mjs` | Fix trigger context `.` |
| Valid image tags | ✅ `$BUILD_ID` | Do not use empty `$SHORT_SHA` |
| `.gcloudignore` | ✅ | Keeps upload small; lockfile included |
| CI gate on config | ✅ job `GCP config gate` in `ci.yml` | Merge PR with CI job |
| Logging | ✅ `CLOUD_LOGGING_ONLY` | — |

## Artifact Registry

| Requirement | Repo status | Action |
|-------------|-------------|--------|
| Docker repository in region | ⚠️ preflight in deploy YAML | `bootstrap-project.sh` or manual create |
| IAM: Cloud Build → writer | ⚠️ ops | Grant on project |
| IAM: Cloud Run runtime → reader | ⚠️ ops | Default SA or dedicated runtime SA |

## Cloud Run (API)

| Requirement | Repo status | Action |
|-------------|-------------|--------|
| Container listens on `PORT` (8080) | ✅ Dockerfile | — |
| Liveness HTTP | ✅ app `/api/healthz` + deploy `--startup-probe` / `--liveness-probe` | Set substitutions in deploy |
| Readiness (DB) | ✅ `/api/readyz` | Use for smoke after deploy |
| Secrets via Secret Manager | ✅ `--set-secrets` via `_SECRET_BINDINGS` | Create secrets + IAM accessor |
| No secrets in image | ✅ env at deploy | — |
| `NODE_ENV=production`, `TZ=UTC` | ✅ deploy YAML | — |
| Cloud SQL connector | ✅ `--add-cloudsql-instances` when `_CLOUDSQL_INSTANCE` set | Create instance + socket URL |
| Dedicated runtime SA | ✅ `_RUNTIME_SERVICE_ACCOUNT` | Create SA + `roles/cloudsql.client` etc. |
| CPU / memory / concurrency | ✅ substitutions `_CPU`, `_MEMORY`, `_MAX_INSTANCES` | Tune per load |
| Ingress / auth | ✅ `_ALLOW_UNAUTH` (default false) | Org policy may block public |
| Structured logs to Cloud Logging | ✅ stdout JSON from API | Optional alerts |

## Cloud SQL (PostgreSQL 16)

| Requirement | Repo status | Action |
|-------------|-------------|--------|
| Version 16 | — | Match CI Postgres 16 |
| `pg_trgm` extension | ✅ CI + seed docs | Run on instance after create |
| Migrations | ✅ Drizzle `push-force` / boot patches | Job or Replit/CI pattern |
| Connection string | ✅ `.env.production.example` socket form | Store in Secret Manager |

## Secret Manager

| Requirement | Repo status | Action |
|-------------|-------------|--------|
| One secret per sensitive env | ✅ `SECRET_MANAGER_MAPPING.md` | `gcloud secrets create` |
| Runtime accessor role | ⚠️ ops | `roles/secretmanager.secretAccessor` on runtime SA |
| No plaintext in git | ✅ templates only | — |

## Observability

| Requirement | Repo status | Action |
|-------------|-------------|--------|
| Request logs | ✅ Cloud Logging | — |
| Error alerting | ⚠️ optional `ERROR_ALERT_WEBHOOK` | Wire in env |
| Uptime checks | ❌ not in repo | Cloud Monitoring console |

## Mobile / web

- **Mobile:** EAS / stores — not hosted on GCP.
- **Web (admin/dealer/landing):** not in default GCP deploy YAML; host on Vercel/Netlify/AWS or add future `Dockerfile.web` + CDN.

## Compliance notes

- Use **europe-west1** (or your chosen region) consistently for Run, SQL, AR.
- Enable **audit logs** for IAM and Secret Manager in production projects.
- Review **VPC egress** if using private SQL.
