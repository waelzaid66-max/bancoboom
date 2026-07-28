/**
 * Wave 9 / v1.1.5 live probe — seller.bio + display_title on GET /v1/listings/{id}.
 * Usage: node audit/mobile/scripts/probe-wave9-seller-bio.mjs [baseUrl]
 *
 * Exit 0 = keys present on seller (values may be null)
 * Exit 2 = STALE (pre-v1.1.5 API build)
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
  wave: "v1.1.5-seller-bio",
  sampleListingId: sampleId ?? null,
  sellerHasBioKey: false,
  sellerHasDisplayTitleKey: false,
  sellerKeys: [],
  bio: null,
  display_title: null,
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
  report.sellerHasBioKey = "bio" in seller;
  report.sellerHasDisplayTitleKey = "display_title" in seller;
  report.bio = seller.bio ?? null;
  report.display_title = seller.display_title ?? null;
}

const fresh = report.sellerHasBioKey && report.sellerHasDisplayTitleKey;
report.verdict = fresh
  ? "FRESH — seller.bio + display_title deployed (v1.1.5)"
  : "STALE — redeploy API from main @ 1882523+ for seller presentation fields";

console.log(JSON.stringify(report, null, 2));
process.exit(fresh ? 0 : 2);
