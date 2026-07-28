import { requestUploadUrl, verifyUpload } from "@workspace/api-client-react";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const PUT_TIMEOUT_MS = 60_000;

export function isAllowedImageType(type: string | undefined | null): boolean {
  return !!type && ALLOWED_IMAGE_TYPES.has(type.toLowerCase());
}

/** Signed URL upload flow — same contract as dealer-os and mobile. */
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

  await verifyUpload({ url: data.url });
  return data.url;
}
