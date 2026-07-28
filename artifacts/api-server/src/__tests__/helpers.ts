/**
 * Shared fixtures for DB-integration tests. Importing this module registers a
 * per-file `afterAll` that closes the shared pg pool, so any suite that touches
 * the database tears its connections down cleanly (with vitest's default
 * per-file isolation each test file owns its own pool instance).
 *
 * Pure (no-DB) suites must NOT import this — it would construct the pool and
 * require DATABASE_URL needlessly.
 */
import { afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { users } from "@workspace/db/schema";

export { db, pool, randomUUID };

export type Role =
  | "individual"
  | "dealer"
  | "company"
  | "enterprise"
  | "financial_institution";

/**
 * A unique-per-call token. The durable counters are DB-backed and shared across
 * the whole app, so every test key MUST be unique to start its window at zero
 * and to never collide with real data.
 */
export function uniq(prefix = "t"): string {
  return `${prefix}_${randomUUID()}`;
}

/** Insert a throwaway user and return its id. */
export async function createUser(
  opts: { role?: Role; walletBalance?: string; isShadowBanned?: boolean } = {},
): Promise<string> {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    clerkId: uniq("clerk"),
    name: "Test User",
    role: opts.role ?? "individual",
    walletBalance: opts.walletBalance ?? "0",
    isShadowBanned: opts.isShadowBanned ?? false,
  });
  return id;
}

/** Delete users by id (cascades to their listings/transactions/invoices). */
export async function deleteUsers(...ids: string[]): Promise<void> {
  for (const id of ids) {
    await db.delete(users).where(eq(users.id, id));
  }
}

afterAll(async () => {
  await pool.end();
});
