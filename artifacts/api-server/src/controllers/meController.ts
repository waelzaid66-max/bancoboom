import type { Request, Response } from "express";
import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  getOrCreateUser,
  syncRoleToClerk,
  updateUserProfile,
} from "../services/UserService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  UserStateSchema,
  UpdateMeSchema,
} from "../validators/schemas";
import { parseAdminEmails, shouldPromoteToFirstAdmin } from "../lib/adminBootstrap";

/**
 * Comma-separated allowlist of emails auto-promoted to admin on sign-in. Lets a
 * fresh deployment bootstrap its FIRST admin without manual DB surgery. The
 * allowlist freezes once any admin exists (see lib/adminBootstrap). Matching is
 * case-insensitive. Empty/unset → no auto-promotion.
 */
const ADMIN_EMAILS = parseAdminEmails(process.env.ADMIN_EMAILS);

/**
 * GET /api/v1/me — authoritative current-user state.
 *
 * The DATABASE is the single source of truth for role and account state.
 * On every call we (1) ensure a DB user row exists for this Clerk id,
 * (2) best-effort enrich name/email from Clerk on first creation, and
 * (3) best-effort mirror the DB role into Clerk publicMetadata so other
 * surfaces stay consistent. The Clerk sync is non-blocking and never
 * affects the response.
 */
export async function getMeHandler(req: Request, res: Response) {
  try {
    const clerkId = req.userId!;

    // Best-effort: pull profile + current metadata from Clerk.
    let name: string | undefined;
    let email: string | undefined;
    let clerkRole: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || undefined;
      email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        undefined;
      clerkRole = (clerkUser.publicMetadata?.role as string | undefined) ?? undefined;
    } catch {
      // Clerk lookup failed (network / rate limit) — fall back to DB only.
    }

    let user = await getOrCreateUser(clerkId, { name, email });

    // Bootstrap: auto-promote an allowlisted email to admin ONLY to establish
    // the first admin; the allowlist freezes once any admin exists (see
    // lib/adminBootstrap). The cheap pre-checks gate the existence query so the
    // common /me call stays a single user lookup.
    const userEmail = (user.email ?? email ?? "").toLowerCase();
    if (!user.isAdmin && userEmail && ADMIN_EMAILS.includes(userEmail)) {
      const [existingAdmin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.isAdmin, true))
        .limit(1);
      if (
        shouldPromoteToFirstAdmin({
          isAlreadyAdmin: user.isAdmin,
          email: userEmail,
          adminEmails: ADMIN_EMAILS,
          anAdminExists: !!existingAdmin,
        })
      ) {
        // First admin = Owner: seed the staff-role hierarchy with full control
        // so the new deployment has someone who can assign every other role.
        const [promoted] = await db
          .update(users)
          .set({ isAdmin: true, staffRole: "owner" })
          .where(eq(users.id, user.id))
          .returning();
        if (promoted) user = promoted;
      }
    }

    // Mirror DB role -> Clerk publicMetadata only when it drifts. Non-blocking.
    if (clerkRole !== user.role) {
      void syncRoleToClerk(clerkId, user.role);
    }

    const payload = {
      id: user.id,
      clerk_id: user.clerkId,
      account_number: user.accountNumber ?? null,
      role: user.role,
      staff_role: user.staffRole ?? "user",
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      is_verified: !!user.isVerified,
      is_admin: !!user.isAdmin,
      wallet_balance: user.walletBalance ?? "0",
      created_at: (user.createdAt ?? new Date()).toISOString(),
    };

    const validated = validateResponse(UserStateSchema, payload);
    return res.json(successResponse(validated));
  } catch (err) {
    console.error("[Me]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load user state"));
  }
}

/**
 * PATCH /api/v1/me — update phone and/or upgrade to a Banco Business.
 * The DB stays the source of truth; UserService maps a business signup to the
 * `dealer` role server-side (never trusts a client-supplied role).
 */
export async function updateMeHandler(req: Request, res: Response) {
  try {
    const clerkId = req.userId!;
    const body = UpdateMeSchema.parse(req.body);
    const user = await updateUserProfile(clerkId, body, { ip: req.ip });

    const payload = {
      id: user.id,
      clerk_id: user.clerkId,
      account_number: user.accountNumber ?? null,
      role: user.role,
      staff_role: user.staffRole ?? "user",
      name: user.name,
      email: user.email ?? null,
      phone: user.phone ?? null,
      is_verified: !!user.isVerified,
      is_admin: !!user.isAdmin,
      wallet_balance: user.walletBalance ?? "0",
      created_at: (user.createdAt ?? new Date()).toISOString(),
    };

    const validated = validateResponse(UserStateSchema, payload);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    if ((err as { code?: string })?.code === "RATE_LIMITED") {
      return res
        .status(429)
        .json(errorResponse("INVALID_DATA", (err as Error).message ?? "Too many requests"));
    }
    if ((err as { code?: string })?.code === "DUPLICATE_ACCOUNT") {
      return res
        .status(409)
        .json(errorResponse("INVALID_DATA", (err as Error).message ?? "Duplicate account"));
    }
    if ((err as { code?: string })?.code === "DEMOTE_BLOCKED") {
      return res
        .status(403)
        .json(errorResponse("FORBIDDEN", (err as Error).message ?? "Demotion blocked"));
    }
    if ((err as { code?: string })?.code === "NOT_FOUND") {
      return res.status(404).json(errorResponse("NOT_FOUND", "User not found"));
    }
    console.error("[Me update]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to update user"));
  }
}
