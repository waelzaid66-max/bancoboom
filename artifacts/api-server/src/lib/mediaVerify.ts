/**
 * Transient-safe retry for first-party object-metadata reads.
 *
 * Reading the AUTHORITATIVE stored content-type/size of an uploaded object is on
 * the critical path of publishing a listing (ListingService.assert*WithinSizeLimit
 * and the /uploads/verify endpoint). A real GCS object is strongly consistent
 * right after its PUT, so a *missing* object is a permanent failure (re-upload),
 * but a network/API blip while reading metadata is transient and must NOT discard
 * an otherwise-valid listing. This module separates those two cases so callers can
 * fail closed on "not stored" yet retry/surface a clear error on "couldn't reach
 * storage".
 */

/** Internal routing code (NOT part of the public ApiError contract enum). */
export const MEDIA_VERIFY_RETRYABLE = "MEDIA_VERIFY_RETRYABLE" as const;

/**
 * Thrown when a first-party object's metadata could not be read after exhausting
 * retries (transient storage failure). Carries `code` so controllers can map it
 * to HTTP 503 and clients can tell the user "temporary — try again" instead of
 * treating the upload as invalid.
 */
export class MediaVerifyRetryableError extends Error {
  readonly code = MEDIA_VERIFY_RETRYABLE;
  constructor(message = "Storage verification temporarily unavailable") {
    super(message);
    this.name = "MediaVerifyRetryableError";
    Object.setPrototypeOf(this, MediaVerifyRetryableError.prototype);
  }
}

export interface ReadWithRetryOptions {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /**
   * Returns true when an error is permanent (e.g. object genuinely not found) and
   * must be rethrown immediately without retrying. Defaults to "nothing is
   * permanent" so every error is treated as transient.
   */
  isPermanent?: (err: unknown) => boolean;
  /** Backoff for the gap BEFORE attempt n+1 (1-based attempt). Default 100*attempt ms. */
  delayMs?: (attempt: number) => number;
  /** Injectable sleep (tests pass a no-op). */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Run `read`, retrying transient failures with backoff. A permanent error
 * (per `isPermanent`) is rethrown immediately. If all attempts fail with
 * transient errors, throws MediaVerifyRetryableError (preserving the last
 * message) so the caller never silently fails closed on a storage blip.
 */
export async function readWithRetry<T>(
  read: () => Promise<T>,
  opts: ReadWithRetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const isPermanent = opts.isPermanent ?? (() => false);
  const delayMs = opts.delayMs ?? ((attempt) => 100 * attempt);
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (isPermanent(err)) throw err;
      lastErr = err;
      if (attempt < attempts) await sleep(delayMs(attempt));
    }
  }
  throw new MediaVerifyRetryableError(
    lastErr instanceof Error ? lastErr.message : undefined
  );
}
