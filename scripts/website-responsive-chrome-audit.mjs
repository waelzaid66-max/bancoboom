#!/usr/bin/env node
/**
 * Phase 5 — responsive chrome / header a11y audit (website-only).
 *
 * Usage: node scripts/website-responsive-chrome-audit.mjs
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

console.log("BANCO website Phase 5 responsive chrome audit\n");

mustInclude(
  `${WEB}/components/SkipToMain.tsx`,
  ['href="#main-content"', "Skip to main content", "تخطي إلى المحتوى"],
  "skip-to-main link",
);

mustInclude(
  `${WEB}/app/layout.tsx`,
  ["SkipToMain", "SiteChrome"],
  "layout wires skip + chrome",
);

mustInclude(
  `${WEB}/components/SiteChrome.tsx`,
  [
    'id="main-content"',
    "SiteMobileNav",
    "banco-site-header",
    "banco-menu-toggle",
    'data-banco-chrome="header"',
    "aria-expanded",
  ],
  "site chrome responsive header",
);

mustInclude(
  `${WEB}/components/SiteMobileNav.tsx`,
  [
    'role="dialog"',
    "aria-modal",
    "banco-mobile-nav",
    "Escape",
    "document.body.style.overflow",
    "buildSiteNavModel",
  ],
  "mobile nav drawer a11y",
);

mustInclude(
  `${WEB}/components/SiteMainNav.tsx`,
  ['data-banco-chrome="desktop-nav"', "banco-desktop-nav", "buildSiteNavModel"],
  "desktop nav shared model",
);

mustInclude(
  `${WEB}/lib/site-nav-model.ts`,
  ["buildSiteNavModel", "browseNavItems", "marketNavItems"],
  "shared site nav model",
);

mustInclude(
  `${WEB}/app/globals.css`,
  [
    ".banco-site-header",
    ".banco-desktop-nav",
    ".banco-mobile-nav",
    ".banco-menu-toggle",
    ".banco-workspace-shell",
    "@media (max-width: 900px)",
    "@media (max-width: 768px)",
    "prefers-reduced-motion",
  ],
  "responsive chrome CSS breakpoints",
);

mustInclude(
  `${WEB}/components/workspace/WorkspaceShell.tsx`,
  [
    "banco-workspace-shell",
    'data-banco-chrome="workspace-shell"',
    "isClerkConfigured",
    'data-banco-journey="workspace"',
  ],
  "workspace shell responsive class",
);

if (failed > 0) {
  console.error(`\nResponsive chrome audit FAILED (${failed})`);
  process.exit(1);
}
console.log("\nResponsive chrome audit PASSED");
process.exit(0);
