import { db } from "@workspace/db";
import {
  userSocialLinks,
  notificationPreferences,
  savedSearches,
} from "@workspace/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getDbUser } from "./UserService";
import { getSellerStats } from "./CompanyService";
import type { CompanyProfile } from "../validators/schemas";

/* ── Identity sub-resources (Task #38) ─────────────────────
 * Owner-scoped CRUD for a seller's profile: public social links, per-category
 * notification preferences, and saved searches. Every method resolves the
 * caller's Clerk id to their DB user row and scopes all reads/writes to it —
 * a caller can never touch another user's rows. All values are validated and
 * normalized server-side; metrics are REAL (never fabricated).
 */

type SocialPlatform = "instagram" | "linkedin" | "website" | "whatsapp";

export interface SocialLinkDTO {
  platform: SocialPlatform;
  value: string;
}

export interface NotificationPreferenceDTO {
  type:
    | "message"
    | "lead"
    | "system"
    | "rfq"
    | "new_match"
    | "price_drop"
    | "comment"
    | "review"
    | "investment"
    | "global_supply"
    | "booking"
    | "payment_success"
    | "payment_failed"
    | "subscription_expiring";
  in_app: boolean;
  email: boolean;
}

export interface SavedSearchDTO {
  id: string;
  name: string;
  query: string | null;
  category: "car" | "real_estate" | "industrial" | null;
  filters: Record<string, unknown> | null;
  price_min: string | null;
  price_max: string | null;
  alerts_enabled: boolean;
  created_at: string;
}

// Canonical notification categories — the full set the settings UI renders.
// Absence of a stored row means the category is enabled (defaults are implicit).
const NOTIFICATION_TYPES = [
  "message",
  "lead",
  "system",
  "rfq",
  "new_match",
  "price_drop",
  "comment",
  "review",
  // Additive (Task #40): B2B investment interest + global-supply response.
  "investment",
  "global_supply",
] as const;

const badRequest = (message: string) =>
  Object.assign(new Error(message), { code: "INVALID_DATA" as const });
const notFound = () =>
  Object.assign(new Error("User not found"), { code: "NOT_FOUND" as const });

/**
 * Normalize a social value to a stable, display-ready string per platform.
 * - whatsapp → digits (optionally a leading +)
 * - instagram → a full profile URL (accepts @handle, bare handle, or URL)
 * - website/linkedin → an http(s) URL (scheme prepended if missing)
 * Throws INVALID_DATA on values that can't be made valid.
 */
function normalizeSocialValue(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) throw badRequest("Social link value cannot be empty");

  switch (platform) {
    case "whatsapp": {
      const plus = value.trim().startsWith("+");
      const digits = value.replace(/\D/g, "");
      if (digits.length < 6 || digits.length > 15) {
        throw badRequest("Invalid WhatsApp number");
      }
      return plus ? `+${digits}` : digits;
    }
    case "instagram": {
      if (/^https?:\/\//i.test(value)) return value;
      const handle = value.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "");
      if (!handle) throw badRequest("Invalid Instagram handle");
      return `https://instagram.com/${handle}`;
    }
    case "linkedin":
    case "website":
    default: {
      const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch {
        throw badRequest("Invalid URL");
      }
      return url;
    }
  }
}

/* ── Social links ──────────────────────────────────────── */

export async function getMySocialLinks(clerkId: string): Promise<SocialLinkDTO[]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const rows = await db
    .select({ platform: userSocialLinks.platform, value: userSocialLinks.value })
    .from(userSocialLinks)
    .where(eq(userSocialLinks.userId, user.id));

  return rows.map((r) => ({ platform: r.platform as SocialPlatform, value: r.value }));
}

/**
 * Replace the caller's full set of social links. One row per platform — a
 * duplicate platform keeps the last value. Done in a transaction so the public
 * profile never shows a half-applied set.
 */
export async function setMySocialLinks(
  clerkId: string,
  links: SocialLinkDTO[],
): Promise<SocialLinkDTO[]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const byPlatform = new Map<SocialPlatform, string>();
  for (const link of links) {
    byPlatform.set(link.platform, normalizeSocialValue(link.platform, link.value));
  }

  await db.transaction(async (tx) => {
    await tx.delete(userSocialLinks).where(eq(userSocialLinks.userId, user.id));
    if (byPlatform.size > 0) {
      await tx.insert(userSocialLinks).values(
        [...byPlatform].map(([platform, value]) => ({
          userId: user.id,
          platform,
          value,
        })),
      );
    }
  });

  return getMySocialLinks(clerkId);
}

