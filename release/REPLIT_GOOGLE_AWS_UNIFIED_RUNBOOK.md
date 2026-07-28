# Replit + Google Cloud + AWS — unified operations runbook

Single reference for **Replit dev**, **GCP production API**, and **aws-virgen** EC2/CD.

## 1. Repositories (must stay aligned)

| Repo | Role | Sync |
|------|------|------|
| `-BANCO-CA-OOM-` | Source of truth | `main` |
| `aws-virgen` | AWS clone + tag CD | `publish-aws-virgen-rc.sh` |
| `b-banco`, `b.deals`, `B-OOM` | Mirrors | `push-mirror-remotes.sh` |

## 2. Replit daily commands

```bash
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run confidence
pnpm --filter @workspace/api-server test
./turbo.sh check   # optional aggregate
```

API: `PORT` + `DATABASE_URL` from Replit secrets (see `replit.md`).

## 3. GitHub CI (definition of green)

Four jobs on every `main` push:

1. Typecheck & build  
2. API tests (Postgres 16, seeded, `TZ=UTC`)  
3. ESLint (scripts)  
4. GCP config gate (`verify-gcp-docker-build-config.mjs`)  
5. Mobile regression (static)

**All must pass** before calling a build “stable”.

## 4. Google Cloud Platform

| Step | Doc |
|------|-----|
| Requirements | `deploy/gcp/reports/01-GCP_HOSTING_REQUIREMENTS.md` |
| Go/No-Go | `deploy/gcp/reports/06-READINESS_CHECKLIST_GONOGO.md` |
| Fix red Cloud Build on GitHub Checks | `deploy/gcp/TRIGGER_MIGRATION.md` |
| Bootstrap project | `deploy/gcp/scripts/bootstrap-project.sh` |
| Deploy | `deploy/gcp/cloudbuild.deploy.yaml` |
| Post-deploy | `deploy/gcp/scripts/post-deploy-smoke.sh` then `staging-p0-smoke.mjs` |

**Critical:** Cloud Build triggers in Google Console must use **YAML from repo** and context **`.`**. Auto-generated Dockerfile triggers cause exit **125**.

## 5. AWS (aws-virgen)

| Step | Doc |
|------|-----|
| Reports | `deploy/aws/reports/00-README.md` |
| Deploy on EC2 | `deploy/aws/scripts/deploy.sh` |
| Publish repo | `docs/AWS_VIRGEN_FULL_PUBLISH.md` |

## 6. Logs and incidents

- **Cloud Run:** Cloud Logging → filter `resource.type=cloud_run_revision`
- **API:** structured JSON on stdout; set `LOG_LEVEL`
- **Rollback Cloud Run:** previous revision in Console or `gcloud run services update-traffic`
- **Rollback AWS:** `deploy/aws/scripts/rollback.sh`

## 7. Release tags

- Current RC target: **`v1.0.0-rc.2`** (includes SEO + ESLint/globals + map viewport fixes)
- Tag both primary (optional) and aws-virgen after sync

## 8. Who does what

| Actor | Responsibility |
|-------|----------------|
| Replit primary agent | Merge PRs, run full pnpm tests, push virgen/mirrors, GCP bootstrap |
| Cloud secondary agent | PRs, docs, CI gates — **no** push to virgen/mirrors |
| Human owner | PAT secrets, GCP Console triggers, Clerk/EAS/store consoles |
