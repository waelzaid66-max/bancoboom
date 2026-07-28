#!/usr/bin/env node
/**
 * Local mirror of .github/workflows/ci-website.yml (without Lighthouse/GCS).
 * Safe to run while mobile/API work continues — does not mutate other surfaces.
 *
 * Usage: node scripts/website-ci-local.mjs
 * Exit: 0 pass, 1 fail
 */

import { spawnSync } from "node:child_process";

const steps = [
  {
    label: "website boundaries",
    cmd: "node scripts/verify-website-boundaries.mjs",
  },
  {
    label: "journey parity audit",
    cmd: "node scripts/website-journey-parity-audit.mjs",
  },
  {
    label: "seller workspace parity audit",
    cmd: "node scripts/website-seller-workspace-parity-audit.mjs",
  },
  {
    label: "market copy parity audit",
    cmd: "node scripts/website-market-copy-parity-audit.mjs",
  },
  {
    label: "responsive chrome audit",
    cmd: "node scripts/website-responsive-chrome-audit.mjs",
  },
  {
    label: "plug hardening audit",
    cmd: "node scripts/website-plug-hardening-audit.mjs",
  },
  {
    label: "staging prep audit",
    cmd: "node scripts/website-staging-prep-audit.mjs",
  },
  {
    label: "soft-launch prep audit",
    cmd: "node scripts/website-soft-launch-prep-audit.mjs",
  },
  {
    label: "eslint website",
    cmd: "pnpm run lint:website",
  },
  {
    label: "typecheck website",
    cmd: "pnpm run typecheck:website",
  },
  {
    label: "search-contract tests",
    cmd: "pnpm --filter @workspace/search-contract run test",
  },
  {
    label: "mobile lib smoke (parity)",
    cmd: "pnpm --filter @workspace/banco-mobile run test:lib",
  },
  {
    label: "share rewrite config",
    cmd: "node scripts/website-rewrite-config-audit.mjs",
  },
  {
    label: "build landing",
    cmd: "pnpm --filter @workspace/landing run build",
  },
  {
    label: "build banco-web",
    cmd: "pnpm --filter @workspace/banco-web run build",
  },
  {
    label: "SEO static audit",
    cmd: "node scripts/website-seo-static-audit.mjs",
  },
  {
    label: "bundle budget",
    cmd: "node scripts/website-bundle-budget.mjs",
  },
  {
    label: "post-build route smoke",
    cmd: "node scripts/website-post-build-smoke.mjs",
  },
];

function runStep(label, cmd) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n[FAIL] ${label} (exit ${result.status ?? 1})`);
    return false;
  }
  console.log(`[PASS] ${label}`);
  return true;
}

console.log("BANCO website CI (local) — isolated from mobile deploy\n");

let failed = 0;
for (const step of steps) {
  if (!runStep(step.label, step.cmd)) {
    failed += 1;
    break;
  }
}

if (failed > 0) {
  console.error("\n--- website CI local: FAIL ---");
  process.exit(1);
}

console.log("\n--- website CI local: PASS (11/11) ---");
console.log(
  "Optional after CDN deploy: BANCO_WEB_URL=https://staging.example.com node scripts/website-staging-smoke.mjs",
);
process.exit(0);
