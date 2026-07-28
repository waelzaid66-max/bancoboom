/**
 * Poll live API until post-redeploy-verify passes (wave 6 + wave 8 FRESH).
 * Run this on your PC while you redeploy on Replit Shell.
 *
 * Usage:
 *   node audit/mobile/scripts/replit-redeploy-watch.mjs [baseUrl] [intervalSec] [maxAttempts]
 *
 * Defaults: https://banco-ca-oom.replit.app · 30s · 40 attempts (~20 min)
 *
 * Exit 0 — FRESH (same as post-redeploy-verify)
 * Exit 1 — wave 6 FRESH, wave 8 STALE after max attempts
 * Exit 2 — wave 6 STALE after max attempts
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const base = (process.argv[2] || "https://banco-ca-oom.replit.app").replace(/\/$/, "");
const intervalSec = Math.max(10, Number(process.argv[3]) || 30);
const maxAttempts = Math.max(1, Number(process.argv[4]) || 40);

const verifyScript = path.join(root, "audit/mobile/scripts/post-redeploy-verify.mjs");

const REPLIT_SHELL = `
On Replit Shell (blocking — run now):

  git fetch origin
  git checkout main
  git pull --ff-only origin main
  git log -1 --oneline
  pnpm install --frozen-lockfile
  pnpm --filter @workspace/db run push-force

Then Replit UI: Stop → Run api-server workflow.

Confirm:
  curl -sS ${base}/api/healthz
  curl -sS ${base}/api/readyz
`;

console.log("=== Replit redeploy watch ===\n");
console.log(`Host: ${base}`);
console.log(`Poll: every ${intervalSec}s · max ${maxAttempts} attempts\n`);
console.log(REPLIT_SHELL);

function runVerify() {
  const r = spawnSync(process.execPath, [verifyScript, base], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastStatus = 2;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  console.log(`\n--- attempt ${attempt}/${maxAttempts} @ ${new Date().toISOString()} ---\n`);
  lastStatus = runVerify();
  if (lastStatus === 0) {
    console.log("\n✓ LIVE FRESH — wave 6 + wave 8 + health smoke. Run: pnpm run ops:wave-b\n");
    process.exit(0);
  }
  if (attempt < maxAttempts) {
    console.log(`\nNot FRESH yet (exit ${lastStatus}). Retrying in ${intervalSec}s…\n`);
    await sleep(intervalSec * 1000);
  }
}

console.error(`
\n✗ Still not FRESH after ${maxAttempts} attempts (last exit ${lastStatus}).
Repeat Replit Shell steps above, confirm git log shows main @ dea23b0+.
`);
process.exit(lastStatus === 1 ? 1 : 2);
