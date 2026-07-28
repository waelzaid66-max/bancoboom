#!/usr/bin/env node
/**
 * Post-build SEO audit for banco-web prerendered hub pages (W1 gate).
 * Reads Next.js static HTML from .next/server/app — no running server required.
 *
 * Usage:
 *   node scripts/website-seo-static-audit.mjs
 *   BANCO_WEB_ROOT=artifacts/banco-web node scripts/website-seo-static-audit.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = process.env.BANCO_WEB_ROOT
  ? path.resolve(ROOT, process.env.BANCO_WEB_ROOT)
  : path.join(ROOT, "artifacts", "banco-web");
const APP_DIR = path.join(WEB_ROOT, ".next", "server", "app");

/** route → expected fragments in prerendered HTML */
const HUB_PAGES = [
  { file: "index.html", label: "home", mustContain: ["BANCO", "سوق واحد"], lang: "ar", dir: "rtl" },
  { file: "cars.html", label: "cars hub", mustContain: ["سيارات", "CollectionPage", "BreadcrumbList"], lang: "ar", dir: "rtl" },
  { file: "real-estate.html", label: "real-estate hub", mustContain: ["عقارات", "BreadcrumbList"], lang: "ar", dir: "rtl" },
  { file: "industrial.html", label: "industrial hub", mustContain: ["صناعي", "BreadcrumbList"], lang: "ar", dir: "rtl" },
  // Phase 1 brand-first hero copy (replaces legacy "Browse the market")
  { file: "en.html", label: "en home", mustContain: ["One market", "BANCO", "Start searching"], lang: "en", dir: "ltr" },
  { file: path.join("en", "cars.html"), label: "en cars hub", mustContain: ["Cars", "BreadcrumbList"], lang: "en", dir: "ltr" },
  { file: path.join("en", "real-estate.html"), label: "en real-estate hub", mustContain: ["Real Estate", "BreadcrumbList"], lang: "en", dir: "ltr" },
  { file: path.join("en", "industrial.html"), label: "en industrial hub", mustContain: ["Industrial", "BreadcrumbList"], lang: "en", dir: "ltr" },
  { file: "directory.html", label: "directory hub", mustContain: ["بانكو", "التطبيق هو المصدر الأساسي"], lang: "ar", dir: "rtl" },
  { file: path.join("en", "directory.html"), label: "en directory hub", mustContain: ["BANCO mobile app", "primary experience"], lang: "en", dir: "ltr" },
];

let failed = 0;

function fail(label, detail) {
  console.error(`[FAIL] ${label}: ${detail}`);
  failed += 1;
}

function pass(label) {
  console.log(`[PASS] ${label}`);
}

function auditPage(page) {
  const before = failed;
  const fullPath = path.join(APP_DIR, page.file);
  if (!fs.existsSync(fullPath)) {
    fail(page.label, `missing ${fullPath}`);
    return;
  }

  const html = fs.readFileSync(fullPath, "utf8");

  const langOk =
    page.lang === "ar"
      ? html.includes('lang="ar"') && html.includes('dir="rtl"')
      : html.includes('data-banco-locale="en"') &&
        html.includes('lang="en"') &&
        html.includes('dir="ltr"');
  if (!langOk) {
    fail(page.label, `expected ${page.lang}/${page.dir} locale markers in HTML`);
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    fail(page.label, "missing viewport meta");
  }
  if (!/<meta[^>]+name=["']theme-color["']/i.test(html)) {
    fail(page.label, "missing theme-color meta");
  }
  if (!html.includes('rel="manifest"') && !html.includes("rel='manifest'")) {
    fail(page.label, "missing manifest link");
  }
  if (!/<meta[^>]+name=["']description["'][^>]+content=/i.test(html)) {
    fail(page.label, "missing meta description");
  }
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) {
    fail(page.label, `expected 1 h1, found ${h1Count}`);
  }
  if (!html.includes("application/ld+json")) {
    fail(page.label, "missing JSON-LD");
  }
  for (const fragment of page.mustContain) {
    if (!html.includes(fragment)) {
      fail(page.label, `missing: ${fragment}`);
    }
  }

  if (failed === before) {
    pass(page.label);
  }
}

function auditSitemapBody() {
  const bodyPath = path.join(APP_DIR, "sitemap.xml.body");
  if (!fs.existsSync(bodyPath)) {
    console.log("[SKIP] sitemap.xml.body not found — verify sitemap on staging smoke");
    return;
  }

  const before = failed;
  const xml = fs.readFileSync(bodyPath, "utf8");
  for (const hub of ["/cars", "/real-estate", "/industrial", "/search", "/directory", "/en", "/en/cars", "/en/real-estate", "/en/industrial", "/en/search", "/en/directory"]) {
    if (!xml.includes(hub)) {
      fail("sitemap", `missing hub URL ${hub}`);
    }
  }
  if (!xml.includes("/search?category=car")) {
    fail("sitemap", "missing golden search hub /search?category=car");
  }
  if (failed === before) {
    pass("sitemap.xml body");
  }
}

if (!fs.existsSync(APP_DIR)) {
  console.error(`Missing build output: ${APP_DIR}`);
  console.error("Run: pnpm --filter @workspace/banco-web run build");
  process.exit(1);
}

console.log(`SEO static audit → ${APP_DIR}`);
for (const page of HUB_PAGES) {
  auditPage(page);
}
auditSitemapBody();

if (failed > 0) {
  console.error(`\n${failed} SEO audit failure(s).`);
  process.exit(1);
}

console.log("\nSEO static audit passed.");
