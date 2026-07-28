#!/usr/bin/env node
/**
 * Phase 4 — BANCO Market copy parity audit (website-only).
 * Ensures web Market copy lives in banco-web via shared API — never imports dealer-os.
 *
 * Usage: node scripts/website-market-copy-parity-audit.mjs
 * Exit: 0 pass, 1 fail
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
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

function mustNotInclude(rel, snippets, label) {
  const src = read(rel);
  if (!src) return;
  for (const snippet of snippets) {
    if (src.includes(snippet)) {
      fail(`${label}: forbidden \`${snippet}\` in ${rel}`);
      return;
    }
  }
  pass(label);
}

function walkTsx(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsx(full, out);
    else if (/\.(tsx?|jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

console.log("BANCO website Phase 4 Market copy parity audit\n");

for (const route of [
  `${WEB}/app/workspace/b2b/page.tsx`,
  `${WEB}/app/workspace/b2b/rfqs/page.tsx`,
  `${WEB}/app/workspace/b2b/supply/page.tsx`,
  `${WEB}/app/en/workspace/b2b/page.tsx`,
  `${WEB}/app/en/workspace/b2b/rfqs/page.tsx`,
  `${WEB}/app/en/workspace/b2b/supply/page.tsx`,
]) {
  if (!existsSync(path.join(ROOT, route))) fail(`missing route ${route}`);
  else pass(`route ${route}`);
}

mustInclude(
  `${WEB}/lib/market-copy-config.ts`,
  ["NEXT_PUBLIC_WEB_MARKET_COPY", "isWebMarketCopyEnabled"],
  "market copy feature flag",
);

mustInclude(
  `${WEB}/components/workspace/WorkspaceB2bPanel.tsx`,
  [
    "isWebMarketCopyEnabled",
    "MarketDashboardPanel",
    "MarketRfqsPanel",
    "MarketSupplyPanel",
    'data-banco-journey="market-copy"',
    "marketClassicTitle",
  ],
  "workspace B2B panel market copy switch",
);

mustInclude(
  `${WEB}/components/workspace/market/MarketDashboardPanel.tsx`,
  ["useGetDealerStats", "useGetMarketTrends", 'data-banco-journey="market-overview"'],
  "market dashboard panel API wiring",
);

mustInclude(
  `${WEB}/components/workspace/market/MarketRfqsPanel.tsx`,
  ["useListRfqs", 'data-banco-journey="market-rfqs"', "RfqCreateForm"],
  "market RFQs panel API wiring",
);

mustInclude(
  `${WEB}/components/workspace/market/RfqCreateForm.tsx`,
  [
    "useCreateRfq",
    "getListRfqsQueryKey",
    "getListMyRfqsQueryKey",
    'data-banco-journey="market-rfq-create"',
    "createRfq",
  ],
  "market RFQ create form write MVP",
);

mustInclude(
  `${WEB}/components/workspace/market/MarketSupplyPanel.tsx`,
  ["useListGlobalSupply", 'data-banco-journey="market-supply"', 'status: "open"'],
  "market supply panel API wiring",
);

mustInclude(
  `${WEB}/components/workspace/market/MarketTabs.tsx`,
  ["/rfqs", "/supply", "marketTabOverview"],
  "market tabs routes",
);

mustInclude(
  `${WEB}/lib/site-nav-model.ts`,
  ["isWebMarketCopyEnabled", "marketNavWebCopy", "/workspace/b2b"],
  "main nav web market entry",
);


mustInclude(
  `${WEB}/.env.example`,
  ["NEXT_PUBLIC_WEB_MARKET_COPY"],
  ".env.example documents WEB_MARKET_COPY",
);

mustInclude(
  `${WEB}/lib/workspace-ui-copy.ts`,
  [
    "marketCopyTitle",
    "marketTabRfqs",
    "marketNavWebCopy",
    "marketRfqCreateTitle",
    "marketRfqCreateSubmit",
  ],
  "workspace UI copy market strings",
);

// Hard rule: no dealer-os imports inside banco-web
const webFiles = walkTsx(path.join(ROOT, WEB));
let dealerImportHits = 0;
for (const file of webFiles) {
  const src = readFileSync(file, "utf8");
  if (
    src.includes("artifacts/dealer-os") ||
    src.includes("@workspace/dealer-os") ||
    /from\s+["'][^"']*dealer-os/.test(src)
  ) {
    fail(`dealer-os import in ${path.relative(ROOT, file)}`);
    dealerImportHits += 1;
  }
}
if (dealerImportHits === 0) pass("no dealer-os imports in banco-web");

mustNotInclude(
  `${WEB}/components/workspace/market/MarketDashboardPanel.tsx`,
  ["@/components/ui/", "dealer-os"],
  "dashboard panel avoids dealer-os UI kit",
);

if (failed > 0) {
  console.error(`\nMarket copy parity audit FAILED (${failed})`);
  process.exit(1);
}
console.log("\nMarket copy parity audit PASSED");
process.exit(0);
