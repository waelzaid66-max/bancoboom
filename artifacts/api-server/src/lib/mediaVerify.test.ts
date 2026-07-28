import { describe, it, expect, vi } from "vitest";
import {
  readWithRetry,
  MediaVerifyRetryableError,
  MEDIA_VERIFY_RETRYABLE,
} from "./mediaVerify";

const noSleep = async () => {};

class NotFound extends Error {
  constructor() {
    super("not found");
    this.name = "NotFound";
  }
}
const isNotFound = (e: unknown) => e instanceof NotFound;

describe("readWithRetry", () => {
  it("returns the value on first success (no retry)", async () => {
    const read = vi.fn(async () => 42);
    await expect(readWithRetry(read, { sleep: noSleep })).resolves.toBe(42);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    let calls = 0;
    const read = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("transient blip");
      return "ok";
    });
    await expect(
      readWithRetry(read, { attempts: 3, sleep: noSleep })
    ).resolves.toBe("ok");
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("rethrows a permanent error immediately without retrying", async () => {
    const read = vi.fn(async () => {
      throw new NotFound();
    });
    await expect(
      readWithRetry(read, { isPermanent: isNotFound, sleep: noSleep })
    ).rejects.toBeInstanceOf(NotFound);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("throws MediaVerifyRetryableError after exhausting transient attempts", async () => {
    const read = vi.fn(async () => {
      throw new Error("still down");
    });
    await expect(
      readWithRetry(read, { attempts: 3, sleep: noSleep })
    ).rejects.toMatchObject({ code: MEDIA_VERIFY_RETRYABLE });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("preserves the last transient message on the retryable error", async () => {
    const read = async () => {
      throw new Error("ECONNRESET");
    };
    await expect(
      readWithRetry(read, { attempts: 2, sleep: noSleep })
    ).rejects.toMatchObject({
      code: MEDIA_VERIFY_RETRYABLE,
      message: "ECONNRESET",
    });
  });

  it("MediaVerifyRetryableError is identifiable by instance and code", () => {
    const err = new MediaVerifyRetryableError();
    expect(err).toBeInstanceOf(MediaVerifyRetryableError);
    expect(err.code).toBe(MEDIA_VERIFY_RETRYABLE);
  });
});
