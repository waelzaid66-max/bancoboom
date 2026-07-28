import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  isEncryptedToken,
} from "./secretCrypto";

// Pure (no-DB) suite: set a deterministic key so encrypt/decrypt are self-contained.
beforeAll(() => {
  process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = "unit_test_master_key";
});

describe("secretCrypto (AES-256-GCM at-rest encryption)", () => {
  it("round-trips a secret", () => {
    const plain = "egy_sk_test_abc123_!@#";
    const token = encryptSecret(plain);
    expect(token).toMatch(/^v1:/);
    expect(token).not.toContain(plain);
    expect(decryptSecret(token)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-secret");
    const b = encryptSecret("same-secret");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-secret");
    expect(decryptSecret(b)).toBe("same-secret");
  });

  it("throws when the ciphertext is tampered with", () => {
    const token = encryptSecret("tamper-me");
    const body = token.slice(3);
    const flipped =
      "v1:" + (body[0] === "A" ? "B" : "A") + body.slice(1);
    expect(() => decryptSecret(flipped)).toThrow();
  });

  it("rejects an unrecognized token format", () => {
    expect(() => decryptSecret("not-a-token")).toThrow();
    expect(() => decryptSecret("v2:abcd")).toThrow();
  });

  it("recognizes its own tokens", () => {
    expect(isEncryptedToken(encryptSecret("x"))).toBe(true);
    expect(isEncryptedToken("plaintext")).toBe(false);
    expect(isEncryptedToken(null)).toBe(false);
  });
});
