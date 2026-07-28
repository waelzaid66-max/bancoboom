import { describe, it, expect, vi, afterEach } from "vitest";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

// Contract test for the Replit/GCS backend's deleteServingUrls (the S3
// backend has its own in objectStorage.s3.test.ts): verifies serving-URL
// parsing, idempotency on missing objects, and that failures never throw —
// without touching the real sidecar (getObjectEntityFile is stubbed).
describe("ObjectStorageService.deleteServingUrls (replit backend)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes resolved objects, skips foreign/invalid URLs, treats missing as deleted", async () => {
    const svc = new ObjectStorageService();
    const del = vi.fn(async () => {});
    vi.spyOn(svc, "getObjectEntityFile").mockImplementation(async (p: string) => {
      if (p === "/objects/uploads/missing") throw new ObjectNotFoundError();
      return { delete: del } as never;
    });

    const res = await svc.deleteServingUrls([
      "https://host.example.com/api/v1/uploads/objects/uploads/a",
      "https://host.example.com/api/v1/uploads/objects/uploads/missing",
      "not a url",
      "https://cdn.example.com/foreign.jpg",
    ]);

    expect(res).toEqual({ deleted: 2, skipped: 2, failed: 0 });
    expect(svc.getObjectEntityFile).toHaveBeenCalledWith("/objects/uploads/a");
    expect(del).toHaveBeenCalledTimes(1);
  });

  it("counts unexpected storage errors as failed and never throws", async () => {
    const svc = new ObjectStorageService();
    vi.spyOn(svc, "getObjectEntityFile").mockImplementation(
      async () =>
        ({
          delete: async () => {
            throw new Error("gcs 500");
          },
        }) as never,
    );

    const res = await svc.deleteServingUrls([
      "https://host.example.com/api/v1/uploads/objects/uploads/x",
    ]);
    expect(res).toEqual({ deleted: 0, skipped: 0, failed: 1 });
  });

  it("treats a 404 race on delete as already-deleted", async () => {
    const svc = new ObjectStorageService();
    vi.spyOn(svc, "getObjectEntityFile").mockImplementation(
      async () =>
        ({
          delete: async () => {
            throw Object.assign(new Error("no such object"), { code: 404 });
          },
        }) as never,
    );

    const res = await svc.deleteServingUrls([
      "https://host.example.com/api/v1/uploads/objects/uploads/y",
    ]);
    expect(res).toEqual({ deleted: 1, skipped: 0, failed: 0 });
  });
});
