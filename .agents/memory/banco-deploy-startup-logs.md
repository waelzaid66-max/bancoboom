---
name: BANCO deploy startup log noise
description: Why a healthy BANCO monorepo deploy still prints 500 healthchecks, a triple "maintenance jobs registered" line, and a pg SSL warning
---

When the BANCO monorepo is published, the deploy logs print three scary-looking
lines on EVERY boot that are all benign. Don't "fix" them.

**1. `healthcheck failed ... returned status 500` for `/api` and `/banco-mobile/`**
- These appear only in the first few seconds, before the runnable processes bind
  their ports. The api-server runs `ensureDbExtensions()` then `app.listen`, so it
  binds ~5s after process start; until "Server listening port=8080" logs, the
  platform's probes get 500. They stop the instant the port is up.
- Also `artifact port detected detected=1 expected=2` is the same race: mobile
  binds first, api a couple seconds later → goes 1→2.
- **Why benign:** the platform retries healthchecks until healthy; a deploy that
  reaches "Server listening" with no post-boot failures is healthy. Self-resolving.

**2. `Scheduled maintenance jobs registered` printed 3× at the same ms, same pid**
- Same pid on all 3 lines = ONE process. `startScheduledJobs()` is idempotent
  (`started` boolean guard) and is called exactly once from the `app.listen`
  callback. Cron jobs are scheduled once; each also takes a Postgres advisory lock
  so even with multiple instances only one runs the work.
- The duplication is a deploy-log capture artifact (the structured
  `fetch_deployment_logs` view shows the line ONCE). Not triple scheduling.
- **How to apply:** if the user re-reports this, reassure — no double/triple job
  runs are possible. Verify via the `started` guard + advisory locks, not by the
  raw log line count.

**3. `SECURITY WARNING: SSL modes 'prefer'/'require'/'verify-ca' treated as verify-full`**
- Forward-compat deprecation from `pg`/`pg-connection-string`. The managed
  DATABASE_URL uses `sslmode=require`, currently upgraded to verify-full (strongest).
  Only changes in a future pg major. Currently secure; no action needed. Don't edit
  the managed DATABASE_URL secret to chase it.
