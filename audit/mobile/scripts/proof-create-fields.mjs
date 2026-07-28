/**
 * Static proof: create taxonomy + FilterSheet + Normalization + search section
 * isolation. No tsx required.
 *
 * Run: node audit/mobile/scripts/proof-create-fields.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const tax = fs.readFileSync(
  path.join(root, "artifacts/banco-mobile/constants/listingCreateTaxonomy.ts"),
  "utf8",
);
const filter = fs.readFileSync(
  path.join(root, "artifacts/banco-mobile/components/search/FilterSheet.tsx"),
  "utf8",
);
const search = fs.readFileSync(
  path.join(root, "artifacts/banco-mobile/app/(tabs)/search.tsx"),
  "utf8",
);
const create = fs.readFileSync(
  path.join(root, "artifacts/banco-mobile/app/listings/create.tsx"),
  "utf8",
);
const listingSvc = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/services/ListingService.ts"),
  "utf8",
);
const norm = fs.readFileSync(
  path.join(root, "artifacts/api-server/src/services/NormalizationService.ts"),
  "utf8",
);
const buildSp = fs.readFileSync(
  path.join(root, "lib/search-contract/src/buildSearchParams.ts"),
  "utf8",
);
const contractTypes = fs.readFileSync(
  path.join(root, "lib/search-contract/src/types.ts"),
  "utf8",
);
const sectionTheme = fs.readFileSync(
  path.join(root, "artifacts/banco-mobile/lib/sectionTheme.ts"),
  "utf8",
);

function section(src, startRe, endRe) {
  const start = src.search(startRe);
  assert.ok(start >= 0, `missing start ${startRe}`);
  const rest = src.slice(start);
  const end = rest.search(endRe);
  assert.ok(end > 0, `missing end ${endRe}`);
  return rest.slice(0, end);
}

assert.match(
  tax,
  /REAL_ESTATE_NO_ROOMS_TYPES[\s\S]*commercial_land[\s\S]*warehouse/,
  "NO_ROOMS must include warehouse + commercial_land",
);
assert.match(tax, /offer === "rent"[\s\S]*ownership/, "hide ownership on rent");
assert.match(tax, /offer !== "rent"[\s\S]*rental_term/, "hide rental_term unless rent");
assert.doesNotMatch(
  tax,
  /raw_materials:\s*\[[\s\S]*?key:\s*"industry"/,
  "raw_materials form must not list industry",
);

const rawBlock = section(tax, /raw_materials:\s*\[/, /\n\s*\],\n\s*\};/);
assert.match(rawBlock, /key:\s*"material"/);
assert.match(rawBlock, /key:\s*"capacity"/);
assert.doesNotMatch(rawBlock, /key:\s*"industry"/);

assert.match(create, /value === "sale"[\s\S]*delete next\.rental_term/);
assert.match(create, /value === "rent"[\s\S]*delete next\.ownership/);
assert.match(create, /requiredSpecKeys\.includes\(field\.key\)/);

assert.match(
  search,
  /CLEAR_ATTRS = CLEAR_SECTION_ATTRS|CLEAR_SECTION_ATTRS/,
  "mobile uses shared CLEAR_SECTION_ATTRS",
);
assert.match(
  contractTypes,
  /CLEAR_SECTION_ATTRS[\s\S]*industry:\s*null/,
  "shared CLEAR_SECTION_ATTRS clears industry",
);
assert.match(
  contractTypes,
  /CLEAR_SECTION_ATTRS[\s\S]*fuelType:\s*null/,
  "shared CLEAR_SECTION_ATTRS clears fuelType",
);
assert.match(
  search,
  /type === "raw_material"[\s\S]{0,120}industry\s*[:=]\s*null|industry\s*[:=]\s*null[\s\S]{0,120}raw_material/,
  "selecting materials/raw_material must clear industry",
);
assert.match(search, /offer_type ===\s*"rent"/, "rent chrome requires rent engine");
assert.match(filter, /offer_type ===\s*"rent"/, "FilterSheet rent requires rent engine");
assert.match(filter, /showIndustry/, "FilterSheet must gate industry");
assert.match(
  filter,
  /industrialType === "raw_material"/,
  "industry hidden for raw_material subtype",
);
assert.match(
  search,
  /showOriginChrome\s*=\s*criteria\.category === "materials"/,
  "origin chrome materials-only",
);
assert.match(
  filter,
  /showOrigin\s*=\s*criteria\.category === "materials"/,
  "FilterSheet origin materials-only",
);

assert.match(buildSp, /isRentBrowse/, "contract gates rental_term");
assert.match(buildSp, /allowIndustry/, "contract gates industry");
assert.match(buildSp, /facilities[\s\S]*origin_type/, "facilities drop origin");
assert.match(
  buildSp,
  /category === "materials" && c\.material/,
  "contract emits material for materials company only",
);
assert.match(filter, /testPrefix="filter-material"/, "FilterSheet material chips");
assert.match(
  filter,
  /showMaterial[\s\S]*raw_material|industrialType === "raw_material"[\s\S]*showMaterial/,
  "material chips gated to materials all/raw_material",
);
assert.match(
  contractTypes,
  /CLEAR_SECTION_ATTRS[\s\S]*material:\s*null/,
  "CLEAR_SECTION_ATTRS clears material",
);
assert.match(
  search,
  /CLEAR_ATTRS = CLEAR_SECTION_ATTRS|CLEAR_SECTION_ATTRS/,
  "mobile CLEAR_ATTRS aliases shared CLEAR_SECTION_ATTRS",
);
assert.match(
  search,
  /patch\.material = null|material\s*[:=]\s*null[\s\S]{0,80}machine|machine[\s\S]{0,80}material\s*[:=]\s*null/,
  "leaving raw_material clears commodity material",
);

assert.match(sectionTheme, /SECTION_ACCENT/, "section theme tokens exist");
assert.match(sectionTheme, /real_estate/, "RE accent");
assert.match(sectionTheme, /materials/, "materials accent");

assert.match(
  listingSvc,
  /noRooms[\s\S]*commercial_land[\s\S]*warehouse/,
  "API validateAttributes noRooms sync",
);
assert.match(
  norm,
  /industrialType === "raw_material"[\s\S]*material|raw_material[\s\S]*\["capacity", "industrial_type", "material"\]/,
  "Normalization completeness must score raw_material on material not industry",
);

console.log("proof-create-fields: all assertions passed");
