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
