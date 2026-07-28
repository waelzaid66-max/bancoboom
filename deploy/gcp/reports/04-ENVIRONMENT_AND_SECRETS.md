# 04 — Environment variables and Secret Manager

Templates:

- Production: `deploy/gcp/env/.env.production.example`
- Staging: `deploy/gcp/env/.env.staging.example`
- Mapping: `deploy/gcp/env/SECRET_MANAGER_MAPPING.md`

## Mandatory for production API

| Variable | Secret Manager (suggested id) | Notes |
|----------|-------------------------------|--------|
| `DATABASE_URL` | `banco-database-url` | Cloud SQL socket URL |
| `CLERK_SECRET_KEY` | `banco-clerk-secret-key` | |
| `CLERK_PUBLISHABLE_KEY` | `banco-clerk-publishable-key` | Can be env var if non-secret policy |
| `OPENAI_API_KEY` | `banco-openai-api-key` | If AI enabled |

## Storage (pick one)

| Mode | Variables |
|------|-----------|
| S3-compatible on GCP | `OBJECT_STORAGE_PROVIDER=s3`, `S3_BUCKET`, HMAC keys in secrets |
| Replit sidecar (dev/staging only) | `OBJECT_STORAGE_PROVIDER=replit` |

There is **no** `OBJECT_STORAGE_PROVIDER=gcs` in the API.

## Deploy injection

Use Cloud Run:

```bash
--set-secrets=DATABASE_URL=banco-database-url:latest,CLERK_SECRET_KEY=banco-clerk-secret-key:latest
```

Or substitution `_SECRET_BINDINGS` in `cloudbuild.deploy.yaml`.

Non-secret vars stay in `--set-env-vars` (e.g. `NODE_ENV`, `TZ`, `LOG_LEVEL`).

## Full AWS-style inventory

For cross-cloud parity see `deploy/aws/reports/04-ENVIRONMENT_VARIABLES.md` — same application variables apply; only injection mechanism differs (SSM vs Secret Manager).