/* ── Notification preferences ──────────────────────────── */

/**
 * Return the full canonical set of categories merged with stored rows. A
 * missing row means the category is enabled (in_app + email both true).
 */
export async function getMyNotificationPreferences(
  clerkId: string,
): Promise<NotificationPreferenceDTO[]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  const stored = new Map(rows.map((r) => [r.type, r] as const));
  return NOTIFICATION_TYPES.map((type) => {
    const row = stored.get(type);
    return {
      type,
      in_app: row ? row.inApp : true,
      email: row ? row.email : true,
    };
  });
}

export async function setMyNotificationPreferences(
  clerkId: string,
  preferences: NotificationPreferenceDTO[],
): Promise<NotificationPreferenceDTO[]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  for (const pref of preferences) {
    await db
      .insert(notificationPreferences)
      .values({
        userId: user.id,
        type: pref.type,
        inApp: pref.in_app,
        email: pref.email,
      })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId, notificationPreferences.type],
        set: { inApp: pref.in_app, email: pref.email, updatedAt: new Date() },
      });
  }

  return getMyNotificationPreferences(clerkId);
}

/* ── Saved searches ────────────────────────────────────── */

function toSavedSearchDTO(row: typeof savedSearches.$inferSelect): SavedSearchDTO {
  return {
    id: row.id,
    name: row.name,
    query: row.query ?? null,
    category: (row.category as SavedSearchDTO["category"]) ?? null,
    filters: (row.filters as Record<string, unknown> | null) ?? null,
    price_min: row.priceMin ?? null,
    price_max: row.priceMax ?? null,
    alerts_enabled: row.alertsEnabled,
    created_at: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function listMySavedSearches(clerkId: string): Promise<SavedSearchDTO[]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, user.id))
    .orderBy(desc(savedSearches.createdAt));

  return rows.map(toSavedSearchDTO);
}

export async function createSavedSearch(
  clerkId: string,
  body: {
    name: string;
    query?: string | null;
    category?: "car" | "real_estate" | "industrial" | null;
    filters?: Record<string, unknown> | null;
    price_min?: string | null;
    price_max?: string | null;
    alerts_enabled?: boolean;
  },
): Promise<SavedSearchDTO> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const [row] = await db
    .insert(savedSearches)
    .values({
      userId: user.id,
      name: body.name,
      query: body.query ?? null,
      category: body.category ?? null,
      filters: body.filters ?? null,
      priceMin: body.price_min ?? null,
      priceMax: body.price_max ?? null,
      alertsEnabled: body.alerts_enabled ?? true,
    })
    .returning();

  return toSavedSearchDTO(row);
}

export async function updateSavedSearch(
  clerkId: string,
  id: string,
  body: {
    name?: string;
    price_min?: string | null;
    price_max?: string | null;
    alerts_enabled?: boolean;
  },
): Promise<SavedSearchDTO> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const patch: Partial<typeof savedSearches.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.price_min !== undefined) patch.priceMin = body.price_min;
  if (body.price_max !== undefined) patch.priceMax = body.price_max;
  if (body.alerts_enabled !== undefined) patch.alertsEnabled = body.alerts_enabled;

  const [row] = await db
    .update(savedSearches)
    .set(patch)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
    .returning();

  if (!row) throw Object.assign(new Error("Saved search not found"), { code: "NOT_FOUND" as const });
  return toSavedSearchDTO(row);
}

export async function deleteSavedSearch(
  clerkId: string,
  id: string,
): Promise<{ deleted: boolean }> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();

  const rows = await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
    .returning({ id: savedSearches.id });

  return { deleted: rows.length > 0 };
}

/* ── Profile metrics (REAL) ────────────────────────────── */

/**
 * Real seller metrics for the caller's own profile. Reuses the same computation
 * as the public company profile (active/total listings under the public
 * visibility guard, response rate from real lead data, active-since from the
 * account creation date). Never fabricated.
 */
export async function getMyMetrics(clerkId: string): Promise<CompanyProfile["stats"]> {
  const user = await getDbUser(clerkId);
  if (!user) throw notFound();
  return getSellerStats(user.id, user.createdAt ?? new Date(), !!user.isVerified);
}
