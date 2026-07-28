import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Mock the auth provider BEFORE importing the service under test. deleteAccount
// removes the user from Clerk as its final, non-transactional step; we never
// want to hit the real Clerk API from a test, and we need to observe WHEN that
// call happens relative to the local DB transaction.
vi.mock("@clerk/express", () => ({
  clerkClient: { users: { deleteUser: vi.fn() } },
}));

// Mock the storage provider's blob-deletion seam: vitest processes can't sign
// against the object-storage sidecar (only the workflow server process can),
// and the unit under test only needs to prove it passes the RIGHT serving
// URLs through the provider interface (backend-agnostic — replit or s3; each
// backend's own deleteServingUrls has dedicated contract tests).
const { deleteServingUrlsMock } = vi.hoisted(() => ({
  deleteServingUrlsMock: vi.fn(async () => ({ deleted: 0, skipped: 0, failed: 0 })),
}));
vi.mock("../lib/objectStorageProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/objectStorageProvider")>();
  return {
    ...actual,
    getObjectStorageService: () =>
      ({ deleteServingUrls: deleteServingUrlsMock }) as unknown as ReturnType<
        typeof actual.getObjectStorageService
      >,
  };
});

import { clerkClient } from "@clerk/express";
import { eq, inArray } from "drizzle-orm";
import { deleteAccount } from "./UserService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  users,
  listings,
  leadHistory,
  savedListings,
  userBehavior,
  conversations,
  messages,
  notifications,
  pushTokens,
} from "@workspace/db/schema";

const deleteUserMock = vi.mocked(clerkClient.users.deleteUser);

const uids: string[] = [];

/**
 * Insert a fully-populated user (every PII field set) plus a personal-data
 * footprint: a lead with the user recorded as buyer (PII captured), a saved
 * listing and a behavior row. Returns the ids needed to make assertions.
 */
async function seedUserWithFootprint(): Promise<{
  userId: string;
  clerkId: string;
  sellerId: string;
  listingId: string;
  leadId: string;
  savedId: string;
  behaviorId: string;
}> {
  const clerkId = uniq("clerk");
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    clerkId,
    name: "Real Name",
    email: `${uniq("buyer")}@example.com`,
    phone: uniq("phone"),
    role: "dealer",
    isVerified: true,
    companyDetails: {
      activity_type: "car_dealer",
      business_name: "Acme Motors",
      city: "Cairo",
    },
  });
  uids.push(userId);

  // A separate seller owns the listing the lead/save/behavior point at.
  const sellerId = randomUUID();
  await db.insert(users).values({
    id: sellerId,
    clerkId: uniq("clerk"),
    name: "Seller",
    role: "dealer",
  });
  uids.push(sellerId);

  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: sellerId,
    title: uniq("listing"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
  });

  const [lead] = await db
    .insert(leadHistory)
    .values({
      listingId,
      buyerId: userId,
      sellerId,
      actionType: "whatsapp",
      buyerName: "Real Name",
      buyerPhone: uniq("leadphone"),
    })
    .returning({ id: leadHistory.id });

  const [saved] = await db
    .insert(savedListings)
    .values({ userId, listingId })
    .returning({ id: savedListings.id });

  const [behavior] = await db
    .insert(userBehavior)
    .values({ userId, listingId, action: "view" })
    .returning({ id: userBehavior.id });

  return {
    userId,
    clerkId,
    sellerId,
    listingId,
    leadId: lead.id,
    savedId: saved.id,
    behaviorId: behavior.id,
  };
}

beforeEach(() => {
  deleteUserMock.mockReset();
  deleteUserMock.mockResolvedValue(undefined as never);
});

