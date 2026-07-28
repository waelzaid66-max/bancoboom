import { and, eq, gt } from "drizzle-orm";
import { db } from "@workspace/db";
import { uploadClaims } from "@workspace/db/schema";
import { getObjectStorageService } from "./objectStorageProvider";
import { UploadOwnershipError } from "./objectStorage";

/** Matches presign TTL in object storage backends (15 minutes). */
export const UPLOAD_CLAIM_TTL_MS = 15 * 60 * 1000;

/**
 * After a successful verify, the seller may still be filling the listing form.
 * Extend the attach window so publish does not fail with a 403 expired claim.
 */
export const UPLOAD_CLAIM_VERIFIED_TTL_MS = 60 * 60 * 1000;

export const UPLOADS_SERVING_PREFIX = "/api/v1/uploads/objects/";

/** Parse a first-party serving URL into the wildcard path segment after /objects/. */
export function parseServingWildcard(servingUrl: string): string | null {
  try {
    const parsed = new URL(servingUrl);
    if (!parsed.pathname.startsWith(UPLOADS_SERVING_PREFIX)) return null;
    const wildcard = parsed.pathname.slice(UPLOADS_SERVING_PREFIX.length);
    return wildcard || null;
  } catch {
    return null;
  }
}

export function servingWildcardToObjectPath(wildcardPath: string): string {
  return `/objects/${wildcardPath}`;
}

/**
 * Record that `clerkId` presigned this upload slot. Called from request-url
 * immediately after generating the presigned PUT URL.
 */
export async function recordUploadClaim(
  objectPath: string,
  clerkId: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + UPLOAD_CLAIM_TTL_MS);
  await db
    .insert(uploadClaims)
    .values({ objectPath, clerkId, expiresAt })
    .onConflictDoUpdate({
      target: uploadClaims.objectPath,
      set: { clerkId, expiresAt },
    });
}

/**
 * Ensures the caller may use (verify / promote / attach) this upload URL.
 * Allows when: ACL owner already matches, or a valid non-expired presign claim exists.
 */
export async function assertCallerMayUseUpload(
  servingUrl: string,
  clerkId: string,
): Promise<void> {
  const wildcard = parseServingWildcard(servingUrl);
  if (!wildcard) return;

  const objectPath = servingWildcardToObjectPath(wildcard);
  const storage = getObjectStorageService();
  const aclOwner = await storage.getAclOwnerForServingUrl(servingUrl);
  if (aclOwner) {
    if (aclOwner !== clerkId) throw new UploadOwnershipError();
    return;
  }

  const now = new Date();
  const [claim] = await db
    .select({ clerkId: uploadClaims.clerkId })
    .from(uploadClaims)
    .where(and(eq(uploadClaims.objectPath, objectPath), gt(uploadClaims.expiresAt, now)))
    .limit(1);

  if (!claim || claim.clerkId !== clerkId) {
    throw new UploadOwnershipError();
  }
}

/** Remove the presign claim after a successful promote (optional cleanup). */
export async function consumeUploadClaim(objectPath: string): Promise<void> {
  await db.delete(uploadClaims).where(eq(uploadClaims.objectPath, objectPath));
}

/** Reset claim expiry after verify so slow listing drafts can still publish. */
export async function extendUploadClaimAfterVerify(
  objectPath: string,
  clerkId: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + UPLOAD_CLAIM_VERIFIED_TTL_MS);
  await db
    .update(uploadClaims)
    .set({ expiresAt })
    .where(and(eq(uploadClaims.objectPath, objectPath), eq(uploadClaims.clerkId, clerkId)));
}
