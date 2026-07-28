# 06 — GCP readiness checklist (Go / No-Go)

## A. Repository (`bancooom` = GCP deploy canonical; `-BANCO-CA-OOM-` = dev; `aws-virgen` optional mirror)

- [ ] `bancooom` `main` SHA = primary `main` (run `scripts/publish-bancooom-deploy.sh` or workflow **Sync bancooom**)
- [ ] Cloud Build trigger points at **`bancooom`**, not `-BANCO-CA-OOM-` (avoids `cloud-run-source-deploy/-banco-ca-oom-` exit 125)
- [ ] GitHub CI: Typecheck & build — **PASS**
- [ ] GitHub CI: API tests (Postgres) — **PASS**
- [ ] GitHub CI: ESLint — **PASS**
- [ ] GitHub CI: Mobile regression — **PASS**
- [ ] GitHub CI: GCP config gate — **PASS**
- [ ] `node scripts/production-confidence-check.mjs` — **12/12** on Replit

## B. Google Cloud project

- [ ] APIs enabled (Run, Build, AR, SQL Admin, Secret Manager)
- [ ] Artifact Registry repo `banco` in `europe-west1` (or chosen region)
- [ ] Cloud Build triggers use **YAML from repo** (`deploy/gcp/cloudbuild.deploy.yaml` or build-only first)
- [ ] Trigger build context = `.` (repo root)
- [ ] Manual `gcloud builds submit` build-only — **SUCCESS**
- [ ] Full deploy YAML — **SUCCESS** (or documented blocker)

## C. Data & secrets

- [ ] Cloud SQL instance running PostgreSQL 16
- [ ] `pg_trgm` enabled
- [ ] Schema pushed / migrations applied
- [ ] Seed reference data if needed (plans, locations)
- [ ] All secrets in Secret Manager per mapping doc
- [ ] Runtime SA has accessor + cloudsql.client

## D. Runtime

- [ ] `/api/healthz` returns 200 on deployed URL
- [ ] `/api/readyz` returns 200 when DB up
- [ ] `staging-p0-smoke.mjs` with real JWT — **PASS**
- [ ] Logs visible in Cloud Logging without PII leaks

## E. Dual-repo parity

- [ ] `aws-virgen` merged from same `main` + tag `v1.0.0-rc.2`
- [ ] Mirrors `b-banco`, `b.deals`, `B-OOM` pushed (owner token)

## Verdict

| Stage | Decision |
|-------|----------|
| Code + CI | **GO** when all A checks pass |
| GCP staging | **GO WITH FIXES** when B–D pass |
| Global production | **NO GO** until smoke + store OPS closed (see `audit/production-readiness/`) |

Sign-off owner: _______________  Date: _______________
