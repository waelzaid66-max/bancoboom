#!/usr/bin/env node
/**
 * Lighthouse SEO smoke for running banco-web (W1 gate).
 *
 * Prereq: production build + `pnpm --filter @workspace/banco-web start`
 *
 * Usage:
 *   BANCO_WEB_URL=http://127.0.0.1:3000 node scripts/website-lighthouse-smoke.mjs
 *   WEBSITE_MIN_SEO_SCORE=85 node scripts/website-lighthouse-smoke.mjs
 */

import { spawnSync } from "node:child_process";

const BASE = (process.env.BANCO_WEB_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const MIN_SEO = Number(process.env.WEBSITE_MIN_SEO_SCORE ?? 85);
const PATHS = (process.env.WEBSITE_LIGHTHOUSE_PATHS || "/,/cars,/real-estate")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

let failed = 0;

function runLighthouse(url) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(
    npx,
    [
      "lighthouse",
      url,
      "--only-categories=seo",
      "--output=json",
      "--quiet",
      "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
    ],
    {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
      shell: process.platform === "win32",
    },
  );
}

for (const route of PATHS) {
  const url = `${BASE}${route.startsWith("/") ? route : `/${route}`}`;
  console.log(`Lighthouse SEO → ${url}`);
  const result = runLighthouse(url);

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout || "lighthouse failed");
    failed += 1;
    continue;
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    console.error(`[FAIL] ${route}: invalid lighthouse JSON`);
    failed += 1;
    continue;
  }

  const score = report.categories?.seo?.score;
  if (typeof score !== "number") {
    console.error(`[FAIL] ${route}: missing SEO score`);
    failed += 1;
    continue;
  }

  const pct = Math.round(score * 100);
  if (pct < MIN_SEO) {
    console.error(`[FAIL] ${route}: SEO ${pct} < ${MIN_SEO}`);
    failed += 1;
  } else {
    console.log(`[PASS] ${route}: SEO ${pct}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} Lighthouse failure(s).`);
  process.exit(1);
}

console.log("\nLighthouse SEO smoke passed.");
