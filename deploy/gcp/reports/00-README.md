# BANCO — GCP Production Deployment Package

Deployment engineering for **Google Cloud Platform** (Cloud Run + Cloud Build + Cloud SQL + Secret Manager). **No business logic changes** in this folder — ops and pipeline only.

## Read in this order

1. **[01-GCP_HOSTING_REQUIREMENTS.md](01-GCP_HOSTING_REQUIREMENTS.md)** — Google hosting rules (Cloud Run, AR, IAM, secrets, SQL, logging).
2. **[02-INFRASTRUCTURE_TOPOLOGY.md](02-INFRASTRUCTURE_TOPOLOGY.md)** — recommended services and regions.
3. **[03-DEPLOYMENT_FILES.md](03-DEPLOYMENT_FILES.md)** — every GCP file in the repo + purpose.
4. **[04-ENVIRONMENT_AND_SECRETS.md](04-ENVIRONMENT_AND_SECRETS.md)** — env vars + Secret Manager mapping.
5. **[05-SECURITY_AND_IAM.md](05-SECURITY_AND_IAM.md)** — service accounts, least privilege, ingress.
6. **[06-READINESS_CHECKLIST_GONOGO.md](06-READINESS_CHECKLIST_GONOGO.md)** — step-by-step Go/No-Go before global traffic.

Also: **[../TRIGGER_MIGRATION.md](../TRIGGER_MIGRATION.md)** — fix Cloud Build triggers (exit 125).

## TL;DR

- **Build context:** repository root `.` always.
- **Image tag:** `$BUILD_ID` (never empty `$SHORT_SHA` alone).
- **API:** Cloud Run port `8080`, health `/api/healthz`, readiness `/api/readyz`.
- **Deploy YAML:** `deploy/gcp/cloudbuild.deploy.yaml` with substitutions for SQL, secrets, probes.
- **Verdict:** **CONDITIONAL GO** — pipeline in repo is production-shaped; live project needs bootstrap + secrets + trigger migration.
