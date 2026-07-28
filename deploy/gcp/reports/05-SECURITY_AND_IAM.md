# 05 — Security and IAM

## Service accounts (recommended)

| SA | Purpose | Roles (minimum) |
|----|---------|-----------------|
| `banco-cloudbuild@…` | Cloud Build deploy steps | `artifactregistry.writer`, `run.admin`, `iam.serviceAccountUser` |
| `banco-api-run@…` | Cloud Run runtime | `secretmanager.secretAccessor`, `cloudsql.client`, `logging.logWriter` |

Create via `deploy/gcp/scripts/bootstrap-project.sh` (optional `CREATE_SERVICE_ACCOUNTS=true`).

## Cloud Run ingress

- Default in repo: `--no-allow-unauthenticated` (`_ALLOW_UNAUTH=false`).
- Public API only when org policy allows: set `_ALLOW_UNAUTH=true` and IAM `roles/run.invoker` for `allUsers` if required.

## Secrets

- Never commit `.env` with real values.
- Rotate secrets in Secret Manager; redeploy Cloud Run revision to pick up new versions.

## Container

- Runs as non-root user in Dockerfile.
- No SSH on Cloud Run — use logs and traces.

## Threat model

See repo root `threat_model.md` — same app surface; GCP adds IAM + Secret Manager boundaries.
