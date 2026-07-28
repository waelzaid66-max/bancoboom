#!/usr/bin/env node
/**
 * Validates GCP Cloud Build + Docker paths so Cloud Build step 1 does not exit 125.
 *
 * Exit 125 = docker CLI failure before build (invalid tag, missing Dockerfile, wrong context).
 *
 * Usage: node scripts/verify-gcp-docker-build-config.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectCloudRunSourceDeployAntiPattern,
  validateImagePathSegment,
} from "./lib/docker-image-reference.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "Dockerfile",
  "cloudbuild.yaml",
  "deploy/gcp/Dockerfile.api",
  "deploy/gcp/cloudbuild.yaml",
  "deploy/gcp/cloudbuild.deploy.yaml",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "artifacts/api-server/package.json",
];

const FORBIDDEN_TAG_PATTERNS = [
  /\$SHORT_SHA\s*$/m, // tag ending with empty SHORT_SHA → invalid reference
];

function imageTagLines(text) {
  return text
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.includes("docker.pkg.dev") ||
        (line.trim().startsWith("- ") && line.includes("${_REGION}")),
    );
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function checkFiles() {
  const missing = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) {
    console.error("[FAIL] missing files:", missing.join(", "));
    return false;
  }
  console.log("[PASS] required GCP/Docker files present");
  return true;
}

function checkDockerfileParity() {
  const root = read("Dockerfile");
  const gcp = read("deploy/gcp/Dockerfile.api");
  const markers = [
    "FROM node:24-bookworm-slim AS builder",
    'pnpm install --frozen-lockfile --filter "@workspace/api-server..."',
    "pnpm --filter @workspace/api-server run build",
    "/api/healthz",
    "dist/index.mjs",
  ];
  for (const m of markers) {
    if (!root.includes(m) || !gcp.includes(m)) {
      console.error("[FAIL] Dockerfile parity: marker missing in root or deploy/gcp:", m);
      return false;
    }
  }
  console.log("[PASS] root Dockerfile and deploy/gcp/Dockerfile.api are aligned");
  return true;
}

function checkCloudBuildUsesBuildId(rel) {
  const text = read(rel);
  if (!text.includes("$BUILD_ID")) {
    console.error(`[FAIL] ${rel}: must tag images with $BUILD_ID (SHORT_SHA alone causes exit 125)`);
    return false;
  }
  if (/\$SHORT_SHA/.test(text) && !/BUILD_ID/.test(text)) {
    console.error(`[FAIL] ${rel}: uses $SHORT_SHA without $BUILD_ID fallback`);
    return false;
  }
  // docker build must use repo-root context (.)
  if (!text.includes("\n      - .\n") && !text.includes("\n      - .\r\n")) {
    const hasDotContext = /-\s*\n\s*-\s*\./.test(text) || text.includes("- .");
    if (!hasDotContext) {
      console.error(`[FAIL] ${rel}: docker build context must be '.' (repository root)`);
      return false;
    }
  }
  console.log(`[PASS] ${rel}: uses $BUILD_ID and repo-root context`);
  return true;
}

function checkForbiddenImageTags() {
  const cloudbuildFiles = [
    "cloudbuild.yaml",
    "deploy/gcp/cloudbuild.yaml",
    "deploy/gcp/cloudbuild.deploy.yaml",
  ];

  for (const rel of cloudbuildFiles) {
    const text = read(rel);
    const tagLines = imageTagLines(text);
    for (const line of tagLines) {
      for (const pattern of FORBIDDEN_TAG_PATTERNS) {
        if (pattern.test(line)) {
          console.error(
            `[FAIL] ${rel}: forbidden image tag line "${line.trim()}" (use $BUILD_ID, not bare $SHORT_SHA)`,
          );
          return false;
        }
      }
      if (/:\s*$/.test(line) && !line.includes("$BUILD_ID") && !line.includes("latest")) {
        console.error(
          `[FAIL] ${rel}: image tag line ends with bare colon — "${line.trim()}"`,
        );
        return false;
      }
    }
  }

  console.log("[PASS] cloudbuild image tags avoid forbidden SHORT_SHA / bare-colon patterns");
  return true;
}

function checkDockerfilePathsInCloudBuild() {
  const rootCb = read("cloudbuild.yaml");
  if (!rootCb.includes("- Dockerfile")) {
    console.error("[FAIL] cloudbuild.yaml must use -f Dockerfile for Console /Dockerfile path");
    return false;
  }
  const gcpCb = read("deploy/gcp/cloudbuild.yaml");
  if (!gcpCb.includes("deploy/gcp/Dockerfile.api")) {
    console.error("[FAIL] deploy/gcp/cloudbuild.yaml must reference deploy/gcp/Dockerfile.api");
    return false;
  }
  console.log("[PASS] cloudbuild Dockerfile paths match documented Console settings");
  return true;
}

function parseSubstitutionDefaults(rel) {
  const text = read(rel);
  const block = text.match(/^substitutions:\s*\n([\s\S]*?)(?=^[^\s]|\nsteps:)/m);
  if (!block) return {};
  const out = {};
  for (const line of block[1].split(/\r?\n/)) {
    const m = line.match(/^\s+_([A-Z0-9_]+):\s*(.+?)\s*$/);
    if (m) out[`_${m[1]}`] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function checkSubstitutionSegments() {
  const files = [
    "cloudbuild.yaml",
    "deploy/gcp/cloudbuild.yaml",
    "deploy/gcp/cloudbuild.deploy.yaml",
  ];
  const keys = ["_AR_REPO", "_IMAGE_NAME", "_SERVICE"];
  let ok = true;
  for (const rel of files) {
    const subs = parseSubstitutionDefaults(rel);
    for (const key of keys) {
      const val = subs[key];
      if (!val || val.includes("$")) continue;
      const v = validateImagePathSegment(val);
      if (!v.ok) {
        console.error(`[FAIL] ${rel}: substitution ${key}=${val} — ${v.reason}`);
        ok = false;
      }
    }
  }
  if (ok) {
    console.log("[PASS] _AR_REPO / _IMAGE_NAME / _SERVICE substitutions are valid OCI segments");
  }
  return ok;
}

function checkDocumentedAntiPatterns() {
  const needles = [
    "cloud-run-source-deploy/-banco-ca-oom-",
    "cloud-run-source-deploy/-BANCO-CA-OOM-",
  ];
  const docPaths = [
    "deploy/gcp/TRIGGER_MIGRATION.md",
    "deploy/gcp/README.md",
    "deploy/gcp/BANCOOOM_CANONICAL_DEPLOY.md",
  ];
  let ok = true;
  for (const rel of docPaths) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const text = read(rel);
    if (!text.includes("cloud-run-source-deploy")) {
      console.error(`[FAIL] ${rel}: must document cloud-run-source-deploy / invalid repo name fix`);
      ok = false;
    }
  }
  const sample =
    "me-central1-docker.pkg.dev/project-6a1ad54e-d0fe-46a4-afc/cloud-run-source-deploy/-banco-ca-oom-/banco-oom:deadbeef";
  const anti = detectCloudRunSourceDeployAntiPattern(sample);
  if (!anti.forbidden) {
    console.error("[FAIL] anti-pattern detector should flag cloud-run-source-deploy/-banco-ca-oom-");
    ok = false;
  }
  for (const n of needles) {
    let found = false;
    for (const rel of docPaths) {
      if (fs.existsSync(path.join(ROOT, rel)) && read(rel).includes(n.split("/")[1])) {
        found = true;
        break;
      }
    }
    if (!found) {
      console.error(`[FAIL] docs must mention invalid segment like ${n.split("/")[1]}`);
      ok = false;
    }
  }
  if (ok) {
    console.log("[PASS] documented Cloud Run source-deploy anti-pattern (-banco-ca-oom-)");
  }
  return ok;
}

function checkCloudRunDeploySafety() {
  const deploy = read("deploy/gcp/cloudbuild.deploy.yaml");
  if (!deploy.includes("_ALLOW_UNAUTH")) {
    console.error("[FAIL] deploy/gcp/cloudbuild.deploy.yaml must define _ALLOW_UNAUTH substitution");
    return false;
  }
  if (deploy.includes("--allow-unauthenticated") && !deploy.includes('if [ "${_ALLOW_UNAUTH}" = "true" ]')) {
    console.error(
      "[FAIL] deploy/gcp/cloudbuild.deploy.yaml should not force --allow-unauthenticated; gate it with _ALLOW_UNAUTH",
    );
    return false;
  }
  if (!deploy.includes("artifacts repositories describe")) {
    console.error("[FAIL] deploy/gcp/cloudbuild.deploy.yaml should preflight Artifact Registry repository existence");
    return false;
  }
  console.log("[PASS] cloudbuild deploy safety guards are present (_ALLOW_UNAUTH + preflight)");
  return true;
}

function main() {
  let ok = true;
  ok = checkFiles() && ok;
  ok = checkDockerfileParity() && ok;
  ok = checkCloudBuildUsesBuildId("cloudbuild.yaml") && ok;
  ok = checkCloudBuildUsesBuildId("deploy/gcp/cloudbuild.yaml") && ok;
  ok = checkCloudBuildUsesBuildId("deploy/gcp/cloudbuild.deploy.yaml") && ok;
  ok = checkForbiddenImageTags() && ok;
  ok = checkSubstitutionSegments() && ok;
  ok = checkDocumentedAntiPatterns() && ok;
  ok = checkDockerfilePathsInCloudBuild() && ok;
  ok = checkCloudRunDeploySafety() && ok;

  if (ok) {
    console.log("\nGCP Docker/Cloud Build config OK. Use build context = repository root (.).");
    process.exit(0);
  }
  console.error("\nFix the issues above before running Cloud Build.");
  process.exit(1);
}

main();
