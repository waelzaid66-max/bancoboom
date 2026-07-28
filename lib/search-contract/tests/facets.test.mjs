import test from "node:test";
import assert from "node:assert/strict";
import { applyFacetToCriteria } from "../src/facets.ts";
import { DEFAULT_CRITERIA } from "../src/types.ts";

test("applyFacetToCriteria maps category facet", () => {
  const next = applyFacetToCriteria(DEFAULT_CRITERIA, "category", "car");
  assert.equal(next.category, "car");
  assert.equal(next.engineKey, "all");
});

test("applyFacetToCriteria CLEARs section attrs on category change", () => {
  const next = applyFacetToCriteria(
    {
      ...DEFAULT_CRITERIA,
      category: "materials",
      material: "steel",
      industry: "food",
      fuelType: "petrol",
      rentalTerm: "new_law",
      engineKey: "rent",
    },
    "category",
    "car",
  );
  assert.equal(next.category, "car");
  assert.equal(next.engineKey, "all");
  assert.equal(next.material, null);
  assert.equal(next.industry, null);
  assert.equal(next.fuelType, null);
  assert.equal(next.rentalTerm, null);
});

test("applyFacetToCriteria maps condition to engine key", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "car" },
    "condition",
    "used",
  );
  assert.equal(next.engineKey, "used");
});

test("applyFacetToCriteria clears rental on sale offer_type", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "real_estate", rentalTerm: "new_law" },
    "offer_type",
    "sale",
  );
  assert.equal(next.engineKey, "sale");
  assert.equal(next.rentalTerm, null);
});

test("applyFacetToCriteria maps industrial_type", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "facilities" },
    "industrial_type",
    "factory",
  );
  assert.equal(next.industrialType, "factory");
});

test("applyFacetToCriteria clears material when materials subtype leaves raw_material", () => {
  const next = applyFacetToCriteria(
    {
      ...DEFAULT_CRITERIA,
      category: "materials",
      industrialType: "raw_material",
      material: "steel",
    },
    "industrial_type",
    "machine",
  );
  assert.equal(next.industrialType, "machine");
  assert.equal(next.material, null);
});

test("applyFacetToCriteria ignores fuel_type when not on car", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "real_estate" },
    "fuel_type",
    "petrol",
  );
  assert.equal(next.fuelType, null);
});

test("applyFacetToCriteria maps industry on facilities", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "facilities", industrialType: "factory" },
    "industry",
    "food",
  );
  assert.equal(next.industry, "food");
});

test("applyFacetToCriteria ignores industry on materials commodity browse", () => {
  const next = applyFacetToCriteria(
    {
      ...DEFAULT_CRITERIA,
      category: "materials",
      industrialType: "raw_material",
    },
    "industry",
    "food",
  );
  assert.equal(next.industry, null);
});

test("applyFacetToCriteria maps origin_type on materials", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "materials" },
    "origin_type",
    "imported",
  );
  assert.equal(next.originType, "imported");
});

test("applyFacetToCriteria ignores origin_type outside materials", () => {
  const next = applyFacetToCriteria(
    { ...DEFAULT_CRITERIA, category: "car" },
    "origin_type",
    "imported",
  );
  assert.equal(next.originType, null);
});

test("applyFacetToCriteria maps material on materials commodity browse", () => {
  const next = applyFacetToCriteria(
    {
      ...DEFAULT_CRITERIA,
      category: "materials",
      industrialType: "raw_material",
    },
    "material",
    "steel",
  );
  assert.equal(next.material, "steel");
});

test("applyFacetToCriteria ignores material when materials subtype is machine", () => {
  const next = applyFacetToCriteria(
    {
      ...DEFAULT_CRITERIA,
      category: "materials",
      industrialType: "machine",
    },
    "material",
    "steel",
  );
  assert.equal(next.material, null);
});

test("facetSectionsForCategory gates browse-company facet buckets", async () => {
  const { facetSectionsForCategory } = await import("../src/facets.ts");

  assert.deepEqual(facetSectionsForCategory("car"), [
    "condition",
    "payment_plan",
    "fuel_type",
    "transmission",
  ]);
  assert.deepEqual(facetSectionsForCategory("real_estate"), [
    "offer_type",
    "property_type",
    "payment_plan",
  ]);
  assert.ok(!facetSectionsForCategory("real_estate").includes("fuel_type"));
  assert.ok(!facetSectionsForCategory("car").includes("property_type"));
  assert.ok(facetSectionsForCategory("materials").includes("origin_type"));
});
