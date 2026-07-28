import { describe, it, expect, afterAll } from "vitest";
import { ObjectStorageService } from "./objectStorage";
import { assertImagesWithinSizeLimit } from "../services/ListingService";

/**
 * REAL upload round-trip — the byte-upload step the create→publish journey test
 * deliberately skips. This exercises the ACTUAL first-party object-storage path:
 *
 *   presign PUT (getObjectEntityUploadURL)
 *     → PUT real bytes to storage
 *       → read back the AUTHORITATIVE stored metadata (getServingObjectMetadata)
 *         → feed that real lookup into the create-listing image size-guard.
 *
 * No mocks: it talks to the same Replit object-storage sidecar the app uses. It
 * is skipped (not faked-green) when storage isn't configured, and every object
 * it writes is deleted in afterAll so the bucket isn't littered.
 */

// A real 1x1 transparent PNG (67 bytes decoded).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const hasStorage =
  !!process.env.PRIVATE_OBJECT_DIR && !!process.env.PUBLIC_OBJECT_SEARCH_PATHS;

describe.skipIf(!hasStorage)("object upload round-trip (real first-party storage)", () => {
  const svc = new ObjectStorageService();
  const createdPaths: string[] = [];

  afterAll(async () => {
    for (const objectPath of createdPaths) {
      try {
        const file = await svc.getObjectEntityFile(objectPath);
        await file.delete({ ignoreNotFound: true });
      } catch {
        // Best-effort cleanup; a leftover test object must never fail the suite.
      }
    }
  });

  /** Presign, PUT real bytes, and return the persistent serving URL. */
  async function uploadReal(
    bytes: Buffer,
    contentType: string,
  ): Promise<string> {
    const uploadURL = await svc.getObjectEntityUploadURL();
    const objectPath = svc.normalizeObjectEntityPath(uploadURL); // /objects/<id>
    createdPaths.push(objectPath);

    const put = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    if (!put.ok) {
      throw new Error(`PUT to storage failed: ${put.status} ${await put.text()}`);
    }

    const wildcard = objectPath.replace(/^\/objects\//, "");
    return `https://banco.today/api/v1/uploads/objects/${wildcard}`;
  }

  it("stores real bytes and reads back the authoritative size + content-type", async () => {
    const servingUrl = await uploadReal(PNG_1x1, "image/png");
    const meta = await svc.getServingObjectMetadata(servingUrl);
    expect(meta).not.toBeNull();
    expect(meta?.contentType).toBe("image/png");
    expect(meta?.size).toBe(PNG_1x1.byteLength);
  });

  it("returns null for a non-first-party (external CDN) URL", async () => {
    const meta = await svc.getServingObjectMetadata(
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8.jpg",
    );
    expect(meta).toBeNull();
  });

  it("the create-listing image size-guard passes against the REAL stored object", async () => {
    const servingUrl = await uploadReal(PNG_1x1, "image/png");
    await expect(
      assertImagesWithinSizeLimit([{ url: servingUrl }], (url) =>
        svc.getServingObjectMetadata(url),
      ),
    ).resolves.toBeUndefined();
  });
});
