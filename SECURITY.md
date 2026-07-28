# Security Policy — BANCO Store

## Reporting vulnerabilities

Report suspected security issues **privately** to the repository owner (do not open public issues with exploit details).

## Scope

- `artifacts/api-server` (public API, auth, uploads, payments webhooks)
- Web surfaces: `admin-os`, `dealer-os`, `landing`
- `artifacts/banco-mobile` (client; server enforces authorization)

## Model

See **[threat_model.md](threat_model.md)** for the full threat model (Clerk, RBAC, upload claims, Paymob HMAC, CORS).

## Hardening references

| Document | Purpose |
|----------|---------|
| [release/SECURITY_REPORT.md](release/SECURITY_REPORT.md) | Release audit |
| [audit/production-readiness/PHASE-05-SECURITY.md](audit/production-readiness/PHASE-05-SECURITY.md) | Production readiness |
| [deploy/aws/reports/](deploy/aws/reports/) | AWS deployment security notes |

## Secrets

- Never commit `.env`, `.secrets/`, or backup dumps.
- Templates only: [.env.example](.env.example), `deploy/*/env/.env.*.example`.
- Checklist: [audit/production-readiness/STAGING-REQUIRED-SECRETS.md](audit/production-readiness/STAGING-REQUIRED-SECRETS.md).

## Supported release line

Security fixes ship on **`main`** and release tags (see [RELEASE_NOTES.md](RELEASE_NOTES.md)).
