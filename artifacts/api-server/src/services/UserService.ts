import { db } from "@workspace/db";
import {
  users,
  leadHistory,
  savedListings,
  userBehavior,
  conversations,
  messages,
  notifications,
  pushTokens,
} from "@workspace/db/schema";
import { eq, and, ne, isNull, isNotNull, or, inArray, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { logger } from "../lib/logger";
import { getObjectStorageService } from "../lib/objectStorageProvider";
import { checkProfileMutationRate, flagDuplicateAccount } from "./AbuseService";
import { sendWelcomeEmail } from "./EmailService";
import { mergeBusinessCompanyDetails } from "../lib/mergeBusinessCompanyDetails";

export async function getOrCreateUser(clerkId: string, data?: { name?: string; email?: string }) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (existing) return existing;

  // First-touch upsert: the mobile app can fire several authenticated calls in
  // parallel on first open, so two inserts may race. ON CONFLICT keeps the
  // loser from throwing a unique-violation (users.clerk_id is unique) — it
  // simply re-reads the winner's row. Only the genuine winner sends the
  // welcome email, so the race can't double-send either.
  const [created] = await db
    .insert(users)
    .values({
      clerkId,
      name: data?.name ?? "BANCO User",
      email: data?.email,
      role: "individual",
      isVerified: false,
    })
    .onConflictDoNothing({ target: users.clerkId })
    .returning();

  if (!created) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);
    return row;
  }

  // First touch — professional welcome. Strictly fire-and-forget: an email
  // provider hiccup must never slow down or fail account creation.
  if (created?.email) {
    void sendWelcomeEmail({ to: created.email, name: created.name }).catch((err) =>
      logger.warn({ err }, "welcome email failed (non-blocking)"),
    );
  }

  return created;
}

export async function getDbUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

/**
 * Best-effort mirror of the DB role (source of truth) into Clerk
 * publicMetadata. Failures are swallowed/logged so they never block the
 * request path.
 */
export async function syncRoleToClerk(clerkId: string, role: string): Promise<void> {
  try {
    await clerkClient.users.updateUserMetadata(clerkId, {
      publicMetadata: { role },
    });
  } catch (err) {
    console.error("[Role sync] Failed to mirror role to Clerk", err);
  }
}

export interface UpdateUserProfileInput {
  account_type?: "individual" | "dealer" | "company" | "financial_institution";
  phone?: string | null;
  business?: {
    activity_type:
      | "car_dealer"
      | "real_estate_developer"
      | "factory"
      | "supplier"
      | "financial_institution";
    business_name: string;
    trade_name?: string;
    owner_name?: string;
    city: string;
    documents?: string[];
  };
}

/**
 * Update the current user's profile. Two safe capabilities:
 *  - set/clear phone
 *  - upgrade to a "Banco Business": the SERVER is the only authority that maps
 *    a business signup to a role. Every business activity hard-maps to the
 *    `dealer` role — a client can never request company/enterprise/admin.
 *
 * `users.companyDetails` (DB jsonb) is the source of truth. We best-effort
 * mirror the role + business profile into Clerk publicMetadata so client
 * surfaces that already read publicMetadata stay consistent (non-blocking).
 */
