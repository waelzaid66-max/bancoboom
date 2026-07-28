import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { ensureSchemaPatches } from "@workspace/db";
import { db } from "../__tests__/helpers";

describe("ensureSchemaPatches (P0 C-01)", () => {
  it("ensures upload_claims table and indexes exist", async () => {
    await ensureSchemaPatches();

    const columns = await db.execute<{ column_name: string }>(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'upload_claims'
      ORDER BY column_name
    `);
    const names = columns.rows.map((r) => r.column_name);
    expect(names).toEqual(
      expect.arrayContaining(["clerk_id", "created_at", "expires_at", "object_path"]),
    );

    const indexes = await db.execute<{ indexname: string }>(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'upload_claims'
    `);
    const indexNames = indexes.rows.map((r) => r.indexname);
    expect(indexNames.some((n) => n.includes("clerk_id"))).toBe(true);
    expect(indexNames.some((n) => n.includes("expires_at"))).toBe(true);
  });
});
