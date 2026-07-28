/**
 * Combined live deploy proof — wave 6 (stabilize) + wave 8 (seller.social_links).
 * Writes audit/mobile/live-probes/YYYY-MM-DD-full-deploy-proof.json
 *
 * Usage: node audit/mobile/scripts/probe-full-deploy.mjs [baseUrl]
 *
 * Exit 0 — both FRESH
 * Exit 1 — wave 6 FRESH, wave 8 STALE
 * Exit 2 — wave 6 STALE or inconclusive
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const base = (process.argv[2] || process.env.BANCO_API_URL || "https://banco-ca-oom.replit.app").replace(
  /\/$/,
  "",
);
const probe6 = path.join(root, "audit/mobile/scripts/probe-live-deploy.mjs");
const probe8 = path.join(root, "audit/mobile/scripts/probe-wave8-seller-social.mjs");
const outDir = path.join(root, "audit/mobile/live-probes");
const stamp = new Date().toISOString().slice(0, 10);
const outFile = path.join(outDir, `${stamp}-full-deploy-proof.json`);

function runJson(script) {
  const r = spawnSync(process.execPath, [script, base], { encoding: "utf8", cwd: root });
  const text = (r.stdout || "").trim();
  let body = null;
  try {
    const start = text.indexOf("{");
    body = start >= 0 ? JSON.parse(text.slice(start)) : { raw: text };
  } catch {
    body = { raw: text };
  }
  return { status: r.status ?? 1, body, stderr: r.stderr || "" };
}

const w6 = runJson(probe6);
const w8 = w6.status === 0 ? runJson(probe8) : { status: 2, body: { skipped: true }, stderr: "" };

function gitHead() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", cwd: root });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}

const report = {
  generatedAt: new Date().toISOString(),
  base,
  repo: {
    branch: "main",
    head: gitHead(),
    wave8Feature: "5939849+",
  },
  wave6: { exit: w6.status, ...w6.body },
  wave8: { exit: w8.status, ...w8.body },
  verdict:
    w6.status !== 0
      ? "STALE — redeploy API from origin/main"
      : w8.status !== 0
        ? "PARTIAL — wave 6 FRESH, wave 8 STALE (seller.social_links missing)"
        : "FRESH — wave 6 + wave 8 deployed",
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote: ${outFile}`);

if (w6.status !== 0) process.exit(2);
if (w8.status !== 0) process.exit(1);
process.exit(0);
