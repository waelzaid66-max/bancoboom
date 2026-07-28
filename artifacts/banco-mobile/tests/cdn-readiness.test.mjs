// Performance-infrastructure guards — CDN readiness across the monorepo.
//
// Scope, deliberately narrow: these assert only WHERE bytes are fetched from and
// HOW LONG they may be cached. Nothing here touches business logic, UI, routing,
// the API surface, the database or authentication, and none of it changes what
// the apps do — an unset CDN variable must leave every app byte-identical to how
// it behaves today.
//
// Run: node --test tests/cdn-readiness.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.dirname(path.dirname(__dirname));

const NEXT_APPS = ["banco-web", "banco-website"];
const VITE_APPS = ["admin-os", "dealer-os", "landing", "mockup-sandbox"];

test("every web app can serve its static assets from a CDN, driven by operator env", () => {
  // Hashed build output is the cheapest thing to move to an edge: it is immutable,
  // so it can be cached forever and never needs revalidating. Serving it from the
  // app container instead is pure waste — bandwidth and latency paid on every
  // cold visit, in every one of the 21 markets this ships to.
  for (const app of NEXT_APPS) {
    const cfg = fs.readFileSync(
      path.join(ARTIFACTS, app, "next.config.ts"),
      "utf8",
    );
    assert.match(
      cfg,
      /assetPrefix/,
      `${app}: Next must be able to point /_next/static at a CDN`,
    );
    assert.match(
      cfg,
      /process\.env\.NEXT_PUBLIC_ASSET_CDN_URL/,
      `${app}: the CDN origin must come from operator env, never be hardcoded`,
    );
    // The critical property: unset means ABSENT, not empty string. An empty
    // assetPrefix is not the same as no assetPrefix — it would rewrite asset URLs
    // and could break a deployment that has no CDN at all.
    assert.match(
      cfg,
      /assetCdnOrigin\s*\?\s*\{\s*assetPrefix/,
      `${app}: assetPrefix must be omitted entirely when no CDN is configured`,
    );
  }

  for (const app of VITE_APPS) {
    const cfg = fs.readFileSync(
      path.join(ARTIFACTS, app, "vite.config.ts"),
      "utf8",
    );
    assert.match(
      cfg,
      /process\.env\.BASE_PATH/,
      `${app}: the asset base must come from operator env`,
    );
  }
});

test("the API is correctly placed BEHIND a cache/CDN", () => {
  const app = fs.readFileSync(
    path.join(ARTIFACTS, "api-server", "src", "app.ts"),
    "utf8",
  );

  // Responses must be compressed before they reach the edge, or the CDN caches
  // and re-serves uncompressed bytes to every visitor.
  assert.match(app, /compression\(\)/, "responses must be compressed");

  // Without trust proxy, Express reads the proxy's own address and scheme instead
  // of the client's — which silently breaks rate limiting, secure-cookie decisions
  // and any per-client logic the moment a CDN sits in front.
  assert.match(
    app,
    /trust proxy/,
    "Express must trust the proxy or it misreads client IP and protocol behind a CDN",
  );

  // ETag must stay ON: it is what turns a repeat request into a 304 with no body.
  assert.doesNotMatch(
    app,
    /disable\(\s*["']etag["']\s*\)/,
    "ETag must not be disabled — it is what makes revalidation free",
  );
});

test("cacheable responses never leak one user's data through a shared cache", () => {
  // This is the property that makes putting a CDN in front SAFE, and it is worth
  // guarding above all the others: a public, cacheable response containing a
  // personalised payload would be stored once and handed to everyone behind it.
  const controllers = path.join(ARTIFACTS, "api-server", "src", "controllers");
  const files = fs
    .readdirSync(controllers)
    .filter((f) => f.endsWith(".ts") && !f.includes(".test."));

  // Checked per HANDLER, not per file. A first version asserted that any file
  // with a public header must also contain a private one, and it failed on
  // CORRECT code: uploadController streams public listing media, where the bytes
  // at a URL are the same for everyone and `public` is exactly right. The rule
  // that actually matters is narrower — a response may only be marked public if
  // THAT response does not depend on who is asking.
  let publicCount = 0;
  for (const f of files) {
    const src = fs.readFileSync(path.join(controllers, f), "utf8");
    let idx = src.indexOf('Cache-Control", "public');
    while (idx !== -1) {
      publicCount += 1;
      // The ENCLOSING handler, bounded by its real edges — not a character
      // window. A fixed window picked up `req.userId` from a neighbouring
      // handler in the same file and failed on correct code twice; the boundary
      // has to be the export that owns this line.
      const starts = [...src.matchAll(/^export (?:const|async function) \w+/gm)]
        .map((m) => m.index)
        .filter((i) => i !== undefined);
      const start = Math.max(0, ...starts.filter((i) => i < idx));
      const end = Math.min(
        ...[...starts.filter((i) => i > idx), src.length],
      );
      const handler = src.slice(start, end);
      const personalised = /req\.userId|clerkId|req\.auth/.test(handler);
      const window = handler;
      if (personalised) {
        assert.match(
          window,
          /private,\s*no-store/,
          `${f}: marks a response public in a handler that reads the caller's identity, with no private branch — a shared cache would hand one user's data to another`,
        );
      }
      idx = src.indexOf('Cache-Control", "public', idx + 1);
    }
  }
  assert.ok(
    publicCount > 0,
    "expected at least one publicly cacheable endpoint to guard",
  );
});
