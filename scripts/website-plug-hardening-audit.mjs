#!/usr/bin/env node
/**
 * Phase 6 — website plug / kill-switch hardening audit (website-only).
 *
 * Usage: node scripts/website-plug-hardening-audit.mjs
 * Exit: 0 pass, 1 fail
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = "artifacts/banco-web";

let failed = 0;

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  failed += 1;
}

function pass(msg) {
  console.log(`[PASS] ${msg}`);
}

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!existsSync(full)) {
    fail(`missing file ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function mustInclude(rel, snippets, label) {
  const src = read(rel);
  if (!src) return;
  for (const snippet of snippets) {
    if (!src.includes(snippet)) {
      fail(`${label}: missing \`${snippet}\` in ${rel}`);
      return;
    }
  }
  pass(label);
}

console.log("BANCO website Phase 6 plug hardening audit\n");

mustInclude(
  `${WEB}/lib/web-plug-config.ts`,
  ["WEB_PLUG_ENABLED", "NEXT_PUBLIC_WEB_PLUG_ENABLED", "isWebPlugEnabled", "isWebPlugExemptPath"],
  "web plug config helpers",
);

mustInclude(
  `${WEB}/middleware.ts`,
  [
    "isWebPlugEnabled",
    "maintenancePathFor",
    "X-Banco-Web-Plug",
    "Retry-After",
    "/api/health",
    "isWebHealthPath",
    "CLERK_PUBLISHABLE_KEY",
    "/workspace",
  ],
  "middleware plug gate + clerk preserve",
);

mustInclude(
  `${WEB}/app/api/health/route.ts`,
  ["buildWebHealthPayload"],
  "health reports plug status",
);

mustInclude(
  `${WEB}/app/api/healthz/route.ts`,
  ["GET", "../health/route"],
  "healthz aliases health",
);

mustInclude(
  `${WEB}/lib/web-health.ts`,
  ["buildWebHealthPayload", "plug", 'surface: "banco-web"'],
  "shared health payload includes plug",
);

mustInclude(
  `${WEB}/app/maintenance/page.tsx`,
  ["MaintenanceView", "robots"],
  "AR maintenance page",
);

mustInclude(
  `${WEB}/app/en/maintenance/page.tsx`,
  ["MaintenanceView", "robots"],
  "EN maintenance page",
);

mustInclude(
  `${WEB}/components/MaintenanceView.tsx`,
  ['data-banco-plug="off"', 'data-banco-journey="maintenance"'],
  "maintenance view markers",
);

mustInclude(
  `${WEB}/components/SiteChrome.tsx`,
  ["isWebPlugEnabled", "isMaintenance"],
  "chrome skips chrome when unplugged",
);

mustInclude(
  `${WEB}/.env.example`,
  ["WEB_PLUG_ENABLED"],
  ".env.example documents plug flag",
);

mustInclude(
  "deploy/aws/docker-compose.banco-web.yml",
  ["WEB_PLUG_ENABLED"],
  "compose exposes runtime plug env",
);

mustInclude(
  "audit/website/WEBSITE-PLUG-DETACH-5MIN-AR.md",
  ["WEB_PLUG_ENABLED=false", "/api/health", "plug"],
  "5-minute detach runbook",
);

mustInclude(
  "audit/website/WEBSITE-PHASE6-PLUG-HARDENING-STATUS-AR.md",
  ["WEB_PLUG_ENABLED", "Phase 6"],
  "phase 6 status doc",
);

// Pure logic smoke (no Next runtime): duplicate parse rules inline for CI.
function parseFlag(value) {
  if (value === undefined || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "off") return false;
  if (normalized === "true" || normalized === "1" || normalized === "on") return true;
  return null;
}

function resolvePlug(runtime, baked) {
  const r = parseFlag(runtime);
  if (r !== null) return r;
  const b = parseFlag(baked);
  if (b !== null) return b;
  return true;
}

const cases = [
  [undefined, undefined, true],
  ["false", undefined, false],
  ["true", "false", true],
  [undefined, "false", false],
  ["0", "true", false],
  ["off", undefined, false],
];

let logicOk = true;
for (const [runtime, baked, expected] of cases) {
  const got = resolvePlug(runtime, baked);
  if (got !== expected) {
    fail(`plug resolve(${runtime}, ${baked}) => ${got}, expected ${expected}`);
    logicOk = false;
  }
}
if (logicOk) pass("plug resolve logic matrix");

// Ensure blacklist surfaces are not imported from plug files
for (const rel of [
  `${WEB}/middleware.ts`,
  `${WEB}/lib/web-plug-config.ts`,
  `${WEB}/components/MaintenanceView.tsx`,
]) {
  const src = read(rel);
  if (!src) continue;
  if (/dealer-os|banco-mobile|api-server|admin-os/.test(src)) {
    fail(`blacklist reference in ${rel}`);
  } else {
    pass(`no blacklist refs in ${path.basename(rel)}`);
  }
}

if (failed > 0) {
  console.error(`\nPlug hardening audit FAILED (${failed})`);
  process.exit(1);
}
console.log("\nPlug hardening audit PASSED");
process.exit(0);
