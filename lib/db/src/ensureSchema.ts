import { sql } from "drizzle-orm";
import { db } from "./index";

// Notification enum values added after the initial pg enum was created. Applied
// idempotently on boot so environments that lag behind drizzle-kit push still
// accept them (billing wave + car-import lifecycle).
const ADDITIVE_NOTIFICATION_ENUM_VALUES = [
  "payment_success",
  "payment_failed",
  "subscription_expiring",
  "car_import",
] as const;

/**
 * Idempotent schema patches for environments that lag behind drizzle-kit push
 * (local Windows push quirks, shared dev DBs, or partial migrations). Safe to
 * call on every api-server boot and before the integration test suite.
 */
export async function ensureSchemaPatches(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS upload_claims (
      object_path text PRIMARY KEY,
      clerk_id text NOT NULL,
      expires_at timestamp NOT NULL,
      created_at timestamp DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS upload_claims_clerk_id_idx ON upload_claims (clerk_id)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS upload_claims_expires_at_idx ON upload_claims (expires_at)`,
  );

  for (const value of ADDITIVE_NOTIFICATION_ENUM_VALUES) {
    await db.execute(
      sql.raw(`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '${value}'`),
    );
  }
}
