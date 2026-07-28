import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchParams } from "../src/buildSearchParams.ts";
import {
  buildSearchUrlParams,
  parseSearchCriteriaFromUrl,
} from "../src/url.ts";
import { ENGINE_HUB_QUERIES } from "../src/hub-links.ts";

function parseQuery(query) {
  return Object.fromEntries(new URLSearchParams(query));
}

for (const fixture of ENGINE_HUB_QUERIES) {
  test(`engine hub round-trip: ${fixture.label}`, () => {
    const initial = parseSearchCriteriaFromUrl(parseQuery(fixture.query));
    assert.equal(initial.engineKey, fixture.engineKey);

    const urlParams = buildSearchUrlParams(initial);
    const reparsed = parseSearchCriteriaFromUrl(Object.fromEntries(urlParams.entries()));

    assert.equal(reparsed.engineKey, initial.engineKey);
    assert.equal(reparsed.category, initial.category);
    assert.equal(reparsed.paymentType, initial.paymentType);

    const apiA = buildSearchParams(initial);
    const apiB = buildSearchParams(reparsed);
    assert.deepEqual(apiB, apiA);
  });
}
