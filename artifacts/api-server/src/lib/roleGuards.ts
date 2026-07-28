/**
 * Pure decision logic for staff-role changes. Kept free of DB/Express so the
 * invariants (no self-role-change, always keep at least one Owner) are unit
 * testable in isolation. The AdminService supplies the live owner count.
 */

import type { StaffRole } from "./permissions";

export type RoleChangeDenial =
  | "self_change"
  | "last_owner"
  | "noop";

export interface RoleChangeDecision {
  allowed: boolean;
  /** Present when allowed === false (or for a harmless no-op). */
  reason?: RoleChangeDenial;
}

/**
 * Decide whether `actorId` may set `targetId`'s staff role to `nextRole`.
 *
 * Invariants enforced:
 *  - A staff member can never change their OWN role (prevents an Owner from
 *    self-demoting and locking everyone out, and stops privilege self-edits).
 *  - The system must always retain at least one Owner: demoting the *last*
 *    Owner (ownerCount <= 1 and target is that Owner) is denied.
 *  - Setting the same role is a harmless no-op (reported so the caller can skip
 *    the write + audit without erroring).
 *
 * The *authorization* check (only Owners may call this at all) is handled by
 * the `manage_roles` permission gate upstream; this function assumes the actor
 * is already authorized and only encodes the integrity guards.
 */
export function decideRoleChange(params: {
  actorId: string;
  targetId: string;
  currentRole: StaffRole;
  nextRole: StaffRole;
  ownerCount: number;
}): RoleChangeDecision {
  const { actorId, targetId, currentRole, nextRole, ownerCount } = params;

  if (actorId === targetId) {
    return { allowed: false, reason: "self_change" };
  }

  if (currentRole === nextRole) {
    return { allowed: false, reason: "noop" };
  }

  // Demoting an Owner away from "owner" must leave at least one Owner behind.
  if (currentRole === "owner" && nextRole !== "owner" && ownerCount <= 1) {
    return { allowed: false, reason: "last_owner" };
  }

  return { allowed: true };
}

export type BanDenial = "self_ban" | "ban_owner_forbidden" | "last_owner";

export interface BanDecision {
  allowed: boolean;
  reason?: BanDenial;
}

/**
 * Decide whether `actorId` (a staff member holding `ban_users`) may shadow-ban
 * `targetId`. The `ban_users` *authorization* is enforced upstream; this only
 * encodes the integrity guards that protect privileged accounts:
 *
 *  - Un-banning is always allowed (it only restores access, never removes it).
 *  - Nobody may ban their own account.
 *  - An Owner may only be banned by another Owner (a moderator/admin holding
 *    `ban_users` cannot take punitive action against an Owner), and never if
 *    they are the last remaining Owner.
 *
 * Ban does NOT change `staffRole`, so it cannot by itself break the ">=1 Owner"
 * invariant; the last-owner branch is a defensive belt-and-suspenders guard.
 */
export function decideBan(params: {
  actorId: string;
  actorRole: StaffRole;
  targetId: string;
  targetRole: StaffRole;
  banned: boolean;
  ownerCount: number;
}): BanDecision {
  const { actorId, actorRole, targetId, targetRole, banned, ownerCount } = params;

  // Lifting a ban is always safe.
  if (!banned) return { allowed: true };

  if (actorId === targetId) {
    return { allowed: false, reason: "self_ban" };
  }

  if (targetRole === "owner") {
    if (actorRole !== "owner") {
      return { allowed: false, reason: "ban_owner_forbidden" };
    }
    if (ownerCount <= 1) {
      return { allowed: false, reason: "last_owner" };
    }
  }

  return { allowed: true };
}
