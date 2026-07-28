/**
 * Wave B — run after Live API is FRESH (post-redeploy exit 0).
 * Loads .secrets/local.env when present; never prints secret values.
 *
 * Usage:
 *   node audit/mobile/scripts/wave-b-after-fresh.mjs [baseUrl]
 *
 * Exit:
 *   0 — all runnable steps passed (may skip upload if no CLERK_BEARER_TOKEN)
 *   1 — a step failed
 *   2 — Live still STALE (redeploy required first)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tryLoadLocalSecrets } from "../../../scripts/load-local-secrets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const base = (process.argv[2] || process.env.BANCO_API_URL || process.env.API_URL || "https://banco-ca-oom.replit.app").replace(/\/$/, "");

tryLoadLocalSecrets();
process.env.BANCO_API_URL = base;

function run(label, scriptRel, extraArgs = []) {
  const script = path.join(root, scriptRel);
  console.log(`\n--- ${label} ---\n`);
  const r = spawnSync(process.execPath, [script, ...extraArgs], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

console.log("=== Wave B (after FRESH) ===\n");
console.log(`Host: ${base}`);
console.log(
  "Secrets:",
  JSON.stringify({
    BANCO_API_URL: Boolean(process.env.BANCO_API_URL || process.env.API_URL),
    CLERK_BEARER_TOKEN: Boolean(process.env.CLERK_BEARER_TOKEN || process.env.BEARER_TOKEN),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    EXPO_TOKEN: Boolean(process.env.EXPO_TOKEN),
  }),
);

const probeStatus = run("1) Live freshness (wave 6)", "audit/mobile/scripts/probe-live-deploy.mjs", [base]);
if (probeStatus === 2) {
  console.error(`
Live is STALE — Wave B cannot start honestly.
Run Replit redeploy first (see audit/mobile/NEXT-OPS-REPLIT-REDEPLOY.md), then:
  node audit/mobile/scripts/post-redeploy-verify.mjs
`);
  process.exit(2);
}
if (probeStatus !== 0) {
  process.exit(probeStatus);
}

const wave8Status = run("2) Wave 8 seller.social_links", "audit/mobile/scripts/probe-wave8-seller-social.mjs", [
  base,
]);
if (wave8Status === 2) {
  console.error(`
Wave 8 STALE — seller.social_links not on live API.
Redeploy from origin/main @ 5939849+ before upload/EAS claims.
`);
  process.exit(1);
}
if (wave8Status !== 0) {
  process.exit(wave8Status);
}

const smokeStatus = run("3) Staging P0 smoke", "scripts/staging-p0-smoke.mjs");
if (smokeStatus !== 0) {
  process.exit(smokeStatus);
}

if (process.env.DATABASE_URL) {
  const schemaStatus = run("4) upload_claims schema", "scripts/verify-upload-claims-schema.mjs");
  if (schemaStatus !== 0) {
    console.warn("\n[WARN] Schema verify failed — check DATABASE_URL reachability from this network.");
  }
} else {
  console.warn("\n[SKIP] DATABASE_URL not set — upload_claims schema verify skipped.");
}

console.log(`
--- Wave B local automation done ---

NEXT (operator):
  1. Add CLERK_BEARER_TOKEN to .secrets/local.env if upload steps were skipped
  2. Re-run: node audit/mobile/scripts/wave-b-after-fresh.mjs
  3. cd artifacts/banco-mobile && eas build --profile preview --platform android
  4. Device QA: audit/mobile/DEVICE-QA-SECTION-COMPANIES.md
`);

process.exit(0);
