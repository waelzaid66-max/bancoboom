/**
 * Wave 8 live probe — seller.social_links on GET /v1/listings/{id}.
 * Usage: node audit/mobile/scripts/probe-wave8-seller-social.mjs [baseUrl]
 *
 * Exit 0 = field present on seller (array, may be empty)
 * Exit 2 = STALE (pre-wave8 API build)
 */
const base = (process.argv[2] || "https://banco-ca-oom.replit.app").replace(/\/$/, "");
const api = `${base}/api/v1`;

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text.slice(0, 200) };
  }
}

const search = await getJson(`${api}/search?category=car&limit=3&market_country=EG`);
const items = search.body?.data || [];
const sampleId = items[0]?.id;

const report = {
  base,
  wave: "v1.1.3-seller-social",
  sampleListingId: sampleId ?? null,
  sellerHasSocialLinksKey: false,
  sellerKeys: [],
  social_links: null,
};

if (!sampleId) {
  report.verdict = "INCONCLUSIVE — no listings to sample";
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const detail = await getJson(`${api}/listings/${sampleId}`);
const seller = detail.body?.data?.seller;
if (seller && typeof seller === "object") {
  report.sellerKeys = Object.keys(seller).sort();
  report.sellerHasSocialLinksKey = "social_links" in seller;
  report.social_links = seller.social_links ?? null;
}

report.verdict = report.sellerHasSocialLinksKey
  ? "FRESH — seller.social_links deployed (wave 8)"
  : "STALE — redeploy API from main @ 5939849+ for seller.social_links";

console.log(JSON.stringify(report, null, 2));
process.exit(report.sellerHasSocialLinksKey ? 0 : 2);
