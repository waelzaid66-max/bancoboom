import { requestUploadUrl, verifyUpload } from "@workspace/api-client-react";

/**
 * Image content types the dealer can upload from a desktop browser. Kept in
 * sync with the server's ALLOWED_CONTENT_TYPES (uploadController.ts) minus the
 * mobile-only HEIC/HEIF (browsers can't render those in <img>, so we don't
 * accept them on the web — the dealer would never see a preview).
 */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

// Bound a single PUT so a stalled upload can never wedge the form forever.
const PUT_TIMEOUT_MS = 60_000;

export function isAllowedImageType(type: string | undefined | null): boolean {
  return !!type && ALLOWED_IMAGE_TYPES.has(type.toLowerCase());
}

/**
 * Upload one image File to object storage via the signed-URL flow and return
 * its persistent serving URL. Mirrors the mobile upload contract exactly:
 *   1. ask the API for a presigned PUT URL (cookie-authenticated, same-origin),
 *   2. PUT the raw bytes straight to storage — the PUT Content-Type is what the
 *      object is stored as, so it must be the real image type,
 *   3. verify the object actually landed with an allowed type + within the size
 *      cap using AUTHORITATIVE server-side metadata (surfaces the server's
 *      friendly size/type message on failure).
 *
 * The returned URL is promoted to public server-side when the listing is
 * created (ListingService), so it becomes viewable everywhere the listing shows.
 */
export async function uploadImageFile(file: File): Promise<string> {
  const contentType = (file.type || "").toLowerCase() || "image/jpeg";

  const res = await requestUploadUrl({
    filename: file.name || `upload-${Date.now()}.jpg`,
    content_type: contentType,
    size: file.size,
  });
  const data = res.data;
  if (!data?.upload_url || !data?.url) {
    throw new Error("Could not start the upload. Please try again.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUT_TIMEOUT_MS);
  let putRes: Response;
  try {
    putRes = await fetch(data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
      signal: controller.signal,
    });
  } catch {
    throw new Error("Upload failed — check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  if (!putRes.ok) {
    throw new Error(`Upload failed (HTTP ${putRes.status}). Please try again.`);
  }

  // Throws an ApiError carrying the server's message (e.g. size/type) on failure.
  await verifyUpload({ url: data.url });

  return data.url;
}
