import { describe, it, expect } from "vitest";
import { escapeLikeLiteral } from "./sqlLikeEscape";

describe("escapeLikeLiteral (C-02 upload serve LIKE)", () => {
  it("leaves safe path segments unchanged", () => {
    expect(escapeLikeLiteral("uploads/abc-123.jpg")).toBe("uploads/abc-123.jpg");
  });

  it("escapes SQL LIKE wildcards and backslash", () => {
    expect(escapeLikeLiteral("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });

  it("does not let a percent widen a suffix pattern", () => {
    const malicious = "evil%";
    const suffix = `%/api/v1/uploads/objects/${escapeLikeLiteral(malicious)}`;
    expect(suffix).toBe("%/api/v1/uploads/objects/evil\\%");
    expect(suffix).not.toContain("evil%");
  });
});
