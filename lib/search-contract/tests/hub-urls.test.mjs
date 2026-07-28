import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchParams } from "../src/buildSearchParams.ts";
import { parseSearchCriteriaFromUrl } from "../src/url.ts";
import { GOLDEN_HUB_QUERIES } from "../src/hub-links.ts";

function apiParamsFromQuery(query) {
  const record = Object.fromEntries(new URLSearchParams(query));
  const criteria = parseSearchCriteriaFromUrl(record);
  return buildSearchParams(criteria);
}

for (const link of GOLDEN_HUB_QUERIES) {
  test(`hub URL golden: ${link.label}`, () => {
    const params = apiParamsFromQuery(link.query);
    for (const [key, value] of Object.entries(link.expect)) {
      assert.equal(params[key], value, `${link.label}: ${key}`);
    }
  });
}
