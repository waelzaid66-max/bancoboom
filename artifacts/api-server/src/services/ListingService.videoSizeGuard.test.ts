import { describe, it, expect } from "vitest";
import {
  assertVideosWithinSizeLimit,
  assertImagesWithinSizeLimit,
  MAX_VIDEO_BYTES,
  MAX_IMAGE_BYTES,
} from "./ListingService";
import {
  MediaVerifyRetryableError,
  MEDIA_VERIFY_RETRYABLE,
} from "../lib/mediaVerify";

// Defense-in-depth: the presigned PUT can't cap upload size and the mobile
// client check can be bypassed, so createListing verifies the ACTUAL stored
// object metadata (content-type + size) for every media URL before it can become
// public listing media. Crucially the kind is derived from the STORED
// content-type, never the client-declared media.type. These tests use an
// injected metadata lookup (no storage/DB).

const OVERSIZE = MAX_VIDEO_BYTES + 1;
const UNDER = MAX_VIDEO_BYTES - 1;
const vid = (size: number | null) => ({ contentType: "video/mp4", size });
const img = (size: number | null) => ({ contentType: "image/jpeg", size });

describe("assertVideosWithinSizeLimit", () => {
  it("rejects a stored video larger than the cap with INVALID_DATA", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () =>
        vid(OVERSIZE)
      )
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("accepts a stored video exactly at the cap", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () =>
        vid(MAX_VIDEO_BYTES)
      )
    ).resolves.toBeUndefined();
  });

  it("accepts a stored video just under the cap", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () =>
        vid(UNDER)
      )
    ).resolves.toBeUndefined();
  });

  it("never size-checks stored images even when huge", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/i.jpg" }], async () =>
        img(OVERSIZE)
      )
    ).resolves.toBeUndefined();
  });

  // The core security regression: a client mislabels an oversized video as an
  // image to dodge the gate. The guard reads the STORED content-type, so the
  // declared type is irrelevant and the oversize video is still rejected.
  it("rejects an oversized video even when the lookup is reached via an image-named url", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/looks-like.jpg" }], async () =>
        vid(OVERSIZE)
      )
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("rejects a stored video whose size can't be read (fail closed)", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () =>
        vid(null)
      )
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("skips URLs that aren't ours (lookup returns null)", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://cdn.example/x.mp4" }], async () =>
        null
      )
    ).resolves.toBeUndefined();
  });

  it("fails closed when a first-party lookup throws", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () => {
        throw new Error("object not found");
      })
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("rejects when ANY of several media is an oversized stored video", async () => {
    const media = [
      { url: "https://x/i.jpg" },
      { url: "https://x/ok.mp4" },
      { url: "https://x/big.mp4" },
    ];
    await expect(
      assertVideosWithinSizeLimit(media, async (url) =>
        url.includes("i.jpg")
          ? img(OVERSIZE)
          : url.includes("big")
            ? vid(OVERSIZE)
            : vid(UNDER)
      )
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  // A transient storage read (MediaVerifyRetryableError) must NOT be flattened to
  // INVALID_DATA — it has to propagate so the controller returns 503 and the
  // client retries instead of telling the seller their valid video is broken.
  it("propagates a retryable storage error instead of failing closed", async () => {
    await expect(
      assertVideosWithinSizeLimit([{ url: "https://x/v.mp4" }], async () => {
        throw new MediaVerifyRetryableError("storage blip");
      })
    ).rejects.toMatchObject({ code: MEDIA_VERIFY_RETRYABLE });
  });
});

describe("assertImagesWithinSizeLimit", () => {
  const IMG_OVERSIZE = MAX_IMAGE_BYTES + 1;

  it("rejects a stored image larger than the cap with INVALID_DATA", async () => {
    await expect(
      assertImagesWithinSizeLimit([{ url: "https://x/i.jpg" }], async () =>
        img(IMG_OVERSIZE)
      )
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("accepts a stored image at the cap", async () => {
    await expect(
      assertImagesWithinSizeLimit([{ url: "https://x/i.jpg" }], async () =>
        img(MAX_IMAGE_BYTES)
      )
    ).resolves.toBeUndefined();
  });

  it("never size-checks stored videos", async () => {
    await expect(
      assertImagesWithinSizeLimit([{ url: "https://x/v.mp4" }], async () =>
        vid(MAX_VIDEO_BYTES * 10)
      )
    ).resolves.toBeUndefined();
  });

  it("fails closed when a first-party lookup throws a generic error", async () => {
    await expect(
      assertImagesWithinSizeLimit([{ url: "https://x/i.jpg" }], async () => {
        throw new Error("unreadable");
      })
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("propagates a retryable storage error instead of failing closed", async () => {
    await expect(
      assertImagesWithinSizeLimit([{ url: "https://x/i.jpg" }], async () => {
        throw new MediaVerifyRetryableError();
      })
    ).rejects.toMatchObject({ code: MEDIA_VERIFY_RETRYABLE });
  });
});
