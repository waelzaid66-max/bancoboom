#!/usr/bin/env node
/**
 * Phase 3 — seller workspace parity audit (website-only).
 * Static checks for create/edit/manage/leads/messages wiring.
 *
 * Usage: node scripts/website-seller-workspace-parity-audit.mjs
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

console.log("BANCO website Phase 3 seller workspace parity audit\n");

for (const route of [
  "artifacts/banco-web/app/workspace/page.tsx",
  "artifacts/banco-web/app/workspace/listings/page.tsx",
  "artifacts/banco-web/app/workspace/listings/new/page.tsx",
  "artifacts/banco-web/app/workspace/listings/[id]/edit/page.tsx",
  "artifacts/banco-web/app/workspace/leads/page.tsx",
  "artifacts/banco-web/app/workspace/messages/page.tsx",
  "artifacts/banco-web/app/en/workspace/page.tsx",
  "artifacts/banco-web/app/en/workspace/listings/page.tsx",
  "artifacts/banco-web/app/en/workspace/listings/new/page.tsx",
  "artifacts/banco-web/app/en/workspace/leads/page.tsx",
  "artifacts/banco-web/app/en/workspace/messages/page.tsx",
]) {
  if (!existsSync(path.join(ROOT, route))) fail(`missing route ${route}`);
  else pass(`route ${route}`);
}

mustInclude(
  "artifacts/banco-web/components/workspace/WorkspaceShell.tsx",
  ['data-banco-journey="workspace"', "isClerkConfigured", "authDisabled"],
  "workspace shell auth gate",
);

mustInclude(
  "artifacts/banco-web/components/workspace/ManagedListingsPanel.tsx",
  [
    'data-banco-journey="workspace-listings"',
    "useGetMyManagedListings",
    "useBumpListing",
    "useDeleteListing",
    "getGetMyManagedListingsQueryKey",
    "copy.retry",
  ],
  "managed listings panel",
);

mustInclude(
  "artifacts/banco-web/components/workspace/ListingCreateForm.tsx",
  [
    "workspace-create-listing",
    "workspace-edit-listing",
    "useCreateListing",
    "useUpdateListing",
    "getGetMyMetricsQueryKey",
    "uploadError",
    "photosUploading",
  ],
  "listing create/edit form",
);

mustInclude(
  "artifacts/banco-web/components/workspace/LeadsPanel.tsx",
  [
    'data-banco-journey="workspace-leads"',
    "useGetDealerLeads",
    "leadsEmptyHint",
    "copy.retry",
  ],
  "leads panel",
);

mustInclude(
  "artifacts/banco-web/components/workspace/MessagesInboxPanel.tsx",
  ['data-banco-journey="workspace-messages"', "useListConversations"],
  "messages inbox",
);

mustInclude(
  "artifacts/banco-web/components/workspace/MessageThreadPanel.tsx",
  ['data-banco-journey="workspace-message-thread"', "useSendMessage"],
  "message thread",
);

mustInclude(
  "artifacts/banco-web/middleware.ts",
  ["/workspace", "CLERK_PUBLISHABLE_KEY"],
  "middleware protects workspace",
);

if (failed > 0) {
  console.error(`\nSeller workspace parity audit failed (${failed})`);
  process.exit(1);
}

console.log("\nSeller workspace parity audit passed.");
process.exit(0);
