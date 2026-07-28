#!/usr/bin/env node
/**
 * Verify all deployment artifacts exist (AWS, GCP, CI, Docker, ops scripts).
 * Usage: node scripts/verify-deploy-artifacts.mjs
 * Exit 0 = all required paths present.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  // Root API (Beanstalk)
  "Dockerfile",
  ".dockerignore",
  // AWS stack
  "deploy/aws/Dockerfile.api",
  "deploy/aws/Dockerfile.web",
  "deploy/aws/Dockerfile.banco-web",
  "deploy/aws/docker-compose.prod.yml",
  "deploy/aws/nginx.conf",
  "deploy/aws/cloudwatch-agent.json",
  "deploy/aws/systemd/banco.service",
  "deploy/aws/scripts/deploy.sh",
  "deploy/aws/scripts/rollback.sh",
  "deploy/aws/scripts/db-migrate.sh",
  "deploy/aws/env/.env.production.example",
  "deploy/aws/env/.env.staging.example",
  "deploy/aws/env/.env.development.example",
  "deploy/aws/reports/00-README.md",
  "deploy/aws/reports/06-READINESS_CHECKLIST_GONOGO.md",
  // GCP
  "deploy/gcp/Dockerfile.api",
  "deploy/gcp/cloudbuild.yaml",
  "deploy/gcp/cloudbuild.deploy.yaml",
  "deploy/gcp/env/.env.production.example",
  // CI/CD
  ".github/workflows/ci.yml",
  ".github/workflows/ci-website.yml",
  ".github/workflows/ci-website-docker.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/sync-aws-virgen.yml",
  // Local test infra
  "docker-compose.test.yml",
  "scripts/run-api-tests-local.mjs",
  // Verification & publish
  "scripts/production-confidence-check.mjs",
  "scripts/website-ci-local.mjs",
  "scripts/staging-p0-smoke.mjs",
  "scripts/generate-aws-virgen-sync-manifest.mjs",
  "scripts/publish-aws-virgen-rc.sh",
  "audit/mobile/REPLIT-SHELL-COPYPASTE.sh",
  "audit/mobile/scripts/post-redeploy-verify.mjs",
  "audit/production-readiness/FULL-DEPLOY-TASK-MATRIX-2026-07-11-AR.md",
  "DUAL_REPO_STATUS.md",
];

const missing = [];
for (const rel of REQUIRED) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) missing.push(rel);
}

console.log("BANCO deploy artifacts verify\n");
if (missing.length === 0) {
  console.log(`[PASS] ${REQUIRED.length}/${REQUIRED.length} required paths present`);
  process.exit(0);
}

console.error(`[FAIL] ${missing.length} missing:\n`);
for (const m of missing) console.error(`  - ${m}`);
process.exit(1);