describe("deleteAccount", () => {
  it("anonymizes the user, wipes lead PII + personal data, then deletes from Clerk", async () => {
    const f = await seedUserWithFootprint();

    // Capture the local DB state at the moment Clerk deletion is invoked, to
    // prove the auth-provider call happens AFTER the transaction has committed.
    let stateAtClerkCall: {
      deletedAt: Date | null;
      email: string | null;
    } | null = null;
    deleteUserMock.mockImplementation(async () => {
      const [row] = await db
        .select({ deletedAt: users.deletedAt, email: users.email })
        .from(users)
        .where(eq(users.id, f.userId))
        .limit(1);
      stateAtClerkCall = row ?? null;
      return undefined as never;
    });

    const result = await deleteAccount(f.clerkId);
    expect(result).toEqual({ deleted: true });

    // User record anonymized + PII stripped + soft-deleted.
    const [user] = await db.select().from(users).where(eq(users.id, f.userId));
    expect(user.name).toBe("Deleted User");
    expect(user.email).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.companyDetails).toBeNull();
    expect(user.isVerified).toBe(false);
    expect(user.deletedAt).toBeInstanceOf(Date);

    // Buyer-side lead PII wiped, but the lead row itself is kept (seller
    // reference stays intact).
    const [lead] = await db
      .select()
      .from(leadHistory)
      .where(eq(leadHistory.id, f.leadId));
    expect(lead).toBeDefined();
    expect(lead.buyerName).toBeNull();
    expect(lead.buyerPhone).toBeNull();

    // Personal collections / behavior history removed entirely.
    const saves = await db
      .select()
      .from(savedListings)
      .where(eq(savedListings.userId, f.userId));
    expect(saves).toHaveLength(0);
    const behavior = await db
      .select()
      .from(userBehavior)
      .where(eq(userBehavior.userId, f.userId));
    expect(behavior).toHaveLength(0);

    // Clerk deletion called exactly once, with the user's clerkId, and ONLY
    // after the local transaction committed (the snapshot taken inside the
    // Clerk call already shows the anonymized, soft-deleted record).
    expect(deleteUserMock).toHaveBeenCalledTimes(1);
    expect(deleteUserMock).toHaveBeenCalledWith(f.clerkId);
    expect(stateAtClerkCall).not.toBeNull();
    expect(stateAtClerkCall!.email).toBeNull();
    expect(stateAtClerkCall!.deletedAt).toBeInstanceOf(Date);
  });

  it("blanks the user's chat messages and conversation previews; counterparty content survives", async () => {
    const f = await seedUserWithFootprint();

    const [conv] = await db
      .insert(conversations)
      .values({
        listingId: f.listingId,
        buyerId: f.userId,
        sellerId: f.sellerId,
        lastMessageText: "secret text typed by the buyer",
      })
      .returning({ id: conversations.id });

    const CHAT_MEDIA_URL =
      "https://app.example.com/api/v1/uploads/objects/uploads/chat-media-test-object";
    const [mineMsg] = await db
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderId: f.userId,
        body: "my private phone is 0100-000-0000",
        mediaUrl: CHAT_MEDIA_URL,
        mediaKind: "image",
      })
      .returning({ id: messages.id });

    const [theirsMsg] = await db
      .insert(messages)
      .values({
        conversationId: conv.id,
        senderId: f.sellerId,
        body: "seller reply stays intact",
      })
      .returning({ id: messages.id });

    // The counterparty's notification inbox holds a preview quoting the
    // deleted user's words + name; an unrelated message-notification (other
    // conversation) must survive the purge.
    await db.insert(notifications).values({
      userId: f.sellerId,
      type: "message",
      title: "Real Name",
      body: "my private phone is 0100-000-0000",
      data: { conversation_id: conv.id, listing_id: f.listingId },
    });
    const [unrelatedNotif] = await db
      .insert(notifications)
      .values({
        userId: f.sellerId,
        type: "message",
        title: "Someone Else",
        body: "unrelated preview survives",
        data: { conversation_id: randomUUID() },
      })
      .returning({ id: notifications.id });

    // The deleted account's device must stop receiving pushes.
    await db.insert(pushTokens).values({
      userId: f.userId,
      token: uniq("tok"),
      platform: "android",
    });

    await deleteAccount(f.clerkId);

    // The deleted user's message content is tombstoned (row survives for
    // thread structure, content is gone).
    const [mine] = await db.select().from(messages).where(eq(messages.id, mineMsg.id));
    expect(mine).toBeDefined();
    expect(mine.body).toBe("");
    expect(mine.mediaUrl).toBeNull();
    expect(mine.mediaKind).toBeNull();

    // The counterparty's message is untouched.
    const [theirs] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, theirsMsg.id));
    expect(theirs.body).toBe("seller reply stays intact");

    // The conversation row survives (counterparty keeps the thread) but the
    // preview that could quote the deleted user is dropped.
    const [convAfter] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conv.id));
    expect(convAfter).toBeDefined();
    expect(convAfter.lastMessageText).toBeNull();

    // The storage blobs behind the user's chat media are handed to the
    // provider's cleanup seam exactly once, with the captured serving URLs.
    expect(deleteServingUrlsMock).toHaveBeenCalledTimes(1);
    expect(deleteServingUrlsMock).toHaveBeenCalledWith([CHAT_MEDIA_URL]);

    // Message-notification previews quoting the deleted user are purged from
    // the counterparty's inbox…
    const sellerNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, f.sellerId));
    expect(sellerNotifs.map((n) => n.body)).not.toContain(
      "my private phone is 0100-000-0000",
    );
    // …while message notifications about OTHER conversations survive.
    expect(sellerNotifs.map((n) => n.id)).toContain(unrelatedNotif.id);

    // Push tokens for the deleted account are gone.
    const tokens = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.userId, f.userId));
    expect(tokens).toHaveLength(0);
  });

  it("throws NOT_FOUND and never touches Clerk for an unknown user", async () => {
    await expect(deleteAccount(uniq("missing-clerk"))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("throws AUTH_PROVIDER_ERROR but keeps local data anonymized when Clerk deletion fails", async () => {
    const f = await seedUserWithFootprint();
    deleteUserMock.mockRejectedValue(new Error("clerk down"));

    await expect(deleteAccount(f.clerkId)).rejects.toMatchObject({
      code: "AUTH_PROVIDER_ERROR",
    });

    // The privacy obligation (local wipe) must already be durable even though
    // the auth-provider step failed.
    const [user] = await db.select().from(users).where(eq(users.id, f.userId));
    expect(user.name).toBe("Deleted User");
    expect(user.email).toBeNull();
    expect(user.phone).toBeNull();
    expect(user.companyDetails).toBeNull();
    expect(user.deletedAt).toBeInstanceOf(Date);

    const saves = await db
      .select()
      .from(savedListings)
      .where(eq(savedListings.userId, f.userId));
    expect(saves).toHaveLength(0);
  });
});

afterAll(async () => {
  if (uids.length) {
    // listings cascade → lead_history (by listingId) + saved_listings (by
    // listingId) + user_behavior (by listingId). Drop them first, then the
    // non-cascading behavior rows, then the users themselves.
    await db.delete(listings).where(inArray(listings.userId, uids));
    await db.delete(userBehavior).where(inArray(userBehavior.userId, uids));
    await db.delete(savedListings).where(inArray(savedListings.userId, uids));
    await db.delete(leadHistory).where(inArray(leadHistory.sellerId, uids));
    await deleteUsers(...uids);
  }
});
