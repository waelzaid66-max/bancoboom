import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../__tests__/helpers";
import { uploadClaims } from "@workspace/db/schema";
import {
  recordUploadClaim,
  assertCallerMayUseUpload,
  extendUploadClaimAfterVerify,
  UPLOAD_CLAIM_VERIFIED_TTL_MS,
} from "./uploadClaims";
import { UploadOwnershipError } from "./objectStorage";

const clerkA = `clerk_${randomUUID()}`;
const clerkB = `clerk_${randomUUID()}`;

describe("uploadClaims", () => {
  it("allows the presigning user to use their upload", async () => {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    await recordUploadClaim(objectPath, clerkA);
    const url = `https://banco.example/api/v1/uploads/objects/uploads/${objectPath.split("/").pop()}`;
    await expect(assertCallerMayUseUpload(url, clerkA)).resolves.toBeUndefined();
    await db.delete(uploadClaims).where(eq(uploadClaims.objectPath, objectPath));
  });

  it("rejects another user from using the same upload (IDOR)", async () => {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    await recordUploadClaim(objectPath, clerkA);
    const url = `https://banco.example/api/v1/uploads/objects/uploads/${objectPath.split("/").pop()}`;
    await expect(assertCallerMayUseUpload(url, clerkB)).rejects.toBeInstanceOf(
      UploadOwnershipError,
    );
    await db.delete(uploadClaims).where(eq(uploadClaims.objectPath, objectPath));
  });

  it("rejects expired claims", async () => {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    const expiredAt = new Date(Date.now() - 1000);
    await db.insert(uploadClaims).values({
      objectPath,
      clerkId: clerkA,
      expiresAt: expiredAt,
    });
    const url = `https://banco.example/api/v1/uploads/objects/uploads/${objectPath.split("/").pop()}`;
    await expect(assertCallerMayUseUpload(url, clerkA)).rejects.toBeInstanceOf(
      UploadOwnershipError,
    );
    await db.delete(uploadClaims).where(eq(uploadClaims.objectPath, objectPath));
  });

  it("extends claim expiry after verify window", async () => {
    const objectPath = `/objects/uploads/${randomUUID()}`;
    const shortExpiry = new Date(Date.now() + 1000);
    await db.insert(uploadClaims).values({
      objectPath,
      clerkId: clerkA,
      expiresAt: shortExpiry,
    });
    await extendUploadClaimAfterVerify(objectPath, clerkA);
    const [row] = await db
      .select({ expiresAt: uploadClaims.expiresAt })
      .from(uploadClaims)
      .where(eq(uploadClaims.objectPath, objectPath))
      .limit(1);
    expect(row?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + UPLOAD_CLAIM_VERIFIED_TTL_MS - 5000,
    );
    await db.delete(uploadClaims).where(eq(uploadClaims.objectPath, objectPath));
  });
});
