/**
 * After Replit redeploy: prove FRESH (wave 6 + wave 8), then health smoke.
 * Usage:
 *   node audit/mobile/scripts/post-redeploy-verify.mjs [baseUrl]
 *
 * Exit 0 — wave 6 + wave 8 + wave 9 (bio) FRESH + health smoke ok
 * Exit 1 — wave 6 FRESH but wave 8 or bio STALE (partial deploy)
 * Exit 2 — wave 6 STALE (redeploy required)
 *
 * Does not require Clerk JWT (health-only). For full upload smoke set
 * BANCO_API_URL + CLERK_BEARER_TOKEN and run scripts/staging-p0-smoke.mjs.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const base = (process.argv[2] || "https://banco-ca-oom.replit.app").replace(/\/$/, "");
const probe = path.join(root, "audit/mobile/scripts/probe-live-deploy.mjs");
const wave8Probe = path.join(root, "audit/mobile/scripts/probe-wave8-seller-social.mjs");
const wave9BioProbe = path.join(root, "audit/mobile/scripts/probe-wave9-seller-bio.mjs");

const REDEPLOY_SHELL = `
STILL STALE (wave 6).
On Replit Shell paste:

  git fetch origin
  git checkout main
  git pull --ff-only origin main
  pnpm install --frozen-lockfile
  pnpm --filter @workspace/db run push-force
  # Stop → Run api-server workflow

Then re-run:
  node audit/mobile/scripts/post-redeploy-verify.mjs
`;

console.log("=== post-redeploy verify ===\n");
console.log(`Host: ${base}\n`);

const probeRun = spawnSync(process.execPath, [probe, base], {
  encoding: "utf8",
  cwd: root,
});
process.stdout.write(probeRun.stdout || "");
process.stderr.write(probeRun.stderr || "");

if (probeRun.status !== 0) {
  console.log(REDEPLOY_SHELL);
  process.exit(2);
}

console.log("\nWave 6 FRESH. Checking wave 8 (seller.social_links)…\n");

const w8Run = spawnSync(process.execPath, [wave8Probe, base], {
  encoding: "utf8",
  cwd: root,
});
process.stdout.write(w8Run.stdout || "");
process.stderr.write(w8Run.stderr || "");

if (w8Run.status !== 0) {
  console.log(`
PARTIAL DEPLOY — stabilize signals are live but seller.social_links is missing.
Redeploy api-server from origin/main @ 5939849+, then re-run:
  node audit/mobile/scripts/post-redeploy-verify.mjs
`);
  process.exit(1);
}

console.log("\nWave 8 FRESH. Checking v1.1.5 seller.bio + display_title…\n");

const w9Run = spawnSync(process.execPath, [wave9BioProbe, base], {
  encoding: "utf8",
  cwd: root,
});
process.stdout.write(w9Run.stdout || "");
process.stderr.write(w9Run.stderr || "");

if (w9Run.status !== 0) {
  console.log(`
PARTIAL DEPLOY — wave 6+8 live but seller.bio/display_title missing.
Redeploy api-server from origin/main @ 1882523+, then re-run:
  node audit/mobile/scripts/post-redeploy-verify.mjs
`);
  process.exit(1);
}

console.log("\nWave 6 + wave 8 + seller bio FRESH. Running health-only smoke on same host…\n");

const smoke = spawnSync(
  process.execPath,
  [path.join(root, "scripts/staging-p0-smoke.mjs")],
  {
    encoding: "utf8",
    cwd: root,
    env: {
      ...process.env,
      BANCO_API_URL: base,
      // Do not invent tokens — health steps only unless operator already set JWT
    },
  },
);
process.stdout.write(smoke.stdout || "");
process.stderr.write(smoke.stderr || "");

if (smoke.status && smoke.status !== 0) {
  console.log("\nHealth smoke failed — API may be up for search but not ready.");
  process.exit(smoke.status);
}

console.log(`
NEXT:
  1. Set CLERK_BEARER_TOKEN and re-run: node scripts/staging-p0-smoke.mjs
  2. DATABASE_URL → node scripts/verify-upload-claims-schema.mjs
  3. cd artifacts/banco-mobile && eas build --profile preview --platform android
  4. Device QA: audit/mobile/DEVICE-QA-SECTION-COMPANIES.md
`);
process.exit(0);
