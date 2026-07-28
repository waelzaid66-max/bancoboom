import { afterEach, describe, expect, it } from "vitest";
import {
  __resetObjectStorageServiceForTests,
  getObjectStorageService,
} from "./objectStorageProvider";

describe("getObjectStorageService provider switch", () => {
  afterEach(() => {
    delete process.env.OBJECT_STORAGE_PROVIDER;
    __resetObjectStorageServiceForTests();
  });

  it("defaults to replit when unset", () => {
    delete process.env.OBJECT_STORAGE_PROVIDER;
    __resetObjectStorageServiceForTests();
    const svc = getObjectStorageService();
    expect(svc.constructor.name).toBe("ObjectStorageService");
  });

  it("rejects unsupported gcs provider instead of silently falling back", () => {
    process.env.OBJECT_STORAGE_PROVIDER = "gcs";
    __resetObjectStorageServiceForTests();
    expect(() => getObjectStorageService()).toThrow(/Unsupported OBJECT_STORAGE_PROVIDER/);
  });
});
