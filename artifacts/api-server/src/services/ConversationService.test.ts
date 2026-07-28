import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  createConversation,
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteConversation,
} from "./ConversationService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { users, listings, notifications } from "@workspace/db/schema";

/**
 * G3 — buyer↔seller messaging end-to-end against a real database:
 * start thread → send → inbox + unread → read → mark-read → soft-delete, plus the
 * authorization gates (own-listing, non-participant) and create idempotency.
 */
const uids: string[] = [];
const listingIds: string[] = [];

async function mkUser(opts: { shadowBanned?: boolean } = {}): Promise<{ id: string; clerkId: string }> {
  const id = randomUUID();
  const clerkId = uniq("clerk");
  await db.insert(users).values({
    id,
    clerkId,
    name: uniq("User"),
    role: "individual",
    walletBalance: "0",
    isShadowBanned: opts.shadowBanned ?? false,
  });
  uids.push(id);
  return { id, clerkId };
}

async function mkActiveListing(sellerId: string): Promise<string> {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    userId: sellerId,
    title: uniq("msg-listing"),
    category: "car",
    status: "active",
    basePriceCash: "100000",
    location: "Cairo",
  });
  listingIds.push(id);
  return id;
}

afterAll(async () => {
  for (const id of listingIds) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("ConversationService — buyer↔seller messaging journey", () => {
  it("runs the full thread lifecycle: start → send → unread inbox → read", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const listingId = await mkActiveListing(seller.id);

    // Buyer opens a thread on the seller's listing.
    const conv = await createConversation(buyer.clerkId, listingId);
    expect(conv.listing_id).toBe(listingId);
    expect(conv.viewer_role).toBe("buyer");
    expect(conv.counterparty_id).toBe(seller.id);
    expect(conv.unread).toBe(0);

    // Buyer sends the first message.
    const sent = await sendMessage(buyer.clerkId, conv.id, "Is this still available?");
    expect(sent.is_mine).toBe(true);
    expect(sent.body).toBe("Is this still available?");
    expect(sent.read_at).toBeNull();

    // Seller's inbox shows the thread as the seller, with one unread.
    const sellerInbox = await listConversations(seller.clerkId);
    const threadForSeller = sellerInbox.find((c) => c.id === conv.id);
    expect(threadForSeller).toBeTruthy();
    expect(threadForSeller!.viewer_role).toBe("seller");
    expect(threadForSeller!.unread).toBe(1);
    expect(threadForSeller!.last_message_text).toBe("Is this still available?");

    // Seller reads the messages — the buyer's message is not "mine" for the seller.
    const msgs = await getMessages(seller.clerkId, conv.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].is_mine).toBe(false);
    expect(msgs[0].body).toBe("Is this still available?");

    // Marking read clears the seller's unread and stamps read_at.
    const read = await markConversationRead(seller.clerkId, conv.id);
    expect(read.read).toBe(true);

    const sellerInbox2 = await listConversations(seller.clerkId);
    expect(sellerInbox2.find((c) => c.id === conv.id)!.unread).toBe(0);

    const msgsAfter = await getMessages(seller.clerkId, conv.id);
    expect(msgsAfter[0].read_at).not.toBeNull();
  });

  it("is idempotent: re-opening the same listing returns the same conversation", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const listingId = await mkActiveListing(seller.id);

    const a = await createConversation(buyer.clerkId, listingId);
    const b = await createConversation(buyer.clerkId, listingId);
    expect(b.id).toBe(a.id);
  });

  it("forbids messaging your own listing", async () => {
    const seller = await mkUser();
    const listingId = await mkActiveListing(seller.id);
    await expect(createConversation(seller.clerkId, listingId)).rejects.toThrow(/own listing/i);
  });

  it("blocks a non-participant from reading a conversation", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const stranger = await mkUser();
    const listingId = await mkActiveListing(seller.id);

    const conv = await createConversation(buyer.clerkId, listingId);
    await sendMessage(buyer.clerkId, conv.id, "hi");
    await expect(getMessages(stranger.clerkId, conv.id)).rejects.toThrow(/participant/i);
  });

  it("rejects an empty message (no text, no media)", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const listingId = await mkActiveListing(seller.id);
    const conv = await createConversation(buyer.clerkId, listingId);
    await expect(sendMessage(buyer.clerkId, conv.id, "   ")).rejects.toThrow(
      /text, media, or a shared listing/i
    );
  });

  it("soft-hides a thread for the deleter only, and a new message un-hides it", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const listingId = await mkActiveListing(seller.id);

    const conv = await createConversation(buyer.clerkId, listingId);
    await sendMessage(buyer.clerkId, conv.id, "first");

    // Buyer hides the thread → gone from the buyer's inbox, still in the seller's.
    await deleteConversation(buyer.clerkId, conv.id);
    expect((await listConversations(buyer.clerkId)).find((c) => c.id === conv.id)).toBeUndefined();
    expect((await listConversations(seller.clerkId)).find((c) => c.id === conv.id)).toBeTruthy();

    // A new message from the seller un-hides it for the buyer.
    await sendMessage(seller.clerkId, conv.id, "still here");
    expect((await listConversations(buyer.clerkId)).find((c) => c.id === conv.id)).toBeTruthy();
  });

  it("notifies the RECIPIENT (not the sender) when a message is sent", async () => {
    const seller = await mkUser();
    const buyer = await mkUser();
    const listingId = await mkActiveListing(seller.id);
    const conv = await createConversation(buyer.clerkId, listingId);

    await sendMessage(buyer.clerkId, conv.id, "Is this still available?");

    // The seller (recipient) gets a "message" notification carrying the thread id.
    const sellerNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, seller.id));
    const msgNotif = sellerNotifs.find((n) => n.type === "message");
    expect(msgNotif).toBeTruthy();
    expect((msgNotif!.data as { conversation_id?: string }).conversation_id).toBe(conv.id);

    // The buyer (sender) is NOT notified of their own message.
    const buyerNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, buyer.id));
    expect(buyerNotifs.some((n) => n.type === "message")).toBe(false);
  });
});
