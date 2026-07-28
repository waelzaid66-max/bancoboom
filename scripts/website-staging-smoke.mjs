#!/usr/bin/env node
/**
 * Lightweight staging smoke for banco-web static routes + SEO files.
 *
 * Usage:
 *   BANCO_WEB_URL=https://staging.banco.example.com node scripts/website-staging-smoke.mjs
 *
 * Optional:
 *   BANCO_LISTING_SMOKE_ID=uuid  — GET /listing/{id} must return 200 + Product JSON-LD
 *   BANCO_WEB_EXPECT_PLUG=on|off — require health.plug (default: on)
 *   BANCO_WEB_SMOKE_MAINTENANCE=1 — also assert /maintenance renders when plugged
 *
 * Exit: 0 pass, 1 fail, 2 missing BANCO_WEB_URL
 */

const BASE = (process.env.BANCO_WEB_URL || process.env.WEB_URL || "").replace(/\/$/, "");
const EXPECT_PLUG = (process.env.BANCO_WEB_EXPECT_PLUG || "on").trim().toLowerCase();

const PATHS = [
  { path: "/", label: "home", expectJsonLd: "WebSite" },
  { path: "/en", label: "en home", expectJsonLd: "CollectionPage" },
  { path: "/cars", label: "cars hub", expectJsonLd: "CollectionPage" },
  { path: "/en/cars", label: "en cars hub", expectJsonLd: "CollectionPage" },
  { path: "/real-estate", label: "real-estate hub", expectJsonLd: "CollectionPage" },
  { path: "/industrial", label: "industrial hub", expectJsonLd: "CollectionPage" },
  { path: "/search", label: "search" },
  { path: "/directory", label: "platform directory" },
  { path: "/en/search", label: "en search" },
  { path: "/en/directory", label: "en platform directory" },
  { path: "/search?category=car&location=cairo", label: "search cars cairo" },
  { path: "/sign-in", label: "sign-in ar" },
  { path: "/en/sign-in", label: "sign-in en" },
  { path: "/workspace", label: "workspace protected", kind: "protected" },
  { path: "/workspace/listings", label: "workspace listings protected", kind: "protected" },
  { path: "/workspace/listings/new", label: "workspace create listing protected", kind: "protected" },
  { path: "/workspace/leads", label: "workspace leads protected", kind: "protected" },
  { path: "/workspace/b2b", label: "workspace b2b / market copy protected", kind: "protected" },
  { path: "/workspace/b2b/rfqs", label: "workspace market rfqs protected", kind: "protected" },
  { path: "/workspace/b2b/supply", label: "workspace market supply protected", kind: "protected" },
  { path: "/en/workspace", label: "en workspace protected", kind: "protected" },
  { path: "/en/workspace/b2b", label: "en workspace b2b protected", kind: "protected" },

  { path: "/saved", label: "saved protected", kind: "protected" },
  { path: "/robots.txt", label: "robots", kind: "robots" },
  { path: "/sitemap.xml", label: "sitemap", kind: "sitemap" },
  { path: "/api/health", label: "health route", kind: "health" },
  { path: "/api/healthz", label: "healthz alias", kind: "health" },
  { path: "/maintenance", label: "maintenance page", kind: "maintenance" },
  { path: "/en/maintenance", label: "en maintenance page", kind: "maintenance" },
  { path: "/manifest.webmanifest", label: "manifest", kind: "manifest" },
];

let failed = 0;

function fail(label, detail) {
  console.error(`[FAIL] ${label}: ${detail}`);
  failed += 1;
}

function pass(label, status) {
  console.log(`[PASS] ${label}: ${status}`);
}

