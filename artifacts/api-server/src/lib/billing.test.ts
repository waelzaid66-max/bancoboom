import { describe, it, expect } from "vitest";
import {
  toMoney,
  isUniqueViolation,
  generateInvoiceNumber,
  isInsufficientFunds,
  insufficientFunds,
  invalidData,
  notFound,
  unauthorized,
} from "./billing";

describe("toMoney", () => {
  it("formats numbers to a fixed 2 decimals", () => {
    expect(toMoney(100)).toBe("100.00");
    expect(toMoney(99.5)).toBe("99.50");
    expect(toMoney(0)).toBe("0.00");
  });

  it("parses numeric strings", () => {
    expect(toMoney("12.5")).toBe("12.50");
    expect(toMoney("0.1")).toBe("0.10");
  });

  it("throws INVALID_DATA for non-finite input", () => {
    expect(() => toMoney("abc")).toThrowError(/Invalid monetary amount/);
    expect(() => toMoney(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => toMoney(Number.NaN)).toThrow();
    try {
      toMoney("nope");
    } catch (e) {
      expect((e as { code?: string }).code).toBe("INVALID_DATA");
    }
  });
});

describe("isUniqueViolation", () => {
  it("detects SQLSTATE 23505 directly and via cause", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
  });

  it("is false for other errors / non-objects", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});

describe("generateInvoiceNumber", () => {
  it("produces the INV-YYYYMMDD-<12 hex> shape and is deterministic", () => {
    const id = "abcdef01-2345-6789-abcd-ef0123456789";
    const a = generateInvoiceNumber(id);
    const b = generateInvoiceNumber(id);
    expect(a).toMatch(/^INV-\d{8}-[0-9A-F]{12}$/);
    expect(a).toBe(b);
    expect(a.endsWith("ABCDEF012345")).toBe(true);
  });
});

describe("coded errors", () => {
  it("carries the right codes", () => {
    expect(invalidData("x").code).toBe("INVALID_DATA");
    expect(notFound("x").code).toBe("NOT_FOUND");
    expect(unauthorized("x").code).toBe("UNAUTHORIZED");
  });

  it("isInsufficientFunds only matches the insufficient marker", () => {
    expect(isInsufficientFunds(insufficientFunds())).toBe(true);
    expect(isInsufficientFunds(invalidData("x"))).toBe(false);
    expect(isInsufficientFunds(notFound("x"))).toBe(false);
    expect(isInsufficientFunds(null)).toBe(false);
  });

  it("insufficientFunds is still an INVALID_DATA error", () => {
    expect(insufficientFunds().code).toBe("INVALID_DATA");
  });
});
