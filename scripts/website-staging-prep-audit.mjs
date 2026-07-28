#!/usr/bin/env node
/**
 * Phase 7 / W9 — static audit that staging deploy wiring is complete
 * before OPS points a CDN at banco-web.
 *
 * Exit 0 = PASS. Does not require a live URL (use website-staging-smoke.mjs for that).
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

console.log("BANCO website Phase 7 staging prep audit\n");

mustInclude(
  "deploy/aws/Dockerfile.banco-web",
  [
    "NEXT_PUBLIC_WEB_MARKET_COPY",
    "NEXT_PUBLIC_MARKET_URL",
    "NEXT_PUBLIC_ADMIN_URL",
    "NEXT_PUBLIC_WEB_SEARCH_LIVE",
  ],
  "Dockerfile bakes Market copy + surface URLs",
);

mustInclude(
  "deploy/aws/docker-compose.banco-web.yml",
  [
    "NEXT_PUBLIC_WEB_MARKET_COPY",
    "WEB_PLUG_ENABLED",
    "consumer-web",
  ],
  "compose wires Market copy + runtime plug",
);

mustInclude(
  "deploy/aws/env/.env.banco-web.staging.example",
  [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_WEB_MARKET_COPY",
    "WEB_PLUG_ENABLED",
    "NEXT_PUBLIC_WEB_SEARCH_LIVE=false",
  ],
  "AWS staging env template safe defaults",
);

mustInclude(
  "artifacts/banco-web/.env.staging.example",
  [
    "NEXT_PUBLIC_WEB_MARKET_COPY",
    "WEB_PLUG_ENABLED",
    "NEXT_PUBLIC_WEB_SEARCH_LIVE=true",
  ],
  "banco-web staging env (journey LIVE + plug documented)",
);

mustInclude(
  "scripts/website-staging-smoke.mjs",
  ["plug", "/api/health", "/maintenance", "BANCO_WEB_EXPECT_PLUG", "data-banco-journey"],
  "staging smoke covers plug + maintenance + brand",
);

mustInclude(
  "audit/website/WEBSITE-STAGING-OPS-CHECKLIST-AR.md",
  ["WEB_PLUG_ENABLED", "website-staging-smoke", "consumer-web"],
  "staging OPS checklist present",
);

mustInclude(
  "audit/website/WEBSITE-TRANSFER-HANDOFF-AR.md",
  ["WEB_PLUG_ENABLED", "artifacts/banco-web"],
  "transfer handoff present",
);

mustExist("audit/website/WEBSITE-PHASE7-STAGING-PACK-STATUS-AR.md");

console.log(failed > 0 ? "\nStaging prep audit FAILED" : "\nStaging prep audit PASSED");
process.exit(failed > 0 ? 1 : 0);
