# DEPLOYMENT_PLAN — BANCO / B-OOM

> Phase 4.5 · repo `bancoo` @ `66d2949`. Detected targets: Replit · Docker · AWS (EB/EC2) · GCP (Cloud Build) · Coolify · Vercel.

## 1. Deployment surfaces (detected)
| Target | Config | What deploys | Notes |
|--------|--------|--------------|-------|
| **Replit** | `.replit` (`deploymentTarget=autoscale`) | interactive preview (banco-web dev; banco-mobile via expo) | primary owner preview. Deploy is **manual (Publish)** — not per-commit |
| **Docker (root)** | `Dockerfile` (multi-stage node:24 → `dist/index.mjs`, EXPOSE 8080, tini, non-root uid 10001) | **api-server** | production-grade base image |
| **docker-compose.prod** | `docker-compose.prod.yml` | postgres:16 + api + banco-web + banco-website + web | full local/prod stack |
| **AWS** | `deploy/aws/*` + `.ebextensions/` + `.github/workflows/deploy.yml` | api + web via ECR → SSM → EC2/EB; nginx; CloudWatch | prefer **aws-virgen** (EC2 clone path) |
| **GCP** | `deploy/gcp/cloudbuild*.yaml` + `Dockerfile.api` + canonical deploy doc | api (Cloud Build/Run) | `BANCOOOM_CANONICAL_DEPLOY.md` + migration trigger |
| **Coolify** | `deploy/coolify/Dockerfile.{api,web,website,banco-web}` + nginx | all web surfaces + api | self-hosted PaaS path |
| **Vercel** | `vercel/*` branch + web-analytics | web/website | analytics integration |

## 2. CI/CD (`.github/workflows/`)
- **ci.yml** — typecheck + tests + **mobile static regression pack** + demo-seed guard + test-DB.
- **deploy.yml** — AWS CD, gated on the same checks (typecheck+tests+mobile-static+seed-guard), then ECR push + SSM deploy. Concurrency group `deploy-production`.
- **ci-website.yml / ci-website-docker.yml** — web-surface lint/typecheck/docker.
- **sync-aws-virgen.yml / sync-bancooom.yml** — cross-repo mirror.

## 3. Mobile (banco-mobile) deploy — the "fixes don't show" hazard
- **Prod:** `[services.production]` in the mobile artifact → `build` (`node scripts/build.js` → Metro/Expo static export → `static-build/`) → `run` (`server/serve.js` serves it + `/status` health). `static-build/` is **NOT committed** (fresh each build). `build.js` does **not** gate on tsc, so it won't silently fail on stale expo-router types.
- **Root cause of stale UI:** Replit prod deploy is **manual** — new `main` commits are NOT auto-deployed. To show fixes: **re-Publish** (rebuilds `static-build`) + verify `/status`=200 + build logs.
- **Native:** Expo/EAS (`eas.json`) → AAB. Verify `expo-doctor` before store builds.

## 4. Recommended zero-downtime path (for expansion)
1. **Single source of truth = this repo (`bancoo`).** All targets build from it.
2. **API:** container (Docker) behind LB — rolling deploy (EB/Cloud Run/Coolify all support it). Health `/status` + `/api/healthz|readyz`.
3. **DB migrations:** run as a gated pre-deploy step (see `deploy/gcp/TRIGGER_MIGRATION.md`) — additive, reversible, never blocking `app.listen`.
4. **Mobile web:** rebuild `static-build` on every deploy; cache-bust the served bundle.
5. **Secrets:** per-target secret store (Replit encrypted / AWS SSM / GCP Secret Manager) — names in `.env.example`, values never committed.

## 5. Open deployment questions (need owner decision)
- **Primary production target:** AWS EB vs GCP Cloud Run vs Coolify? (Currently all three are wired — pick ONE canonical + keep others as fallback to avoid drift.)
- **Mobile delivery:** Expo web bundle (served) vs native AAB (store) — which is "production" for launch?
- **CDN:** no CDN layer detected in front of `static-build`/web — see PRODUCTION_RISKS.
