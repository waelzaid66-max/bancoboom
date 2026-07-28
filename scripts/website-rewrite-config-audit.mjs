#!/usr/bin/env node
/**
 * W1 gate — verify banco-web proxies public share URLs to the API.
 * Static check only (no running server). Staging validates live /l/:id via
 * website-staging-smoke.mjs + BANCO_LISTING_SMOKE_ID.
 *
 * Exit: 0 pass, 1 fail
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = path.join(ROOT, "artifacts", "banco-web", "next.config.ts");

if (!fs.existsSync(CONFIG)) {
  console.error(`[FAIL] missing ${CONFIG}`);
  process.exit(1);
}

const src = fs.readFileSync(CONFIG, "utf8");
let failed = 0;

function requirePattern(label, pattern) {
  if (!pattern.test(src)) {
    console.error(`[FAIL] ${label}`);
    failed += 1;
    return;
  }
  console.log(`[PASS] ${label}`);
}

requirePattern(
  'next.config rewrites /l/:id to API',
  /source:\s*["']\/l\/:id["']/,
);
requirePattern(
  'next.config rewrites /api/:path* to API',
  /source:\s*["']\/api\/:path\*["']/,
);

if (failed > 0) {
  process.exit(1);
}

console.log("Share rewrite config audit passed.");
