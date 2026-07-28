import { describe, it, expect } from "vitest";
import { sanitizeParsedSearchQuery } from "./sanitizeParsedSearchQuery";

describe("sanitizeParsedSearchQuery", () => {
  it("drops car fuel on industrial category", () => {
    const out = sanitizeParsedSearchQuery({
      category: "industrial",
      fuel_type: "petrol",
      industrial_type: ["factory"],
    });
    expect(out.fuel_type).toBeUndefined();
  });

  it("drops property_type on car category", () => {
    const out = sanitizeParsedSearchQuery({
      category: "car",
      property_type: "villa",
      brand: "Toyota",
    });
    expect(out.property_type).toBeUndefined();
    expect(out.brand).toBe("Toyota");
  });

  it("drops rental_term unless offer_type is rent", () => {
    const out = sanitizeParsedSearchQuery({
      category: "real_estate",
      offer_type: "sale",
      rental_term: "new_law",
    });
    expect(out.rental_term).toBeUndefined();
  });

  it("keeps rental_term when offer_type is rent", () => {
    const out = sanitizeParsedSearchQuery({
      category: "real_estate",
      offer_type: "rent",
      rental_term: "new_law",
    });
    expect(out.rental_term).toBe("new_law");
  });

  it("drops material on facilities-only industrial_type", () => {
    const out = sanitizeParsedSearchQuery({
      category: "industrial",
      industrial_type: ["factory", "warehouse"],
      material: "steel",
    });
    expect(out.material).toBeUndefined();
  });

  it("drops industry on raw_material-only industrial browse", () => {
    const out = sanitizeParsedSearchQuery({
      category: "industrial",
      industrial_type: ["raw_material"],
      industry: "food",
    });
    expect(out.industry).toBeUndefined();
  });

  it("drops origin on facilities-only industrial", () => {
    const out = sanitizeParsedSearchQuery({
      category: "industrial",
      industrial_type: ["land"],
      origin_type: "imported",
    });
    expect(out.origin_type).toBeUndefined();
  });

  it("drops installment on industrial", () => {
    const out = sanitizeParsedSearchQuery({
      category: "industrial",
      has_installment: true,
    });
    expect(out.has_installment).toBeUndefined();
  });
});
