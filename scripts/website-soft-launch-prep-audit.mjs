#!/usr/bin/env node
/**
 * Phase 8 — soft-launch prep audit (static).
 * Ensures production-safe wiring before limited public CDN traffic.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
let failed = 0;

function fail(label, detail) {
  console.error(`[FAIL] ${label}: ${detail}`);
  failed += 1;
}

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function mustExist(rel) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    fail(rel, "missing file");
    return null;
  }
  pass(`exists ${rel}`);
  return abs;
}

function mustInclude(rel, needles, label) {
  const abs = mustExist(rel);
  if (!abs) return;
  const text = readFileSync(abs, "utf8");
  for (const n of needles) {
    if (!text.includes(n)) {
      fail(label || rel, `missing ${JSON.stringify(n)}`);
      return;
    }
  }
  pass(label || rel);
}

console.log("BANCO website Phase 8 soft-launch prep audit\n");

mustInclude(
  "artifacts/banco-web/app/api/healthz/route.ts",
  ["GET", "../health/route"],
  "healthz aliases health route",
);

mustInclude(
  "artifacts/banco-web/lib/web-health.ts",
  ["buildWebHealthPayload", "isWebHealthPath", "/api/healthz"],
  "shared health payload + paths",
);

mustInclude(
  "artifacts/banco-web/lib/web-plug-config.ts",
  ["/api/healthz", "isWebPlugExemptPath"],
  "plug exempts healthz",
);

mustInclude(
  "artifacts/banco-web/middleware.ts",
  ["isWebHealthPath", "/api/healthz"],
  "middleware keeps healthz up when unplugged",
);

mustInclude(
  "deploy/aws/env/.env.banco-web.production.example",
  [
    "NEXT_PUBLIC_WEB_SEARCH_LIVE=false",
    "NEXT_PUBLIC_WEB_SEARCH_MAP=false",
    "NEXT_PUBLIC_WEB_MARKET_COPY=false",
    "WEB_PLUG_ENABLED=true",
  ],
  "production env soft-launch safe defaults",
);

mustInclude(
  "artifacts/banco-web/.env.example",
  ["NEXT_PUBLIC_WEB_SEARCH_LIVE=false", "WEB_PLUG_ENABLED=true"],
  "dev/prod example keeps LIVE off by default",
);

mustInclude(
  "scripts/website-staging-smoke.mjs",
  ["/api/healthz", "healthz"],
  "smoke covers healthz alias",
);

mustInclude(
  "audit/website/WEBSITE-SOFT-LAUNCH-CHECKLIST-AR.md",
  ["WEB_PLUG_ENABLED", "NEXT_PUBLIC_WEB_SEARCH_LIVE=false", "healthz"],
  "soft-launch checklist present",
);

mustExist("audit/website/WEBSITE-PHASE8-SOFT-LAUNCH-STATUS-AR.md");

console.log(failed > 0 ? "\nSoft-launch prep audit FAILED" : "\nSoft-launch prep audit PASSED");
process.exit(failed > 0 ? 1 : 0);
