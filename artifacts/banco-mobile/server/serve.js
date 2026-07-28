/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with these routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON (Expo Go)
 * - GET / without expo-platform → the exported WEB APP (static-build/web/index.html)
 *   — falls back to the Expo Go QR landing page only when no web build exists.
 * - GET /expo-go → the QR landing page (native preview via Expo Go)
 * - /privacy, /terms → static legal pages
 * - Everything else: static files from static-build/web/ then static-build/,
 *   with an SPA fallback to the web index.html for client-side router paths.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_ROOT = path.join(STATIC_ROOT, "web");
const WEB_INDEX = path.join(WEB_ROOT, "index.html");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const PRIVACY_PATH = path.resolve(__dirname, "templates", "privacy.html");
const TERMS_PATH = path.resolve(__dirname, "templates", "terms.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

/**
 * Resolve a URL path against a static root, guarding path traversal.
 * Returns the absolute file path when it exists (and is a file), else null.
 */
function resolveStaticFile(root, urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) return null;
  if (!fs.existsSync(filePath)) return null;
  if (fs.statSync(filePath).isDirectory()) return null;
  return filePath;
}

function sendFile(filePath, res, extraHeaders = {}) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType, ...extraHeaders });
  res.end(content);
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const privacyPage = fs.readFileSync(PRIVACY_PATH, "utf-8");
const termsPage = fs.readFileSync(TERMS_PATH, "utf-8");
const appName = getAppName();
const hasWebBuild = fs.existsSync(WEB_INDEX);

if (!hasWebBuild) {
  console.warn(
    "WARN: static-build/web/index.html missing — browsers get the Expo Go QR page. " +
      "Run scripts/build.js (deploy build) to produce the web export.",
  );
}

function serveHtml(html, res) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveWebIndex(res) {
  // index.html must never be cached — it points at hashed bundles.
  sendFile(WEB_INDEX, res, { "cache-control": "no-cache" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  // Liveness probe — deployment orchestrator hits /status to check the server
  // is up before routing traffic. Must respond quickly without I/O.
  if (pathname === "/status" || pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }

    if (pathname === "/") {
      if (hasWebBuild) return serveWebIndex(res);
      return serveLandingPage(req, res, landingPageTemplate, appName);
    }
  }

  // Native preview entry — QR code page for opening the app in Expo Go.
  if (pathname === "/expo-go") {
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  if (pathname === "/privacy" || pathname === "/legal/privacy") {
    return serveHtml(privacyPage, res);
  }
  if (pathname === "/terms" || pathname === "/legal/terms") {
    return serveHtml(termsPage, res);
  }

  // Web export assets first (hashed → cache aggressively), then the native
  // static build (Expo Go bundles/assets under timestamped dirs).
  if (hasWebBuild) {
    const webFile = resolveStaticFile(WEB_ROOT, pathname);
    if (webFile) {
      const cache = pathname.startsWith("/_expo/")
        ? { "cache-control": "public, max-age=31536000, immutable" }
        : {};
      return sendFile(webFile, res, cache);
    }
  }

  const nativeFile = resolveStaticFile(STATIC_ROOT, pathname);
  if (nativeFile) {
    return sendFile(nativeFile, res);
  }

  // SPA fallback: client-side routes (e.g. /listing/123, /search) render from
  // the web index. Only for HTML-navigations — asset-looking paths get a 404.
  if (hasWebBuild && !path.extname(pathname)) {
    return serveWebIndex(res);
  }

  res.writeHead(404);
  res.end("Not Found");
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