async function checkRoute(item) {
  const url = `${BASE}${item.path}`;
  const before = failed;

  try {
    const redirectMode = item.kind === "protected" ? "manual" : "follow";
    const res = await fetch(url, { redirect: redirectMode });

    if (item.kind === "protected") {
      const location = res.headers.get("location") ?? "";
      if (res.status >= 500) {
        fail(item.label, `HTTP ${res.status} (${url})`);
        return;
      }
      if (res.status >= 300 && res.status < 400) {
        if (!location.includes("sign-in")) {
          fail(item.label, `expected redirect to sign-in, got ${location || res.status}`);
        }
      } else if (res.status >= 200 && res.status < 300) {
        // Clerk not configured on staging — page may render without auth gate.
        pass(item.label, `${res.status} (no redirect)`);
        return;
      } else if (res.status >= 400) {
        fail(item.label, `HTTP ${res.status} (${url})`);
        return;
      }
      if (failed === before) {
        pass(item.label, res.status);
      }
      return;
    }

    if (res.status < 200 || res.status >= 400) {
      fail(item.label, `HTTP ${res.status} (${url})`);
      return;
    }

    const body = await res.text();

    if (item.kind === "sitemap") {
      if (!body.includes("<urlset") && !body.includes("<sitemapindex")) {
        fail(item.label, "missing urlset");
      }
      for (const hub of ["/cars", "/real-estate", "/search"]) {
        if (!body.includes(hub)) {
          fail(item.label, `missing hub ${hub}`);
        }
      }
    } else if (item.kind === "robots") {
      if (!body.toLowerCase().includes("user-agent")) {
        fail(item.label, "missing User-agent");
      }
    } else if (item.kind === "health") {
      let json;
      try {
        json = JSON.parse(body);
      } catch {
        fail(item.label, "invalid JSON");
        return;
      }
      if (json.status !== "ok") {
        fail(item.label, `unexpected payload: ${body.slice(0, 120)}`);
      }
      if (json.surface !== "banco-web") {
        fail(item.label, `expected surface banco-web, got ${json.surface}`);
      }
      if (json.plug !== "on" && json.plug !== "off") {
        fail(item.label, `expected plug on|off, got ${JSON.stringify(json.plug)}`);
      }
      if (EXPECT_PLUG === "on" || EXPECT_PLUG === "off") {
        if (json.plug !== EXPECT_PLUG) {
          fail(item.label, `expected plug=${EXPECT_PLUG}, got ${json.plug}`);
        }
      }
    } else if (item.kind === "maintenance") {
      // Always reachable as a page; when unplugged, / also rewrites here.
      if (
        !body.includes('data-banco-journey="maintenance"') &&
        !body.includes("temporarily offline") &&
        !body.includes("متوقف مؤقتاً")
      ) {
        fail(item.label, "missing maintenance page markers");
      }
    } else if (item.kind === "manifest") {
      let json;
      try {
        json = JSON.parse(body);
      } catch {
        fail(item.label, "invalid JSON");
        return;
      }
      if (!json.name || !json.lang) {
        fail(item.label, "missing name or lang");
      }
    } else {
      const isEn = item.path === "/en" || item.path.startsWith("/en/");
      if (isEn) {
        if (
          !body.includes('data-banco-locale="en"') &&
          !body.includes("One market") &&
          !body.includes("Start searching") &&
          !body.includes("Search")
        ) {
          fail(item.label, "missing EN route markers");
        }
      } else if (!body.includes('lang="ar"')) {
        fail(item.label, 'missing lang="ar"');
      }

      // Phase 1 brand-first hero (when plug on and home routes)
      if (item.path === "/" || item.path === "/en") {
        if (
          !body.includes("BANCO") &&
          !body.includes("بانكو") &&
          !body.includes('data-banco-brand')
        ) {
          fail(item.label, "missing BANCO brand signal on home");
        }
      }

      if (item.expectJsonLd && !body.includes(item.expectJsonLd)) {
        fail(item.label, `missing JSON-LD ${item.expectJsonLd}`);
      }

      // Phase 2 journey markers (search + saved shells)
      if (item.path === "/search" || item.path === "/en/search") {
        if (!body.includes('data-banco-journey="search"')) {
          fail(item.label, 'missing data-banco-journey="search"');
        }
      }
      if (item.path === "/saved" || item.path === "/en/saved") {
        if (
          res.status >= 200 &&
          res.status < 300 &&
          !body.includes('data-banco-journey="saved"') &&
          !body.includes("sign-in")
        ) {
          fail(item.label, "saved page missing journey marker or sign-in gate");
        }
      }
    }

    if (failed === before) {
      pass(item.label, res.status);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    fail(item.label, `${msg} (${url})`);
  }
}

async function checkListing(id) {
  const label = "listing detail";
  const url = `${BASE}/listing/${id}`;
  const before = failed;

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status < 200 || res.status >= 400) {
      fail(label, `HTTP ${res.status} (${url})`);
      return;
    }
    const html = await res.text();
    if (!html.includes("Product")) {
      fail(label, "missing Product JSON-LD");
    }
    if (!html.includes('data-banco-journey="listing"')) {
      fail(label, 'missing data-banco-journey="listing"');
    }
    if (!html.includes('data-banco-journey="contact"') && !html.includes("bancooom://")) {
      fail(label, "missing contact journey or app deep-link fallback");
    }
    if (failed === before) {
      pass(label, res.status);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    fail(label, `${msg} (${url})`);
  }
}

async function checkListingShareRewrite(id) {
  const label = "listing share /l/:id rewrite";
  const url = `${BASE}/l/${id}`;
  const before = failed;

  try {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status >= 500) {
      fail(label, `HTTP ${res.status} (${url})`);
      return;
    }
    if (res.status >= 400 && res.status !== 404) {
      fail(label, `HTTP ${res.status} (${url})`);
      return;
    }
    if (failed === before) {
      pass(label, res.status);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    fail(label, `${msg} (${url})`);
  }
}

async function checkListingEn(id) {
  const label = "en listing detail";
  const url = `${BASE}/en/listing/${id}`;
  const before = failed;

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status < 200 || res.status >= 400) {
      fail(label, `HTTP ${res.status} (${url})`);
      return;
    }
    const html = await res.text();
    if (!html.includes("Product")) {
      fail(label, "missing Product JSON-LD");
    }
    if (failed === before) {
      pass(label, res.status);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    fail(label, `${msg} (${url})`);
  }
}

async function main() {
  if (!BASE) {
    console.error("Set BANCO_WEB_URL (or WEB_URL) to the deployed banco-web origin.");
    process.exit(2);
  }

  console.log(`Website smoke → ${BASE}`);
  for (const item of PATHS) {
    await checkRoute(item);
  }

  const listingId = process.env.BANCO_LISTING_SMOKE_ID?.trim();
  if (listingId) {
    await checkListing(listingId);
    await checkListingShareRewrite(listingId);
    await checkListingEn(listingId);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
