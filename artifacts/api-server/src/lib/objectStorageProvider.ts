import { ObjectAclPolicy, ObjectPermission } from "./objectAcl";
import { ObjectStorageService as ReplitObjectStorageService } from "./objectStorage";
import { S3ObjectStorageService } from "./objectStorage.s3";

/**
 * Object-storage provider switch. The whole app talks to storage through this
 * factory so a single env var picks the backend:
 *   OBJECT_STORAGE_PROVIDER=s3       → AWS S3 (or S3-compatible endpoint)
 *   OBJECT_STORAGE_PROVIDER=replit   → Replit object-storage sidecar (default)
 *
 * There is no separate `gcs` provider value. Deploying on GCP should use either
 * the Replit sidecar (`replit`) or S3-compatible Cloud Storage HMAC credentials
 * with `s3` (see deploy/gcp/env/.env.production.example).
 *
 * Both backends implement the identical caller-facing surface below. The stored
 * object handle is provider-specific (a GCS `File` or an S3 `{key}` ref) and is
 * opaque to callers — it is only ever produced by getObjectEntityFile /
 * searchPublicObject and consumed by downloadObject / canAccessObjectEntity of
 * the SAME service instance, so it is typed as an opaque handle here.
 */

// Opaque, provider-specific storage handle. Never inspected by callers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoredObject = any;

export interface ObjectStorage {
  getPublicObjectSearchPaths(): string[];
  getPrivateObjectDir(): string;
  searchPublicObject(filePath: string): Promise<StoredObject | null>;
  downloadObject(file: StoredObject, cacheTtlSec?: number): Promise<Response>;
  getObjectEntityUploadURL(): Promise<string>;
  getObjectEntityFile(objectPath: string): Promise<StoredObject>;
  normalizeObjectEntityPath(rawPath: string): string;
  promoteServingUrlToPublic(servingUrl: string, ownerId: string): Promise<void>;
  getAclOwnerForServingUrl(servingUrl: string): Promise<string | null>;
  getServingObjectMetadata(
    servingUrl: string,
  ): Promise<{ contentType: string | null; size: number | null } | null>;
  /**
   * Best-effort deletion of first-party uploaded objects by serving URL
   * (privacy cleanup, e.g. account deletion). Never throws: foreign URLs are
   * skipped, missing objects count as deleted (idempotent), unexpected
   * storage errors are counted in `failed` for the caller to log loudly.
   */
  deleteServingUrls(
    servingUrls: string[],
  ): Promise<{ deleted: number; skipped: number; failed: number }>;
  trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string>;
  canAccessObjectEntity(args: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean>;
}

let cached: ObjectStorage | null = null;

/** Resolve the configured object-storage backend (memoised per process). */
export function getObjectStorageService(): ObjectStorage {
  if (cached) return cached;
  const provider = (process.env.OBJECT_STORAGE_PROVIDER || "replit").toLowerCase();
  if (provider === "s3") {
    cached = new S3ObjectStorageService();
    return cached;
  }
  if (provider === "replit" || provider === "") {
    cached = new ReplitObjectStorageService();
    return cached;
  }
  throw new Error(
    `Unsupported OBJECT_STORAGE_PROVIDER="${provider}". Supported: s3, replit.`,
  );
}

/** Test-only: drop the memoised instance so a new env can take effect. */
export function __resetObjectStorageServiceForTests(): void {
  cached = null;
}
