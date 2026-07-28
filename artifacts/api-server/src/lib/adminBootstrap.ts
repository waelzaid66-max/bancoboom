/**
 * Admin bootstrap policy.
 *
 * `ADMIN_EMAILS` is the owner-controlled allowlist of accounts that are
 * auto-promoted to admin (role: owner) on first sign-in. ALL emails on the
 * list are eligible — not just the very first — so the owner can list all
 * their admin accounts up-front without manual DB intervention.
 *
 * Security model: promotion is gated on BOTH (a) the email being explicitly
 * listed and (b) the account not already being an admin. A stale or
 * compromised entry can only promote listed accounts, never create new ones
 * silently. After launch, additional admins (beyond the ADMIN_EMAILS list)
 * must be granted via the admin tooling (PATCH /admin/users/:id/role by an
 * existing Owner).
 */

/** Parse the comma-separated `ADMIN_EMAILS` env value into a normalized list. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Decide whether the current user should be auto-promoted to admin.
 * Returns true when the user is not already an admin AND their email appears
 * in the owner-controlled ADMIN_EMAILS allowlist.
 *
 * NOTE: `anAdminExists` is kept in the signature for backwards-compatibility
 * with call-sites but is intentionally ignored — all listed emails are
 * eligible regardless of whether other admins exist.
 */
export function shouldPromoteToFirstAdmin(args: {
  isAlreadyAdmin: boolean;
  email: string | null | undefined;
  adminEmails: string[];
  anAdminExists: boolean;
}): boolean {
  const { isAlreadyAdmin, email, adminEmails } = args;
  if (isAlreadyAdmin) return false;
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return adminEmails.includes(normalized);
}
