import { describe, it, expect } from "vitest";
import {
  hasPermission,
  isStaff,
  isStaffRole,
  permissionsFor,
  STAFF_ROLES,
  type StaffRole,
  type Permission,
} from "./permissions";
import { decideRoleChange, decideBan } from "./roleGuards";

describe("permission matrix", () => {
  it("owner has every permission, including manage_roles", () => {
    const all: Permission[] = [
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
    ];
    for (const p of all) expect(hasPermission("owner", p)).toBe(true);
  });

  it("admin has everything except manage_roles", () => {
    expect(hasPermission("admin", "manage_roles")).toBe(false);
    expect(hasPermission("admin", "ban_users")).toBe(true);
    expect(hasPermission("admin", "verify_users")).toBe(true);
    expect(hasPermission("admin", "manage_payments")).toBe(true);
    expect(hasPermission("admin", "view_finance")).toBe(true);
  });

  it("moderator can ban / moderate / handle reports but not roles, payments, finance, support, verify", () => {
    expect(hasPermission("moderator", "ban_users")).toBe(true);
    expect(hasPermission("moderator", "moderate_listings")).toBe(true);
    expect(hasPermission("moderator", "manage_reports")).toBe(true);
    expect(hasPermission("moderator", "view_admin")).toBe(true);
    expect(hasPermission("moderator", "manage_roles")).toBe(false);
    expect(hasPermission("moderator", "manage_payments")).toBe(false);
    expect(hasPermission("moderator", "view_finance")).toBe(false);
    expect(hasPermission("moderator", "manage_support")).toBe(false);
    expect(hasPermission("moderator", "verify_users")).toBe(false);
  });

  it("support can view + handle support tickets only", () => {
    expect(hasPermission("support", "view_admin")).toBe(true);
    expect(hasPermission("support", "manage_support")).toBe(true);
    expect(hasPermission("support", "ban_users")).toBe(false);
    expect(hasPermission("support", "moderate_listings")).toBe(false);
    expect(hasPermission("support", "manage_reports")).toBe(false);
    expect(hasPermission("support", "view_finance")).toBe(false);
    expect(hasPermission("support", "manage_roles")).toBe(false);
  });

  it("user (ordinary account) has no staff permissions", () => {
    expect(permissionsFor("user")).toHaveLength(0);
    expect(hasPermission("user", "view_admin")).toBe(false);
    expect(isStaff("user")).toBe(false);
  });

  it("unknown / nullish roles are denied", () => {
    expect(hasPermission(null, "view_admin")).toBe(false);
    expect(hasPermission(undefined, "view_admin")).toBe(false);
    expect(hasPermission("superuser", "view_admin" as Permission)).toBe(false);
    expect(isStaff("nope")).toBe(false);
  });

  it("isStaff / isStaffRole classify roles correctly", () => {
    for (const r of STAFF_ROLES) expect(isStaffRole(r)).toBe(true);
    expect(isStaffRole("ceo")).toBe(false);
    expect(isStaff("owner")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("moderator")).toBe(true);
    expect(isStaff("support")).toBe(true);
  });
});

describe("decideRoleChange guards", () => {
  const base = {
    actorId: "owner-1",
    targetId: "user-2",
    currentRole: "user" as StaffRole,
    nextRole: "admin" as StaffRole,
    ownerCount: 1,
  };

  it("allows a normal promotion", () => {
    expect(decideRoleChange(base)).toEqual({ allowed: true });
  });

  it("blocks changing your own role", () => {
    const d = decideRoleChange({ ...base, actorId: "x", targetId: "x", currentRole: "owner", nextRole: "admin", ownerCount: 2 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("self_change");
  });

  it("treats setting the same role as a no-op", () => {
    const d = decideRoleChange({ ...base, currentRole: "admin", nextRole: "admin" });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("noop");
  });

  it("blocks demoting the last owner", () => {
    const d = decideRoleChange({
      actorId: "owner-1",
      targetId: "owner-2",
      currentRole: "owner",
      nextRole: "admin",
      ownerCount: 1,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("last_owner");
  });

  it("allows demoting an owner when another owner remains", () => {
    const d = decideRoleChange({
      actorId: "owner-1",
      targetId: "owner-2",
      currentRole: "owner",
      nextRole: "admin",
      ownerCount: 2,
    });
    expect(d.allowed).toBe(true);
  });

  it("allows promoting another user to owner regardless of count", () => {
    const d = decideRoleChange({
      actorId: "owner-1",
      targetId: "user-9",
      currentRole: "user",
      nextRole: "owner",
      ownerCount: 1,
    });
    expect(d.allowed).toBe(true);
  });
});

describe("decideBan guards", () => {
  const base = {
    actorId: "mod-1",
    actorRole: "moderator" as StaffRole,
    targetId: "user-2",
    targetRole: "user" as StaffRole,
    banned: true,
    ownerCount: 2,
  };

  it("allows a moderator to ban an ordinary user", () => {
    expect(decideBan(base)).toEqual({ allowed: true });
  });

  it("always allows un-banning (even self / owner)", () => {
    expect(decideBan({ ...base, banned: false, actorId: "x", targetId: "x" }).allowed).toBe(true);
    expect(
      decideBan({ ...base, banned: false, targetRole: "owner", actorRole: "moderator", ownerCount: 1 }).allowed,
    ).toBe(true);
  });

  it("blocks banning your own account", () => {
    const d = decideBan({ ...base, actorId: "same", targetId: "same" });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("self_ban");
  });

  it("blocks a non-owner from banning an Owner", () => {
    const d = decideBan({ ...base, actorRole: "admin", targetRole: "owner" });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("ban_owner_forbidden");
  });

  it("allows an Owner to ban another Owner when others remain", () => {
    const d = decideBan({
      actorId: "owner-1",
      actorRole: "owner",
      targetId: "owner-2",
      targetRole: "owner",
      banned: true,
      ownerCount: 2,
    });
    expect(d.allowed).toBe(true);
  });

  it("blocks banning the last Owner (defensive)", () => {
    const d = decideBan({
      actorId: "owner-1",
      actorRole: "owner",
      targetId: "owner-2",
      targetRole: "owner",
      banned: true,
      ownerCount: 1,
    });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("last_owner");
  });
});
