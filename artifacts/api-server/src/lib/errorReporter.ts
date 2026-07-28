import { logger } from "./logger";

/**
 * Production error observability — dependency-free + env-gated, so it works with
 * zero config and lights up the moment an alert webhook is provided.
 *
 *  - ALWAYS logs the error structurally via pino (shipped wherever the rotating
 *    logs are ingested) so nothing is ever silently swallowed.
 *  - When `ERROR_ALERT_WEBHOOK` is set (a Slack / Discord / generic incoming
 *    webhook), it ALSO POSTs a compact alert — best-effort, bounded by a short
 *    timeout, and it can NEVER throw into or slow down the caller.
 *
 * No third-party SDK is required; a full Sentry/Crashlytics integration can be
 * dropped in later behind the same `reportError` seam without touching callers.
 */

export type ErrorContext = Record<string, unknown>;

const WEBHOOK_TIMEOUT_MS = 3000;
const STACK_CAP = 2000;

export async function reportError(err: unknown, context: ErrorContext = {}): Promise<void> {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));

  // 1) Structured log — must never throw (logging is the last line of defense).
  try {
    logger.error({ err: e, ...context }, `[reportError] ${e.message}`);
  } catch {
    // ignore — a logging failure must not cascade
  }

  // 2) Optional external alert (read at call-time so config/tests are dynamic).
  const webhook = process.env.ERROR_ALERT_WEBHOOK?.trim();
  if (!webhook) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 BANCO error: ${e.message}`,
          error: e.message,
          stack: e.stack?.slice(0, STACK_CAP),
          context,
          env: process.env.NODE_ENV ?? "unknown",
          ts: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Best-effort: a failed/blocked/timed-out alert must never affect the request
    // or crash the process. The structured log above already captured the error.
  }
}

/** Fire-and-forget wrapper for callers that can't (or shouldn't) await. */
export function reportErrorAsync(err: unknown, context: ErrorContext = {}): void {
  void reportError(err, context);
}
