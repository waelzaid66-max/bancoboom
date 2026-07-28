/**
 * Staff roles & the permission matrix for the Admin Control Center.
 *
 * This is a PURE module (no DB, no Express) so the policy is trivially unit
 * testable and can be reused by both the API guards and any server-side check.
 *
 * The staff role is a SEPARATE axis from the business `role` (individual /
 * dealer / company / enterprise). A staff member may also be a dealer; the two
 * never mix. "user" means an ordinary marketplace account with no staff access.
 *
 * IMPORTANT: this matrix is mirrored client-side in admin-os
 * (`artifacts/admin-os/src/lib/permissions.ts`). The server is the single
 * source of truth and enforces it; the client copy only drives what to show.
 * Keep the two in sync.
 */

export const STAFF_ROLES = [
  "owner",
  "admin",
  "moderator",
  "support",
  "user",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  // Access the Admin Control Center at all + see read-only operational pages
  // (overview, users, listings, leads, monitoring, alerts).
  "view_admin",
  // Change another user's staff role (Owner only).
  "manage_roles",
  // Shadow-ban / unban a user.
  "ban_users",
  // Verify / unverify a seller.
  "verify_users",
  // Review the moderation queue and approve/reject/flag listings.
  "moderate_listings",
  // View and resolve abuse reports + fraud signals.
  "manage_reports",
  // View and respond to / resolve support tickets.
  "manage_support",
  // View and edit the payment configuration.
  "manage_payments",
  // View revenue, analytics and ad-campaign (financial) surfaces.
  "view_finance",
  // View and manage the bank-financing CRM: finance-request pipeline status,
  // intermediary assignment, and the admin-managed intermediary directory.
  "manage_financing",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * The authoritative role → permissions matrix.
 *  - owner:     everything, including assigning roles.
 *  - admin:     everything EXCEPT assigning roles (an admin can't mint admins).
 *  - moderator: content safety — ban, moderate listings, handle reports.
 *  - support:   customer support — read access + handle support tickets.
 *  - user:      no staff access at all.
 */
const MATRIX: Record<StaffRole, readonly Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [
    "view_admin",
    "ban_users",
    "verify_users",
    "moderate_listings",
    "manage_reports",
    "manage_support",
    "manage_payments",
    "view_finance",
    "manage_financing",
  ],
  moderator: ["view_admin", "ban_users", "moderate_listings", "manage_reports"],
  support: ["view_admin", "manage_support"],
  user: [],
};

/** True when `role` is a recognized staff role with `permission`. */
export function hasPermission(
  role: StaffRole | string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const perms = MATRIX[role as StaffRole];
  return perms ? perms.includes(permission) : false;
}

/** True when `role` grants any Admin Control Center access (not an ordinary user). */
export function isStaff(role: StaffRole | string | null | undefined): boolean {
  return !!role && role !== "user" && (STAFF_ROLES as readonly string[]).includes(role);
}

/** Type guard: is `role` one of the known staff-role enum values. */
export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

/** The full permission list granted to a role (empty for unknown/user). */
export function permissionsFor(role: StaffRole | string | null | undefined): readonly Permission[] {
  if (!role) return [];
  return MATRIX[role as StaffRole] ?? [];
}
