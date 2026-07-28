import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse } from "../validators/schemas";
import { hasPermission, type Permission, type StaffRole } from "../lib/permissions";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      dbUserId?: string;
      userRole?: string;
      // Internal staff role of the resolved DB user (Admin Control Center only).
      staffRole?: StaffRole;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    return;
  }

  req.userId = clerkId;
  next();
}

export function requireDealerRole(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    return;
  }

  req.userId = clerkId;

  db.select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        res.status(401).json(errorResponse("UNAUTHORIZED", "User not found"));
        return;
      }
      if (!["dealer", "company", "enterprise"].includes(user.role)) {
        res.status(403).json(errorResponse("UNAUTHORIZED", "Dealer access required"));
        return;
      }
      req.dbUserId = user.id;
      req.userRole = user.role;
      next();
    })
    .catch(() => {
      res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to verify permissions"));
    });
}

export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    return;
  }

  req.userId = clerkId;

  db.select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1)
    .then(([user]) => {
      if (!user) {
        res.status(401).json(errorResponse("UNAUTHORIZED", "User not found"));
        return;
      }
      if (!user.isAdmin) {
        res.status(403).json(errorResponse("UNAUTHORIZED", "Admin access required"));
        return;
      }
      req.dbUserId = user.id;
      req.userRole = user.role;
      req.staffRole = (user.staffRole ?? "user") as StaffRole;
      next();
    })
    .catch(() => {
      res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to verify permissions"));
    });
}

/**
 * Per-route guard for the Admin Control Center. Must run AFTER `requireAdminRole`
 * (which resolves `req.staffRole`). Denies the request with 403 when the staff
 * member's role does not grant `permission`. The server is the single source of
 * truth for the permission matrix — the admin web app only mirrors it for display.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!hasPermission(req.staffRole, permission)) {
      res
        .status(403)
        .json(errorResponse("FORBIDDEN", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (auth?.userId) {
    req.userId = auth.userId;
  }
  next();
}

export async function resolveDbUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) return next();

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, req.userId))
      .limit(1);

    if (user) {
      req.dbUserId = user.id;
      req.userRole = user.role;
    }
    next();
  } catch {
    next();
  }
}

/**
 * Strict variant of resolveDbUser: a DB user row MUST exist or the request is
 * rejected. Use this (after requireAuth) on money/wallet routes where silently
 * continuing without a resolved dbUserId would be unsafe.
 */
export async function requireDbUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clerkId = req.userId ?? getAuth(req)?.userId ?? undefined;
  if (!clerkId) {
    res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication required"));
    return;
  }
  req.userId = clerkId;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    if (!user) {
      res.status(401).json(errorResponse("UNAUTHORIZED", "User not found"));
      return;
    }
    req.dbUserId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to resolve user"));
  }
}
