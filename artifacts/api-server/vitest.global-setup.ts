import { ensureSchemaPatches } from "@workspace/db";

/**
 * Reconcile critical schema drift before any DB-integration file runs. CI runs
 * drizzle push-force, but local/shared DBs may lag (especially on Windows).
 */
export default async function globalSetup(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await ensureSchemaPatches();
}
