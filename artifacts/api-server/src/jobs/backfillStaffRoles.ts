import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

/**
 * One-time, idempotent migration of pre-existing admins onto the staff-role
 * system. Safe to run on every boot:
 *
 *  1. Any account with isAdmin=true but staff_role still 'user' (i.e. an admin
 *     that predates staff roles) is promoted to 'admin' — a conservative
 *     default; an Owner can grade them further afterwards.
 *  2. The system must always have at least one Owner. If none exists after
 *     step 1, the earliest-created admin is promoted to 'owner' so role
 *     management is never locked out.
 *
 * Returns the number of rows changed (0 on a steady-state re-run).
 */
export async function backfillStaffRoles(): Promise<number> {
  let changed = 0;

  const promoted = await db
    .update(users)
    .set({ staffRole: "admin" })
    .where(and(eq(users.isAdmin, true), eq(users.staffRole, "user")))
    .returning({ id: users.id });
  changed += promoted.length;

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.staffRole, "owner"))
    .limit(1);

  if (!owner) {
    const [firstAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isAdmin, true))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (firstAdmin) {
      await db
        .update(users)
        .set({ staffRole: "owner" })
        .where(eq(users.id, firstAdmin.id));
      changed += 1;
    }
  }

  if (changed > 0) {
    logger.info({ changed }, "Staff-role backfill applied");
  }
  return changed;
}
