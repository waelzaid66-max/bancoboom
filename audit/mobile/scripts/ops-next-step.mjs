/**
 * Prints the next honest step on the mobile publish path.
 * Usage: node audit/mobile/scripts/ops-next-step.mjs [baseUrl]
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tryLoadLocalSecrets } from "../../../scripts/load-local-secrets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const base = process.argv[2] || process.env.BANCO_API_URL || process.env.API_URL || "https://banco-ca-oom.replit.app";
const probe = path.join(root, "audit/mobile/scripts/probe-live-deploy.mjs");
const wave8Probe = path.join(root, "audit/mobile/scripts/probe-wave8-seller-social.mjs");
const codeGate = path.join(root, "audit/mobile/scripts/pre-redeploy-code-gate.mjs");

tryLoadLocalSecrets();

const hasSmokeSecrets = Boolean(
  process.env.BANCO_API_URL || process.env.API_URL,
) && Boolean(process.env.CLERK_BEARER_TOKEN || process.env.BEARER_TOKEN);
const hasDb = Boolean(process.env.DATABASE_URL);
const hasExpo = Boolean(process.env.EXPO_TOKEN);

console.log("=== BANCO mobile publish — next step ===\n");
console.log(`Repo root: ${root}`);
console.log(`Probe host: ${base}`);
console.log(`Smoke secrets: ${hasSmokeSecrets ? "present" : "missing (need CLERK_BEARER_TOKEN)"}`);
console.log(`DATABASE_URL: ${hasDb ? "present" : "missing"}`);
console.log(`EXPO_TOKEN: ${hasExpo ? "present" : "missing"}`);
console.log("");

if (!existsSync(probe)) {
  console.error("Missing probe script:", probe);
  process.exit(1);
}

if (existsSync(codeGate)) {
  const gate = spawnSync(process.execPath, [codeGate], { encoding: "utf8", cwd: root });
  process.stdout.write(gate.stdout || "");
  process.stderr.write(gate.stderr || "");
  if (gate.status !== 0) {
    console.error("\nFix branch code before redeploy.");
    process.exit(1);
  }
  console.log("");
}

const result = spawnSync(process.execPath, [probe, base], {
  encoding: "utf8",
  cwd: root,
});
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");

const fresh = result.status === 0;

if (existsSync(wave8Probe)) {
  const w8 = spawnSync(process.execPath, [wave8Probe, base], {
    encoding: "utf8",
    cwd: root,
  });
  process.stdout.write(w8.stdout || "");
  process.stderr.write(w8.stderr || "");
  if (w8.status !== 0 && fresh) {
    console.log(`
WAVE 8 PARTIAL — stabilize API is FRESH but seller.social_links is not on the live host.
Redeploy Replit from origin/main (5939849+), then re-run:
  node audit/mobile/scripts/probe-wave8-seller-social.mjs
`);
  }
  console.log("");
}

if (!fresh) {
  console.log(`
NEXT (blocking) — paste on Replit Shell:
  git fetch origin
  git checkout main
  git pull --ff-only origin main
  pnpm install --frozen-lockfile
  pnpm --filter @workspace/db run push-force
  # Stop → Run api-server, then on your PC:
  node audit/mobile/scripts/post-redeploy-verify.mjs

Full runbook: audit/mobile/NEXT-OPS-REPLIT-REDEPLOY.md
`);
  process.exit(2);
}

if (!hasSmokeSecrets) {
  console.log(`
LIVE is FRESH.
NEXT:
  $env:BANCO_API_URL = "${base}"
  $env:CLERK_BEARER_TOKEN = "<Clerk JWT>"
  node scripts/staging-p0-smoke.mjs
`);
  process.exit(0);
}

console.log(`
LIVE is FRESH + smoke secrets present.
NEXT:
  $env:BANCO_API_URL = "${base}"
  node scripts/staging-p0-smoke.mjs
  node scripts/verify-upload-claims-schema.mjs   # needs DATABASE_URL
  cd artifacts/banco-mobile && eas build --profile preview --platform android
  Then Device QA checklists under audit/mobile/
`);
process.exit(0);

