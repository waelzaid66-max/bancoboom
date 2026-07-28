import { describe, it, expect } from "vitest";
import { mergeBusinessCompanyDetails } from "./mergeBusinessCompanyDetails";

describe("mergeBusinessCompanyDetails (F-SEC-07)", () => {
  const base = {
    activity_type: "financial_institution",
    business_name: "Cairo Bank",
    city: "Cairo",
  };

  it("preserves prior documents when the update omits documents", () => {
    const next = mergeBusinessCompanyDetails(
      { ...base, documents: ["https://cdn/a.pdf", "https://cdn/b.pdf"] },
      { ...base, business_name: "Cairo Bank Renamed" },
    );
    expect(next.business_name).toBe("Cairo Bank Renamed");
    expect(next.documents).toEqual(["https://cdn/a.pdf", "https://cdn/b.pdf"]);
  });

  it("preserves prior documents when the client sends an empty array", () => {
    const next = mergeBusinessCompanyDetails(
      { ...base, documents: ["https://cdn/keep.pdf"] },
      { ...base, documents: [] },
    );
    expect(next.documents).toEqual(["https://cdn/keep.pdf"]);
  });

  it("replaces documents when a non-empty list is provided", () => {
    const next = mergeBusinessCompanyDetails(
      { ...base, documents: ["https://cdn/old.pdf"] },
      { ...base, documents: ["https://cdn/new.pdf"] },
    );
    expect(next.documents).toEqual(["https://cdn/new.pdf"]);
  });

  it("works when there was no prior companyDetails", () => {
    const next = mergeBusinessCompanyDetails(null, {
      ...base,
      documents: ["https://cdn/first.pdf"],
    });
    expect(next.documents).toEqual(["https://cdn/first.pdf"]);
  });
});

// FI licence evidence must survive a later profile re-save that omits it —
// same compliance rule as documents (F-SEC-07). A bank editing its city must
// not silently drop the licence an admin verified it on.
describe("mergeBusinessCompanyDetails — FI regulatory identity", () => {
  it("preserves FI fields when a later save omits them", () => {
    const existing = {
      activity_type: "financial_institution",
      business_name: "Nile Bank",
      city: "Cairo",
      fi_license_number: "CBE-2024-00187",
      fi_license_type: "bank",
      fi_regulator: "Central Bank of Egypt",
      fi_registry_number: "RG-99120",
    };
    const next = mergeBusinessCompanyDetails(existing, {
      activity_type: "financial_institution",
      business_name: "Nile Bank",
      city: "Giza",
    });
    expect(next.fi_license_number).toBe("CBE-2024-00187");
    expect(next.fi_license_type).toBe("bank");
    expect(next.fi_regulator).toBe("Central Bank of Egypt");
    expect(next.fi_registry_number).toBe("RG-99120");
    expect(next.city).toBe("Giza");
  });

  it("lets incoming FI fields overwrite stored ones", () => {
    const next = mergeBusinessCompanyDetails(
      { fi_license_number: "OLD-1", fi_regulator: "FRA" },
      {
        activity_type: "financial_institution",
        business_name: "Delta Finance",
        city: "Alexandria",
        fi_license_number: "NEW-2",
        fi_license_type: "financing_company",
        fi_regulator: "Central Bank of Egypt",
        fi_registry_number: "RG-1",
      },
    );
    expect(next.fi_license_number).toBe("NEW-2");
    expect(next.fi_license_type).toBe("financing_company");
    expect(next.fi_regulator).toBe("Central Bank of Egypt");
  });

  // A dealer/factory payload must stay exactly as it was before this change.
  it("adds no FI keys to a non-FI business payload", () => {
    const next = mergeBusinessCompanyDetails(null, {
      activity_type: "car_dealer",
      business_name: "Cairo Motors",
      city: "Cairo",
    });
    expect(Object.keys(next).sort()).toEqual([
      "activity_type",
      "business_name",
      "city",
    ]);
  });
});
