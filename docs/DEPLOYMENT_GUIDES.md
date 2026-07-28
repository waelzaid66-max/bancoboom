# BANCO Store — Production documentation index

Use this index before deploy. **Two official GitHub repositories** ship the same product line:

| Repository | Role |
|------------|------|
| `waelzaid66-max/-BANCO-CA-OOM-` | Primary monorepo (Replit + full audit tree) |
| `waelzaid66-max/aws-virgen` | AWS production deploy repo (same `main` code + `deploy.yml` CD) |

---

## Core

| Guide | Path |
|-------|------|
| README | [README.md](../README.md) |
| Changelog | [release/CHANGELOG.md](../release/CHANGELOG.md) |
| Release notes (RC) | [RELEASE_NOTES.md](../RELEASE_NOTES.md) |
| Security | [SECURITY.md](../SECURITY.md) · [threat_model.md](../threat_model.md) |
| Status / verification | [STATUS_REPORT.md](../STATUS_REPORT.md) |
| Repo sync | [REPO_SYNC_STATUS.md](../REPO_SYNC_STATUS.md) |

## Deployment platforms

| Platform | Guide |
|----------|--------|
| **Replit** | [replit.md](../replit.md) · [release/REPLIT_HANDOFF.md](../release/REPLIT_HANDOFF.md) · [release/DEPLOYMENT.md](../release/DEPLOYMENT.md) |
| **AWS** | [deploy/aws/reports/](../deploy/aws/reports/) · [release/DEPLOY_VERIFICATION.md](../release/DEPLOY_VERIFICATION.md) · [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) |
| **Google Cloud** | [deploy/gcp/reports/](../deploy/gcp/reports/) · [deploy/gcp/TRIGGER_MIGRATION.md](../deploy/gcp/TRIGGER_MIGRATION.md) · [deploy/gcp/](../deploy/gcp/) |
| **Primary agent** | [release/PRIMARY_AGENT_HANDOFF.md](../release/PRIMARY_AGENT_HANDOFF.md) · [release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md](../release/REPLIT_GOOGLE_AWS_UNIFIED_RUNBOOK.md) |

## Mobile / stores

| Guide | Path |
|-------|------|
| EAS build | [release/EAS_BUILD.md](../release/EAS_BUILD.md) |
| App Store / Play | [release/STORE_PUBLISHING_GUIDE.md](../release/STORE_PUBLISHING_GUIDE.md) |
| EAS checklist | [audit/production-readiness/EXPO-EAS-PRODUCTION-CHECKLIST.md](../audit/production-readiness/EXPO-EAS-PRODUCTION-CHECKLIST.md) |
| Device staging | [audit/production-readiness/STAGING-EAS-DEVICE-RUNBOOK.md](../audit/production-readiness/STAGING-EAS-DEVICE-RUNBOOK.md) |

## Operations

| Guide | Path |
|-------|------|
| Rollback | [audit/production-readiness/RELEASE-ROLLBACK-PLAYBOOK.md](../audit/production-readiness/RELEASE-ROLLBACK-PLAYBOOK.md) |
| Production readiness | [audit/production-readiness/README.md](../audit/production-readiness/README.md) |
| Sign-off | [audit/production-readiness/PRODUCTION-SIGN-OFF-AND-DEPLOYMENT.md](../audit/production-readiness/PRODUCTION-SIGN-OFF-AND-DEPLOYMENT.md) |
| Secrets checklist | [audit/production-readiness/STAGING-REQUIRED-SECRETS.md](../audit/production-readiness/STAGING-REQUIRED-SECRETS.md) |
| Finalization audit | [REPOSITORY_FINALIZATION_AUDIT.md](../REPOSITORY_FINALIZATION_AUDIT.md) |

## Local verification (no secrets)

```bash
pnpm run confidence    # static gates
./turbo.sh check       # typecheck + api-server tests (needs DATABASE_URL)
```
