# 02 — GCP infrastructure topology

## Recommended launch topology (low ops)

```
                    ┌─────────────────┐
                    │  Cloud Build    │
                    │  (trigger GH)   │
                    └────────┬────────┘
                             │ build + push
                             ▼
                    ┌─────────────────┐
                    │ Artifact        │
                    │ Registry (docker)│
                    └────────┬────────┘
                             │ deploy
                             ▼
┌──────────┐   socket    ┌─────────────────┐
│ Cloud SQL│◄───────────│ Cloud Run       │
│ Postgres │            │ banco-api :8080 │
└──────────┘            └────────┬────────┘
                                 │
                    Secret Manager (env)
                                 │
                    External: Clerk, OpenAI, S3/HMAC storage, Resend
```

| Component | Service | Default region |
|-----------|---------|----------------|
| API container | Cloud Run | `europe-west1` |
| Images | Artifact Registry | same as Run |
| Database | Cloud SQL PostgreSQL 16 | same region |
| Secrets | Secret Manager | global (replicated) |
| CI config verify | GitHub Actions | — |
| Object storage | S3-compatible (HMAC) or Replit sidecar in dev | — |

## Scale-up path

1. Increase Cloud Run `max-instances`, CPU, memory.
2. Read replicas on Cloud SQL.
3. Cloud CDN + separate web static deploy.
4. VPC connector for private resources.

## What is NOT on GCP in this RC

- Expo mobile binaries
- Default hosting for admin/dealer/landing SPAs (unless you add a second service)
