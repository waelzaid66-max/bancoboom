import { describe, it, expect } from "vitest";
import {
  cleanText,
  detectCategory,
  detectSpamKeywords,
  validateMedia,
  computeTrustScore,
} from "./NormalizationService";

describe("cleanText", () => {
  it("collapses whitespace, repeated chars and normalizes punctuation spacing", () => {
    expect(cleanText("Hello    world")).toBe("Hello world");
    expect(cleanText("amazing!!!!!!")).toBe("amazing!!!");
    expect(cleanText("good,bad")).toBe("good, bad");
    expect(cleanText("  trimmed text  ")).toBe("trimmed text");
  });
});

describe("detectCategory", () => {
  it("infers the category from free text (EN + AR), defaulting to car", () => {
    expect(detectCategory("Toyota Corolla sedan car")).toBe("car");
    expect(detectCategory("Spacious apartment for sale")).toBe("real_estate");
    expect(detectCategory("Large factory with a production line")).toBe("industrial");
    expect(detectCategory("شقة للبيع في القاهرة")).toBe("real_estate");
    expect(detectCategory("something unrelated")).toBe("car");
  });
});

describe("detectSpamKeywords", () => {
  it("flags known spam phrases, embedded URLs and phone stuffing", () => {
    expect(detectSpamKeywords("Best price ever on this car")).toContain("best price ever");
    expect(detectSpamKeywords("Great deal", "visit www.spam.com now")).toContain("contains_url");
    expect(detectSpamKeywords("Car 01001234567")).toContain("phone_in_title");
  });

  it("returns nothing for clean copy", () => {
    expect(detectSpamKeywords("Toyota Corolla 2020 clean title")).toEqual([]);
    expect(
      detectSpamKeywords("JRNYSELL_550e8400-e29b-41d4-a716-446655440000 sedan for sale"),
    ).toEqual([]);
  });
});

describe("validateMedia", () => {
  it("requires at least one image", () => {
    const r = validateMedia([]);
    expect(r.valid).toBe(false);
    expect(r.imageCount).toBe(0);
    expect(r.hasVideo).toBe(false);
    expect(r.errors).toContain("At least one image is required");
  });

  it("accepts a single sufficiently-sized image", () => {
    const r = validateMedia([{ type: "image", url: "a.jpg", width: 800, height: 600 }]);
    expect(r.valid).toBe(true);
    expect(r.imageCount).toBe(1);
    expect(r.hasVideo).toBe(false);
    expect(r.hasDuplicate).toBe(false);
    expect(r.errors).toEqual([]);
  });

  it("detects duplicate urls case-insensitively", () => {
    const r = validateMedia([
      { type: "image", url: "a.jpg" },
      { type: "image", url: "A.JPG" },
    ]);
    expect(r.hasDuplicate).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Duplicate media files are not allowed");
  });

  it("rejects low-resolution images and detects video", () => {
    const low = validateMedia([{ type: "image", url: "a.jpg", width: 100, height: 100 }]);
    expect(low.valid).toBe(false);
    expect(low.errors.some((e) => e.includes("resolution too low"))).toBe(true);

    const withVideo = validateMedia([
      { type: "image", url: "a.jpg", width: 800, height: 600 },
      { type: "video", url: "v.mp4" },
    ]);
    expect(withVideo.hasVideo).toBe(true);
    expect(withVideo.valid).toBe(true);
  });
});

describe("computeTrustScore", () => {
  const base = {
    sellerVerified: false,
    imageCount: 0,
    hasVideo: false,
    attributeCompleteness: 0,
    taxonomyCompleteness: 0,
    isDuplicate: false,
  };

  it("starts from a neutral baseline of 40", () => {
    expect(computeTrustScore(base)).toBe(40);
  });

  it("rewards verification, completeness, images and video (clamped at 100)", () => {
    expect(
      computeTrustScore({
        sellerVerified: true,
        imageCount: 3,
        hasVideo: true,
        attributeCompleteness: 1,
        taxonomyCompleteness: 1,
        isDuplicate: false,
      }),
    ).toBe(100);
  });

  it("blends partial signals", () => {
    // 40 + 20 (verified) + round(0.5*15)=8 + 0 + 2 (>=1 image) = 70
    expect(
      computeTrustScore({ ...base, sellerVerified: true, imageCount: 1, attributeCompleteness: 0.5 }),
    ).toBe(70);
  });

  it("penalizes duplicates and never goes below 0", () => {
    expect(computeTrustScore({ ...base, isDuplicate: true })).toBe(10);
  });
});