export async function updateUserProfile(
  clerkId: string,
  input: UpdateUserProfileInput,
  meta?: { ip?: string },
) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
  }

  // Anti-abuse: cap profile-mutation bursts per user (feeds suspicion → auto
  // shadow-ban). Server-authoritative; the client can never opt out.
  const rate = await checkProfileMutationRate({ userId: user.id, ip: meta?.ip });
  if (!rate.ok) {
    throw Object.assign(new Error("Too many profile updates. Please slow down and try again later."), {
      code: "RATE_LIMITED",
    });
  }

  // Duplicate-account guard: a phone already linked to another active account is
  // a strong multi-account signal. Block the mutation and escalate suspicion.
  if (input.phone) {
    const [dup] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, input.phone), ne(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);
    if (dup) {
      await flagDuplicateAccount({ userId: user.id, otherUserId: dup.id, ip: meta?.ip });
      throw Object.assign(new Error("This phone number is already linked to another account"), {
        code: "DUPLICATE_ACCOUNT",
      });
    }
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (input.phone !== undefined) patch.phone = input.phone;

  // Account-type selection is SERVER-authoritative. The client can only ever
  // request one of four onboarding types — individual / dealer (Business Pro) /
  // company / financial_institution — and we map each to a concrete role here.
  // A client can never request `admin` or any privileged role; those are
  // unreachable through this path. A financial institution still has to pass
  // verification (KYC / bank approval) before its financing features unlock.
  // Self-demote guard (S4): elevated roles must not silently collapse to
  // `individual` via PATCH /me — that hole let FI/company wipe themselves from
  // the profile "Manage account type" / Skip paths. Upgrades and lateral moves
  // (dealer↔company↔FI) stay allowed; admin tooling remains the path for rare
  // personal demotions.
  if (input.account_type === "individual") {
    const elevatedNow =
      user.role === "financial_institution" ||
      user.role === "company" ||
      user.role === "enterprise";
    if (elevatedNow) {
      throw Object.assign(
        new Error(
          "Company and financial-institution accounts cannot switch to personal from the app",
        ),
        { code: "DEMOTE_BLOCKED" },
      );
    }
  }

  if (input.account_type) {
    patch.role =
      input.account_type === "individual"
        ? "individual"
        : input.account_type === "company"
          ? "company"
          : input.account_type === "financial_institution"
            ? "financial_institution"
            : "dealer";
  }

  // A business signup always hard-maps to a seller/FI role. The onboarding form
  // often sends `business` WITHOUT account_type — never blindly force "dealer"
  // over an elevated role, and map bank activity to financial_institution so
  // the Banks hub CTA cannot leave individuals as dealers with a bank label.
  if (input.business) {
    const wantsFi =
      input.account_type === "financial_institution" ||
      input.business.activity_type === "financial_institution";
    const elevated =
      user.role === "financial_institution" ||
      user.role === "company" ||
      user.role === "enterprise";

    if (wantsFi && user.role !== "company" && user.role !== "enterprise") {
      patch.role = "financial_institution";
    } else if (
      (!input.account_type || input.account_type === "individual") &&
      !elevated
    ) {
      patch.role = "dealer";
    }

    // F-SEC-07: merge — never wipe KYC docs on a business re-save that omits them.
    patch.companyDetails = mergeBusinessCompanyDetails(user.companyDetails, input.business);
  }

  // Empty patch (no-op) — return the current row without an empty UPDATE.
  if (Object.keys(patch).length === 0) return user;

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, user.id))
    .returning();

  // Best-effort mirror of the resolved role (+ business profile) into Clerk
  // publicMetadata so client surfaces that read it stay consistent.
  if (patch.role !== undefined || input.business) {
    try {
      await clerkClient.users.updateUserMetadata(clerkId, {
        publicMetadata: {
          role: updated.role,
          ...(patch.companyDetails ? { business: patch.companyDetails } : {}),
        },
      });
    } catch (err) {
      console.error("[Profile sync] Failed to mirror profile to Clerk", err);
    }
  }

  return updated;
}

/**
 * Permanently delete a user's account for Google Play self-service deletion
 * compliance.
 *
 * Architectural constraint: the local data mutation must be atomic. We
 * soft-delete (timestamp) + anonymize the user record AND wipe their personal
 * data (lead PII, saved listings, behavior history) inside a single
 * transaction, so a failure can never leave a half-deleted account. The
 * auth-provider (Clerk) deletion happens only AFTER the transaction commits —
 * the database is the durable source of truth, and Clerk removal is the final,
 * non-transactional step.
 */
