import { describe, it, expect, afterEach } from "vitest";
import { reportError, reportErrorAsync } from "./errorReporter";

/**
 * The contract that makes error-reporting safe to wire everywhere: it is
 * env-gated and can NEVER throw, slow, or crash the caller — a failed alert must
 * not turn one error into two. Pure unit test (no DB, no network needed).
 */
afterEach(() => {
  delete process.env.ERROR_ALERT_WEBHOOK;
});

describe("errorReporter — safe, env-gated observability", () => {
  it("no-ops the webhook when unconfigured and never throws", async () => {
    delete process.env.ERROR_ALERT_WEBHOOK;
    await expect(reportError(new Error("boom"), { path: "/x", method: "GET" })).resolves.toBeUndefined();
  });

  it("handles non-Error inputs without throwing (string / object / null)", async () => {
    delete process.env.ERROR_ALERT_WEBHOOK;
    await expect(reportError("string failure")).resolves.toBeUndefined();
    await expect(reportError({ weird: true })).resolves.toBeUndefined();
    await expect(reportError(null)).resolves.toBeUndefined();
  });

  it("never throws even when the alert webhook is unreachable (best-effort)", async () => {
    process.env.ERROR_ALERT_WEBHOOK = "http://127.0.0.1:1/cannot-connect";
    await expect(reportError(new Error("with webhook"))).resolves.toBeUndefined();
  });

  it("reportErrorAsync is fire-and-forget (returns void synchronously)", () => {
    delete process.env.ERROR_ALERT_WEBHOOK;
    expect(reportErrorAsync(new Error("async"))).toBeUndefined();
  });
});
