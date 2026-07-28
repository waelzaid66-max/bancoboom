# 03 — Deployment files (GCP)

| Path | Purpose |
|------|---------|
| `Dockerfile` (root) | API image (EB + Console parity) |
| `deploy/gcp/Dockerfile.api` | Same recipe as root |
| `cloudbuild.yaml` | Build + push only (root Dockerfile) |
| `deploy/gcp/cloudbuild.yaml` | Build + push (`Dockerfile.api`) |
| `deploy/gcp/cloudbuild.deploy.yaml` | Build + push + Cloud Run deploy |
| `.gcloudignore` | Upload filter |
| `.dockerignore` | Build context filter |
| `deploy/gcp/env/.env.production.example` | Production env names |
| `deploy/gcp/env/.env.staging.example` | Staging env names |
| `deploy/gcp/env/SECRET_MANAGER_MAPPING.md` | Secret IDs |
| `deploy/gcp/scripts/bootstrap-project.sh` | One-time project setup |
| `deploy/gcp/scripts/post-deploy-smoke.sh` | HTTP smoke wrapper |
| `scripts/verify-gcp-docker-build-config.mjs` | Static pipeline gate |
| `deploy/gcp/TRIGGER_MIGRATION.md` | Console trigger fixes |
| `deploy/gcp/reports/*` | This audit pack |

## Deliberately unchanged

- Application code under `artifacts/`, `lib/`
- `.github/workflows/ci.yml` core jobs (extended with GCP gate only)