export async function deleteAccount(clerkId: string): Promise<{ deleted: boolean }> {
  const [user] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
  }

  const now = new Date();

  // Chat media blobs to purge from object storage after the DB transaction
  // commits: capture the serving URLs BEFORE the tombstone nulls them.
  const chatMediaRows = await db
    .select({ url: messages.mediaUrl })
    .from(messages)
    .where(and(eq(messages.senderId, user.id), isNotNull(messages.mediaUrl)));
  const chatMediaUrls = chatMediaRows
    .map((r) => r.url)
    .filter((u): u is string => !!u);

  // Atomic local anonymization + personal-data wipe.
  await db.transaction(async (tx) => {
    // Anonymize the user record. We keep the row (soft delete) so seller
    // references on existing listings/leads stay intact and the deletion is
    // recoverable for a short window, but strip every piece of PII.
    await tx
      .update(users)
      .set({
        name: "Deleted User",
        email: null,
        phone: null,
        companyDetails: null,
        isVerified: false,
        deletedAt: now,
      })
      .where(eq(users.id, user.id));

    // Wipe buyer-side lead PII captured against this user.
    await tx
      .update(leadHistory)
      .set({ buyerName: null, buyerPhone: null, updatedAt: now })
      .where(eq(leadHistory.buyerId, user.id));

    // Remove the user's personal collections/behavior history entirely.
    await tx.delete(savedListings).where(eq(savedListings.userId, user.id));
    await tx.delete(userBehavior).where(eq(userBehavior.userId, user.id));

    // Chat privacy (Play/GDPR account deletion): blank the CONTENT of every
    // message this user sent (empty tombstone — thread structure survives so
    // the counterparty's history and replies keep working) and drop
    // conversation previews that may quote the deleted user's words. Previews
    // repopulate on the next message sent in the thread.
    await tx
      .update(messages)
      .set({ body: "", mediaUrl: null, mediaKind: null })
      .where(eq(messages.senderId, user.id));
    await tx
      .update(conversations)
      .set({ lastMessageText: null })
      .where(
        or(eq(conversations.buyerId, user.id), eq(conversations.sellerId, user.id)),
      );

    // Message-notification previews quote the deleted user's words (body) and
    // name (title) in the counterparty's notification inbox — purge them for
    // every conversation this user participated in. (NOTE: messages.reactions
    // keeps opaque user ids; after anonymization they point at a "Deleted
    // User" row — same privacy class as the retained senderId that preserves
    // thread structure — deliberately not rewritten.)
    const convRows = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(eq(conversations.buyerId, user.id), eq(conversations.sellerId, user.id)),
      );
    const convIds = convRows.map((c) => c.id);
    if (convIds.length > 0) {
      await tx
        .delete(notifications)
        .where(
          and(
            eq(notifications.type, "message"),
            inArray(sql`${notifications.data}->>'conversation_id'`, convIds),
          ),
        );
    }

    // The deleted account's devices must stop receiving pushes immediately.
    await tx.delete(pushTokens).where(eq(pushTokens.userId, user.id));
  });

  // Best-effort storage cleanup AFTER the tombstone is durable: delete the
  // actual chat media objects so blobs can't outlive the DB scrub. A storage
  // failure is logged loudly but never resurrects the account — the DB, the
  // source of truth, is already scrubbed.
  if (chatMediaUrls.length > 0) {
    const media = await getObjectStorageService().deleteServingUrls(chatMediaUrls);
    if (media.failed > 0) {
      logger.error(
        { user_id: user.id, ...media },
        "Chat media cleanup incomplete after account deletion",
      );
    }
  }

  // Final step: remove the account from the auth provider. Runs after the
  // local transaction has committed so the privacy obligation (data wipe) is
  // already durable even if the external call fails.
  try {
    await clerkClient.users.deleteUser(clerkId);
  } catch (err) {
    logger.error(
      { err, user_id: user.id },
      "Account data anonymized but Clerk user deletion failed",
    );
    throw Object.assign(
      new Error("Account data removed but auth-provider deletion failed"),
      { code: "AUTH_PROVIDER_ERROR" },
    );
  }

  return { deleted: true };
}
