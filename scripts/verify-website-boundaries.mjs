#!/usr/bin/env node
/**
 * W0/W2 boundary guard — website surfaces must not import mobile or B2B/admin apps.
 * Run in ci-website.yml before build.
 *
 * Exit 0 = pass, 1 = violation
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WEB_ROOTS = [
  path.join(ROOT, "artifacts", "banco-website"),
  path.join(ROOT, "artifacts", "banco-web"),
  path.join(ROOT, "artifacts", "landing"),
];

const FORBIDDEN_PATTERNS = [
  /@workspace\/banco-mobile\b/,
  /@workspace\/dealer-os\b/,
  /@workspace\/admin-os\b/,
  /@workspace\/api-server\b/,
  /@workspace\/db\b/,
  /from\s+["'][^"']*\/banco-mobile\//,
  /from\s+["'][^"']*\/dealer-os\//,
  /from\s+["'][^"']*\/admin-os\//,
  /from\s+["'][^"']*\/api-server\//,
];

const EXPO_PUBLIC_RE = /process\.env\.EXPO_PUBLIC_/;

const MOBILE_REEXPORT = path.join(
  ROOT,
  "artifacts",
  "banco-mobile",
  "lib",
  "searchParams.ts",
);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

let failed = 0;

const CROSS_SURFACE_PATTERNS = [
  /from\s+["'][^"']*\/artifacts\/landing\//,
  /from\s+["'][^"']*\/artifacts\/banco-web\//,
  /from\s+["'][^"']*\/artifacts\/banco-website\//,
  /import\s+["'][^"']*\/artifacts\/landing\//,
  /import\s+["'][^"']*\/artifacts\/banco-web\//,
  /import\s+["'][^"']*\/artifacts\/banco-website\//,
];

for (const root of WEB_ROOTS) {
  const isBancoWeb =
    root.endsWith(`${path.sep}banco-web`) ||
    root.endsWith(`${path.sep}banco-website`);
  const surfaceName = path.basename(root);
  for (const file of walk(root)) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, "utf8");
    if (FORBIDDEN_PATTERNS.some((re) => re.test(src))) {
      console.error(`[FAIL] forbidden import in ${rel}`);
      failed += 1;
    }
    if (EXPO_PUBLIC_RE.test(src)) {
      console.error(`[FAIL] EXPO_PUBLIC_* in website surface ${rel}`);
      failed += 1;
    }
    if (isBancoWeb && CROSS_SURFACE_PATTERNS.some((re) => re.test(src))) {
      if (/artifacts\/landing/.test(src)) {
        console.error(`[FAIL] ${surfaceName} must not import landing artifact (${rel})`);
        failed += 1;
      }
    }
    if (!isBancoWeb && CROSS_SURFACE_PATTERNS.some((re) => re.test(src))) {
      if (/artifacts\/banco-web(?:site)?/.test(src)) {
        console.error(`[FAIL] landing must not import website artifact (${rel})`);
        failed += 1;
      }
    }
  }
}

const mobileSearch = fs.readFileSync(MOBILE_REEXPORT, "utf8");
if (!mobileSearch.includes("@workspace/search-contract")) {
  console.error("[FAIL] mobile lib/searchParams.ts must re-export @workspace/search-contract");
  failed += 1;
}
if (
  mobileSearch.includes("artifacts/banco-web") ||
  mobileSearch.includes("artifacts/banco-website")
) {
  console.error("[FAIL] mobile searchParams must not import website artifacts");
  failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} website boundary violation(s).`);
  process.exit(1);
}

console.log("Website boundary checks passed.");
