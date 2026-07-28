import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import { logger } from "./logger";
import { readWithRetry } from "./mediaVerify";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/** Thrown when a user tries to promote or attach another user's upload. */
export class UploadOwnershipError extends Error {
  constructor(message = "You do not own this upload") {
    super(message);
    this.name = "UploadOwnershipError";
    Object.setPrototypeOf(this, UploadOwnershipError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async promoteServingUrlToPublic(servingUrl: string, ownerId: string): Promise<void> {
    let wildcardPath: string;
    try {
      const parsed = new URL(servingUrl);
      const UPLOADS_PREFIX = "/api/v1/uploads/objects/";
      if (!parsed.pathname.startsWith(UPLOADS_PREFIX)) return;
      wildcardPath = parsed.pathname.slice(UPLOADS_PREFIX.length);
      if (!wildcardPath) return;
    } catch {
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;
    try {
      const objectFile = await this.getObjectEntityFile(objectPath);
      const existing = await getObjectAclPolicy(objectFile);
      if (existing && existing.owner !== ownerId) {
        throw new UploadOwnershipError();
      }
      await setObjectAclPolicy(objectFile, { owner: ownerId, visibility: "public" });
    } catch (err) {
      if (err instanceof UploadOwnershipError) throw err;
      // Object may not exist yet or path is malformed.  Log for observability
      // so media promotion failures are detectable without blocking the caller.
      logger.warn({ err, wildcardPath, ownerId }, "promoteServingUrlToPublic: failed to set ACL");
    }
  }

  async getAclOwnerForServingUrl(servingUrl: string): Promise<string | null> {
    let wildcardPath: string;
    try {
      const parsed = new URL(servingUrl);
      const UPLOADS_PREFIX = "/api/v1/uploads/objects/";
      if (!parsed.pathname.startsWith(UPLOADS_PREFIX)) return null;
      wildcardPath = parsed.pathname.slice(UPLOADS_PREFIX.length);
      if (!wildcardPath) return null;
    } catch {
      return null;
    }
    try {
      const objectFile = await this.getObjectEntityFile(`/objects/${wildcardPath}`);
      const policy = await getObjectAclPolicy(objectFile);
      return policy?.owner ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Returns the AUTHORITATIVE stored content-type + byte size of the object
   * referenced by a serving URL (as returned by requestUploadUrlHandler), or
   * null when the URL isn't a first-party upload URL (external CDN/host). Throws
   * ObjectNotFoundError if a first-party object is missing. Used to enforce media
   * limits server-side from the real stored metadata — the presigned PUT can't
   * cap upload size and the client-declared media type can't be trusted.
   *
   * Serving URL shape: https?://<host>/api/v1/uploads/objects/<wildcardPath>
   */
  async getServingObjectMetadata(
    servingUrl: string
  ): Promise<{ contentType: string | null; size: number | null } | null> {
    let wildcardPath: string;
    try {
      const parsed = new URL(servingUrl);
      const UPLOADS_PREFIX = "/api/v1/uploads/objects/";
      if (!parsed.pathname.startsWith(UPLOADS_PREFIX)) return null;
      wildcardPath = parsed.pathname.slice(UPLOADS_PREFIX.length);
      if (!wildcardPath) return null;
    } catch {
      return null;
    }

    // A real GCS object is strongly consistent right after its PUT, so a missing
    // object (ObjectNotFoundError) is permanent — rethrow immediately. A network/
    // API blip while reading metadata is transient: retry with backoff, and if it
    // never recovers surface a MediaVerifyRetryableError instead of silently
    // failing closed on a valid upload.
    return readWithRetry(
      async () => {
        const objectFile = await this.getObjectEntityFile(`/objects/${wildcardPath}`);
        const [metadata] = await objectFile.getMetadata();
        const contentType =
          typeof metadata.contentType === "string" ? metadata.contentType : null;
        const size = metadata.size != null ? Number(metadata.size) : null;
        return { contentType, size };
      },
      { isPermanent: (err) => err instanceof ObjectNotFoundError }
    );
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  /**
   * Best-effort deletion of first-party uploaded objects by their public
   * serving URLs (shape: https://<host>/api/v1/uploads/objects/<wildcard>).
   * Used by account deletion to remove chat media blobs after the DB
   * tombstone commits. Never throws: non-first-party URLs are skipped,
   * already-missing objects count as deleted (idempotent), and unexpected
   * storage errors are counted in `failed` so the caller can log loudly.
   */
  async deleteServingUrls(
    servingUrls: string[]
  ): Promise<{ deleted: number; skipped: number; failed: number }> {
    let deleted = 0;
    let skipped = 0;
    let failed = 0;
    for (const url of servingUrls) {
      let wildcardPath: string | null = null;
      try {
        const parsed = new URL(url);
        const UPLOADS_PREFIX = "/api/v1/uploads/objects/";
        if (parsed.pathname.startsWith(UPLOADS_PREFIX)) {
          wildcardPath = parsed.pathname.slice(UPLOADS_PREFIX.length) || null;
        }
      } catch {
        wildcardPath = null;
      }
      if (!wildcardPath) {
        skipped++;
        continue;
      }
      try {
        const objectFile = await this.getObjectEntityFile(`/objects/${wildcardPath}`);
        await objectFile.delete();
        deleted++;
      } catch (err) {
        if (err instanceof ObjectNotFoundError) {
          deleted++; // already gone — deletion is idempotent
          continue;
        }
        if ((err as { code?: number }).code === 404) {
          deleted++; // raced away between resolve and delete — same outcome
          continue;
        }
        failed++;
      }
    }
    return { deleted, skipped, failed };
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = (await response.json()) as { signed_url: string };
  return signedURL;
}
