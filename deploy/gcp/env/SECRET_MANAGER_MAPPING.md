# Secret Manager ↔ Cloud Run env mapping

Create secrets (example — adjust project):

```bash
gcloud secrets create banco-database-url --replication-policy=automatic
gcloud secrets versions add banco-database-url --data-file=- <<< "$DATABASE_URL"
```

| Env var (Cloud Run) | Secret Manager id | Required |
|---------------------|-------------------|----------|
| `DATABASE_URL` | `banco-database-url` | yes |
| `CLERK_SECRET_KEY` | `banco-clerk-secret-key` | yes |
| `CLERK_PUBLISHABLE_KEY` | `banco-clerk-publishable-key` | yes (or plain env) |
| `OPENAI_API_KEY` | `banco-openai-api-key` | if AI on |
| `RESEND_API_KEY` | `banco-resend-api-key` | if email on |
| `AWS_ACCESS_KEY_ID` | `banco-s3-access-key-id` | if S3 storage |
| `AWS_SECRET_ACCESS_KEY` | `banco-s3-secret-access-key` | if S3 storage |

**`_SECRET_BINDINGS` example** (comma-separated, no spaces):

```text
DATABASE_URL=banco-database-url:latest,CLERK_SECRET_KEY=banco-clerk-secret-key:latest,CLERK_PUBLISHABLE_KEY=banco-clerk-publishable-key:latest
```

Grant `roles/secretmanager.secretAccessor` on each secret to the Cloud Run runtime service account.
