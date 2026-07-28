import { listings, users } from "@workspace/db/schema";
import { sql, type SQL } from "drizzle-orm";

/**
 * Conditions that exclude abuse-controlled inventory from every public surface
 * (feed, search, trending, similar, public browse, ads). Two rules:
 *   - the listing is not flagged (spam/abuse), and
 *   - the seller is not shadow-banned.
 *
 * `IS NOT TRUE` is used (rather than `= false`) so the conditions are correct
 * even when the joined seller row is absent (LEFT JOIN → NULL).
 *
 * Call sites must already reference the `listings` and `users` tables (the
 * latter via a join) for these conditions to resolve.
 */
export function publicVisibilityConditions(): SQL[] {
  return [
    sql`${listings.isFlagged} IS NOT TRUE`,
    sql`${users.isShadowBanned} IS NOT TRUE`,
    sql`${users.deletedAt} IS NULL`,
  ];
}
