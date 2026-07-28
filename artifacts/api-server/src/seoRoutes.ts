import { Router, type Request, type Response } from "express";
import {
  getSeoListing,
  getSitemapListings,
  type SeoListing,
} from "./services/ListingService";

/**
 * Public, crawler-facing routes. These are intentionally OUTSIDE the JSON `/api`
 * surface: they return real HTML so shared links preview (OG/Twitter), are
 * Google-indexable (canonical + JSON-LD Product), and degrade to a clear CTA
 * that deep-links into the app. They are mounted BEFORE `/api` and the 404
 * handler so `/l/:id`, `/sitemap.xml`, and `/robots.txt` resolve here.
 *
 * Honesty rules baked in:
 *   - Only listings that are active AND publicly visible (not flagged, seller not
 *     shadow-banned) are ever served; everything else is a real 404 + noindex.
 *   - The CTA deep-links to the app (`banco-mobile://listing/:id`). We do NOT
 *     invent App Store / Play Store URLs or deferred-deep-link claims.
 */

const seoRouter: Router = Router();

const CATEGORY_LABEL: Record<string, string> = {
  car: "Cars",
  real_estate: "Real Estate",
  industrial: "Industrial",
};

const DEEP_LINK_SCHEME = "banco-mobile";

// The global helmet CSP locks everything to 'self' (this is a JSON API). The
// public HTML pages need inline <style> and listing images, so we override CSP
// per-response with a tailored, still-tight policy: no scripts (JSON-LD is
// non-executable data), inline styles only, images from self/https/data.
const SEO_HTML_CSP =
  "default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

/** Escape text for safe inclusion in HTML text/attribute contexts. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolve the canonical public origin (no trailing slash). Prefers the explicit
 * PUBLIC_APP_URL; otherwise derives it from the (proxy-aware) request so dev and
 * preview hosts still produce working absolute URLs.
 */
function publicOrigin(req: Request): string {
  const explicit = process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const fwd = req.get("x-forwarded-proto");
  const fwdProto = Array.isArray(fwd) ? fwd[0] : fwd;
  const proto = (fwdProto ?? req.protocol ?? "https").split(",")[0].trim();
  const host = req.get("host") ?? "";
  return `${proto}://${host}`.replace(/\/+$/, "");
}

/** A route `:param` is always a single value at runtime; normalize the type. */
function paramValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** Make a stored relative serving path absolute against the public origin. */
function absoluteUrl(origin: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function renderListingHtml(listing: SeoListing, origin: string): string {
  const canonical = `${origin}/l/${listing.id}`;
  const categoryLabel = CATEGORY_LABEL[listing.category] ?? listing.category;
  const titleBase = listing.title?.trim() || categoryLabel;
  const pageTitle = `${titleBase} — ${listing.price_display} | BANCO`;
  const rawDescription =
    listing.description?.trim() ||
    `${categoryLabel}${listing.location ? ` in ${listing.location}` : ""} on BANCO.`;
  const description = truncate(rawDescription, 200);
  const ogImage = absoluteUrl(origin, listing.image_path);
  const deepLink = `${DEEP_LINK_SCHEME}://listing/${listing.id}`;

  // JSON-LD Product. JSON.stringify safely encodes all values; we additionally
  // guard against a `</script>` breakout in the serialized string.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: titleBase,
    description: rawDescription,
    ...(ogImage ? { image: ogImage } : {}),
    category: categoryLabel,
    url: canonical,
    ...(listing.location ? { areaServed: listing.location } : {}),
    ...(listing.is_request
      ? {}
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            availability: "https://schema.org/InStock",
            url: canonical,
          },
        }),
  }).replace(/<\/script>/gi, "<\\/script>");

  const e = escapeHtml;
  const ogImageTags = ogImage
    ? `\n    <meta property="og:image" content="${e(ogImage)}" />\n    <meta name="twitter:image" content="${e(ogImage)}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${e(pageTitle)}</title>
    <meta name="description" content="${e(description)}" />
    <link rel="canonical" href="${e(canonical)}" />
    <meta property="og:type" content="${listing.is_request ? "website" : "product"}" />
    <meta property="og:site_name" content="BANCO" />
    <meta property="og:title" content="${e(titleBase)}" />
    <meta property="og:description" content="${e(description)}" />
    <meta property="og:url" content="${e(canonical)}" />
    <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${e(titleBase)}" />
    <meta name="twitter:description" content="${e(description)}" />${ogImageTags}
    <script type="application/ld+json">${jsonLd}</script>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        background: #0b0f14; color: #f3f5f7; min-height: 100vh;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .card {
        width: 100%; max-width: 560px; background: #131a22; border: 1px solid #1f2a36;
        border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.4);
      }
      .hero { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; background: #1f2a36; }
      .body { padding: 24px; }
      .badge {
        display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .04em;
        text-transform: uppercase; color: #7fd1ff; background: rgba(127,209,255,.12);
        padding: 4px 10px; border-radius: 999px; margin-bottom: 12px;
      }
      h1 { font-size: 24px; line-height: 1.25; margin: 0 0 8px; }
      .price { font-size: 20px; font-weight: 700; color: #4ade80; margin: 0 0 12px; }
      .loc { font-size: 14px; color: #9fb0c0; margin: 0 0 16px; }
      .desc { font-size: 15px; line-height: 1.6; color: #c8d3de; margin: 0 0 24px; white-space: pre-wrap; }
      .cta {
        display: block; text-align: center; background: #2563eb; color: #fff; text-decoration: none;
        font-weight: 700; padding: 14px 20px; border-radius: 12px;
      }
      .brand { margin-top: 16px; text-align: center; font-size: 13px; color: #6b7c8c; }
    </style>
  </head>
  <body>
    <main class="card">
      ${ogImage ? `<img class="hero" src="${e(ogImage)}" alt="${e(titleBase)}" />` : ""}
      <div class="body">
        <span class="badge">${e(categoryLabel)}${listing.is_request ? " · طلب شراء" : ""}</span>
        <h1>${e(titleBase)}</h1>
        <p class="price">${e(listing.price_display)}</p>
        ${listing.location ? `<p class="loc">${e(listing.location)}</p>` : ""}
        ${listing.description ? `<p class="desc">${e(listing.description)}</p>` : ""}
        <a class="cta" href="${e(deepLink)}">افتح في تطبيق BANCO</a>
        <p class="brand">BANCO</p>
      </div>
    </main>
  </body>
</html>`;
}

function renderNotFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>الإعلان غير متاح | BANCO</title>
    <style>
      body { margin:0; font-family: system-ui, sans-serif; background:#0b0f14; color:#f3f5f7;
        min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:24px; }
    </style>
  </head>
  <body>
    <main>
      <h1>الإعلان ده مش متاح</h1>
      <p>يمكن يكون اتباع أو اتشال.</p>
    </main>
  </body>
</html>`;
}

// GET /l/:id — public listing page (HTML).
seoRouter.get("/l/:id", async (req: Request, res: Response) => {
  try {
    const listing = await getSeoListing(paramValue(req.params.id));
    if (!listing) {
      res
        .status(404)
        .set("X-Robots-Tag", "noindex")
        .set("Content-Security-Policy", SEO_HTML_CSP)
        .type("html")
        .send(renderNotFoundHtml());
      return;
    }
    const origin = publicOrigin(req);
    res
      .status(200)
      .set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
      .set("Content-Security-Policy", SEO_HTML_CSP)
      .type("html")
      .send(renderListingHtml(listing, origin));
  } catch {
    // Never leak internals to crawlers; fail closed as a noindex 404.
    res
      .status(404)
      .set("X-Robots-Tag", "noindex")
      .set("Content-Security-Policy", SEO_HTML_CSP)
      .type("html")
      .send(renderNotFoundHtml());
  }
});

// GET /sitemap.xml — only publicly visible listings.
seoRouter.get("/sitemap.xml", async (req: Request, res: Response) => {
  try {
    const origin = publicOrigin(req);
    const items = await getSitemapListings();
    const urls = items
      .map(
        (it) =>
          `  <url><loc>${escapeHtml(`${origin}/l/${it.id}`)}</loc><lastmod>${escapeHtml(
            it.updated_at,
          )}</lastmod><changefreq>daily</changefreq></url>`,
      )
      .join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
    res
      .status(200)
      .set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
      .type("application/xml")
      .send(xml);
  } catch {
    res.status(500).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

// GET /robots.txt — allow crawling of public pages, point to the sitemap.
seoRouter.get("/robots.txt", (req: Request, res: Response) => {
  const origin = publicOrigin(req);
  const body = `User-agent: *
Allow: /l/
Disallow: /api/
Sitemap: ${origin}/sitemap.xml
`;
  res
    .status(200)
    .set("Cache-Control", "public, max-age=3600")
    .type("text/plain")
    .send(body);
});

export default seoRouter;
