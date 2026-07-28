import { describe, it, expect, afterEach, vi } from "vitest";

/**
 * The allowlist is computed once at module load from the environment, so each
 * scenario re-imports the module after setting the relevant env vars.
 */
const ORIGINAL_ENV = { ...process.env };

type CorsModule = typeof import("./cors");

async function loadCors(env: Record<string, string | undefined>): Promise<CorsModule> {
  vi.resetModules();
  delete process.env.CORS_ALLOWED_ORIGINS;
  delete process.env.REPLIT_DOMAINS;
  delete process.env.REPLIT_DEV_DOMAIN;
  delete process.env.NODE_ENV;
  delete process.env.REPLIT_DEPLOYMENT;
  Object.assign(process.env, env);
  return import("./cors");
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("isAllowedOrigin", () => {
  it("allows this Repl's own Replit domain (REPLIT_DOMAINS, bare host)", async () => {
    const { isAllowedOrigin } = await loadCors({
      REPLIT_DOMAINS: "myapp.janeway.replit.dev",
    });
    expect(isAllowedOrigin("https://myapp.janeway.replit.dev")).toBe(true);
  });

  it("allows the REPLIT_DEV_DOMAIN preview origin", async () => {
    const { isAllowedOrigin } = await loadCors({
      REPLIT_DEV_DOMAIN: "preview.janeway.replit.dev",
    });
    expect(isAllowedOrigin("https://preview.janeway.replit.dev")).toBe(true);
  });

  it("REJECTS attacker-controlled shared Replit suffixes (the vuln)", async () => {
    const { isAllowedOrigin } = await loadCors({
      REPLIT_DOMAINS: "myapp.janeway.replit.dev",
    });
    expect(isAllowedOrigin("https://evil.replit.app")).toBe(false);
    expect(isAllowedOrigin("https://evil.replit.dev")).toBe(false);
    expect(isAllowedOrigin("https://evil.repl.co")).toBe(false);
    expect(isAllowedOrigin("https://evil.riker.replit.dev")).toBe(false);
  });

  it("allows explicit CORS_ALLOWED_ORIGINS entries (comma/space separated)", async () => {
    const { isAllowedOrigin } = await loadCors({
      CORS_ALLOWED_ORIGINS: "https://app.banco.com, https://admin.banco.com",
    });
    expect(isAllowedOrigin("https://app.banco.com")).toBe(true);
    expect(isAllowedOrigin("https://admin.banco.com")).toBe(true);
    expect(isAllowedOrigin("https://other.example.com")).toBe(false);
  });

  it("allows requests with no Origin (native mobile bearer / server / curl)", async () => {
    const { isAllowedOrigin } = await loadCors({});
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin("")).toBe(true);
  });

  it("allows localhost only outside production", async () => {
    const dev = await loadCors({ NODE_ENV: "development" });
    expect(dev.isAllowedOrigin("http://localhost:5173")).toBe(true);
    expect(dev.isAllowedOrigin("http://127.0.0.1:3000")).toBe(true);

    const prod = await loadCors({ NODE_ENV: "production" });
    expect(prod.isAllowedOrigin("http://localhost:5173")).toBe(false);
    expect(prod.isAllowedOrigin("http://127.0.0.1:3000")).toBe(false);
  });

  it("rejects localhost in a deployment even when NODE_ENV is unset", async () => {
    const deployed = await loadCors({ REPLIT_DEPLOYMENT: "1" });
    expect(deployed.isAllowedOrigin("http://localhost:5173")).toBe(false);
    expect(deployed.isAllowedOrigin("http://127.0.0.1:3000")).toBe(false);
  });

  it("normalizes bare hosts and is case-insensitive", async () => {
    const { isAllowedOrigin } = await loadCors({
      REPLIT_DOMAINS: "MyApp.Janeway.Replit.Dev",
    });
    expect(isAllowedOrigin("https://myapp.janeway.replit.dev")).toBe(true);
  });

  it("does not match a look-alike suffix of an allowed host", async () => {
    const { isAllowedOrigin } = await loadCors({
      REPLIT_DOMAINS: "myapp.janeway.replit.dev",
    });
    expect(isAllowedOrigin("https://evil-myapp.janeway.replit.dev")).toBe(false);
    expect(isAllowedOrigin("https://myapp.janeway.replit.dev.evil.com")).toBe(false);
  });
});

describe("isSameOrigin", () => {
  it("matches when the Origin host equals the request Host", async () => {
    const { isSameOrigin } = await loadCors({});
    expect(isSameOrigin("https://app.example.com", "app.example.com")).toBe(true);
    expect(isSameOrigin("https://app.example.com:8080", "app.example.com:8080")).toBe(true);
  });

  it("does not match a different host or a missing Host", async () => {
    const { isSameOrigin } = await loadCors({});
    expect(isSameOrigin("https://evil.example.com", "app.example.com")).toBe(false);
    expect(isSameOrigin("https://app.example.com", undefined)).toBe(false);
  });
});

describe("shouldRejectUnsafeOrigin", () => {
  it("rejects cross-origin unsafe methods from disallowed origins", async () => {
    const { shouldRejectUnsafeOrigin } = await loadCors({
      REPLIT_DOMAINS: "app.janeway.replit.dev",
    });
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(
        shouldRejectUnsafeOrigin(method, "https://evil.replit.app", "app.janeway.replit.dev"),
      ).toBe(true);
    }
  });

  it("never rejects safe methods regardless of origin", async () => {
    const { shouldRejectUnsafeOrigin } = await loadCors({});
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        shouldRejectUnsafeOrigin(method, "https://evil.replit.app", "app.janeway.replit.dev"),
      ).toBe(false);
    }
  });

  it("allows unsafe methods with no Origin (native mobile bearer / server)", async () => {
    const { shouldRejectUnsafeOrigin } = await loadCors({});
    expect(shouldRejectUnsafeOrigin("POST", undefined, "app.janeway.replit.dev")).toBe(false);
  });

  it("allows same-origin unsafe requests via host match even with no allowlist", async () => {
    const { shouldRejectUnsafeOrigin } = await loadCors({});
    expect(
      shouldRejectUnsafeOrigin("POST", "https://app.example.com", "app.example.com"),
    ).toBe(false);
  });

  it("allows allowlisted cross-origin unsafe requests", async () => {
    const { shouldRejectUnsafeOrigin } = await loadCors({
      CORS_ALLOWED_ORIGINS: "https://app.banco.com",
    });
    expect(
      shouldRejectUnsafeOrigin("POST", "https://app.banco.com", "api.banco.com"),
    ).toBe(false);
  });
});
