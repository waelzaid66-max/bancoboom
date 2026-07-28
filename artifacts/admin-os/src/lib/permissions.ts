/**
 * Client-side MIRROR of the server staff-role permission matrix
 * (`artifacts/api-server/src/lib/permissions.ts`).
 *
 * The SERVER is the single source of truth and enforces every permission. This
 * copy only drives what the admin-os UI shows (nav items, action buttons). Keep
 * the two in sync — if they drift, the worst case is a button that the server
 * rejects with 403, never an actual privilege escalation.
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
  "view_admin",
  "manage_roles",
  "ban_users",
  "verify_users",
  "moderate_listings",
  "manage_reports",
  "manage_support",
  "manage_payments",
  "view_finance",
  "manage_financing",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

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

/** True when `role` is a recognized staff role that holds `permission`. */
export function hasPermission(
  role: StaffRole | string | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false;
  const perms = MATRIX[role as StaffRole];
  return perms ? perms.includes(permission) : false;
}

/** True when `role` grants any Control Center access (not an ordinary user). */
export function isStaff(role: StaffRole | string | null | undefined): boolean {
  return !!role && role !== "user" && (STAFF_ROLES as readonly string[]).includes(role);
}

/** Human-readable label for a staff role. */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
  support: "Support",
  user: "User",
};
