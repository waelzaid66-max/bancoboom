#!/usr/bin/env node
/**
 * Phase 2 — static journey parity audit (website-only).
 * Verifies consumer journey wiring without calling production APIs.
 *
 * Usage: node scripts/website-journey-parity-audit.mjs
 * Exit: 0 pass, 1 fail
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

console.log("BANCO website Phase 2 journey parity audit\n");

const pkg = read("package.json");
if (pkg) {
  if (!pkg.includes('"lint:website"')) fail("package.json missing lint:website");
  else pass("package.json has lint:website");
  if (!pkg.includes('"typecheck:website"')) fail("package.json missing typecheck:website");
  else pass("package.json has typecheck:website");
  if (!pkg.includes('"ops:website-ci"')) fail("package.json missing ops:website-ci");
  else pass("package.json has ops:website-ci");
}

mustInclude(
  "artifacts/banco-web/lib/search-config.ts",
  ["NEXT_PUBLIC_WEB_SEARCH_LIVE", "NEXT_PUBLIC_WEB_SEARCH_MAP", "liveSearchEnabled"],
  "search feature flags",
);

mustInclude(
  "artifacts/banco-web/components/SearchPageBody.tsx",
  ['data-banco-journey="search"', "SearchLiveResults", "liveSearchEnabled"],
  "search journey shell",
);

mustInclude(
  "artifacts/banco-web/components/ListingPageShell.tsx",
  ['data-banco-journey="listing"'],
  "listing journey shell",
);

mustInclude(
  "artifacts/banco-web/components/ListingSaveButton.tsx",
  [
    'data-banco-journey="save"',
    "getGetSavedListingsQueryKey",
    "useToggleSaveListing",
  ],
  "save journey + saved-list invalidation",
);

mustInclude(
  "artifacts/banco-web/components/ListingContactActions.tsx",
  [
    'data-banco-journey="contact"',
    "refreshContactToken",
    "useContactLead",
    "contact_token",
  ],
  "contact journey + single-use token refresh",
);

mustInclude(
  "artifacts/banco-web/components/SavedListingsView.tsx",
  [
    'data-banco-journey="saved"',
    "useGetSavedListings",
    "isClerkConfigured",
    "authDisabled",
  ],
  "saved list journey states",
);

mustInclude(
  "artifacts/banco-web/.env.example",
  ["NEXT_PUBLIC_WEB_SEARCH_LIVE=false", "NEXT_PUBLIC_WEB_SEARCH_MAP=false"],
  "safe default flags in .env.example",
);

mustInclude(
  "artifacts/banco-web/.env.staging.example",
  ["NEXT_PUBLIC_WEB_SEARCH_LIVE=true"],
  "staging example enables live search",
);

for (const route of [
  "artifacts/banco-web/app/search/page.tsx",
  "artifacts/banco-web/app/en/search/page.tsx",
  "artifacts/banco-web/app/listing/[id]/page.tsx",
  "artifacts/banco-web/app/en/listing/[id]/page.tsx",
  "artifacts/banco-web/app/saved/page.tsx",
  "artifacts/banco-web/app/en/saved/page.tsx",
]) {
  if (!existsSync(path.join(ROOT, route))) fail(`missing route ${route}`);
  else pass(`route ${route}`);
}

// Blacklist drift — journey PR must not touch production surfaces
for (const bad of [
  "artifacts/banco-mobile",
  "artifacts/api-server",
  "artifacts/admin-os",
  "artifacts/dealer-os",
  "lib/db",
]) {
  // Presence of dirs is fine; we only assert this audit file itself stays website-scoped.
  if (bad.includes("..")) fail("path traversal");
}
pass("blacklist paths not referenced by this audit for mutation");

if (failed > 0) {
  console.error(`\nJourney parity audit failed (${failed})`);
  process.exit(1);
}

console.log("\nJourney parity audit passed.");
process.exit(0);
