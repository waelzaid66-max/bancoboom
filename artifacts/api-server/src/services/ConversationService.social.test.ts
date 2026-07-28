import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  createConversation,
  getMessages,
  sendMessage,
  reactToMessage,
} from "./ConversationService";
import { db, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { users, listings } from "@workspace/db/schema";

/**
 * In-conversation social features against a real database: emoji reactions
 * (toggle + allowlist + participant gate), reply/quote previews, shared-listing
 * cards, and voice/media_kind. Mirrors the setup of ConversationService.test.ts.
 */
const uids: string[] = [];
const listingIds: string[] = [];

async function mkUser(): Promise<{ id: string; clerkId: string }> {
  const id = randomUUID();
  const clerkId = uniq("clerk");
  await db.insert(users).values({
    id,
    clerkId,
    name: uniq("User"),
    role: "individual",
    walletBalance: "0",
  });
  uids.push(id);
  return { id, clerkId };
}

async function mkActiveListing(sellerId: string): Promise<string> {
  const id = randomUUID();
  await db.insert(listings).values({
    id,
    userId: sellerId,
    title: uniq("social-listing"),
    category: "car",
    status: "active",
    basePriceCash: "250000",
    location: "Cairo",
  });
  listingIds.push(id);
  return id;
}

async function mkThread() {
  const seller = await mkUser();
  const buyer = await mkUser();
  const listingId = await mkActiveListing(seller.id);
  const conv = await createConversation(buyer.clerkId, listingId);
  return { seller, buyer, listingId, conv };
}

afterAll(async () => {
  for (const id of listingIds) await db.delete(listings).where(eq(listings.id, id));
  await deleteUsers(...uids);
});

describe("ConversationService — reactions", () => {
  it("toggles an emoji reaction on and off, scoped per user", async () => {
    const { seller, buyer, conv } = await mkThread();
    const msg = await sendMessage(buyer.clerkId, conv.id, "great car!");

    // Seller reacts ❤️ → count 1, and it is in the seller's my_reactions.
    const r1 = await reactToMessage(seller.clerkId, conv.id, msg.id, "❤️");
    expect(r1.reactions["❤️"]).toBe(1);
    expect(r1.my_reactions).toContain("❤️");

    // The buyer sees the count but it is NOT in *their* my_reactions.
    const seenByBuyer = (await getMessages(buyer.clerkId, conv.id)).find((m) => m.id === msg.id)!;
    expect(seenByBuyer.reactions["❤️"]).toBe(1);
    expect(seenByBuyer.my_reactions).not.toContain("❤️");

    // Buyer adds 👍 → both reactions present.
    const r2 = await reactToMessage(buyer.clerkId, conv.id, msg.id, "👍");
    expect(r2.reactions["❤️"]).toBe(1);
    expect(r2.reactions["👍"]).toBe(1);
    expect(r2.my_reactions).toEqual(["👍"]);

    // Seller toggles ❤️ off → removed entirely (no zero-count residue).
    const r3 = await reactToMessage(seller.clerkId, conv.id, msg.id, "❤️");
    expect(r3.reactions["❤️"]).toBeUndefined();
    expect(r3.reactions["👍"]).toBe(1);
  });

  it("rejects an emoji outside the allowlist", async () => {
    const { seller, buyer, conv } = await mkThread();
    const msg = await sendMessage(buyer.clerkId, conv.id, "hi");
    await expect(reactToMessage(seller.clerkId, conv.id, msg.id, "💩")).rejects.toThrow(
      /unsupported reaction/i
    );
  });

  it("blocks a non-participant from reacting", async () => {
    const { buyer, conv } = await mkThread();
    const stranger = await mkUser();
    const msg = await sendMessage(buyer.clerkId, conv.id, "hi");
    await expect(reactToMessage(stranger.clerkId, conv.id, msg.id, "❤️")).rejects.toThrow(
      /participant/i
    );
  });
});

describe("ConversationService — reply / quote", () => {
  it("attaches a reply preview to the quoting message", async () => {
    const { seller, buyer, conv } = await mkThread();
    const original = await sendMessage(buyer.clerkId, conv.id, "Is the price firm?");
    const reply = await sendMessage(seller.clerkId, conv.id, "A little flexible", {
      replyToId: original.id,
    });

    expect(reply.reply_to).not.toBeNull();
    expect(reply.reply_to!.id).toBe(original.id);
    expect(reply.reply_to!.body).toBe("Is the price firm?");
    expect(reply.reply_to!.sender_id).toBe(buyer.id);

    // And it survives a thread reload.
    const fromThread = (await getMessages(buyer.clerkId, conv.id)).find((m) => m.id === reply.id)!;
    expect(fromThread.reply_to!.body).toBe("Is the price firm?");
  });

  it("rejects a reply that targets a message in another conversation", async () => {
    const a = await mkThread();
    const b = await mkThread();
    const foreign = await sendMessage(a.buyer.clerkId, a.conv.id, "in thread A");
    await expect(
      sendMessage(b.buyer.clerkId, b.conv.id, "cross-quote", { replyToId: foreign.id })
    ).rejects.toThrow(/reply target not found/i);
  });
});

describe("ConversationService — shared listing card", () => {
  it("sends a listing as a card (empty body allowed) and resolves its details", async () => {
    const { buyer, conv, listingId } = await mkThread();
    const shared = await sendMessage(buyer.clerkId, conv.id, "", { listingRefId: listingId });

    expect(shared.listing_ref).not.toBeNull();
    expect(shared.listing_ref!.id).toBe(listingId);
    expect(shared.listing_ref!.title).toContain("social-listing");
    expect(shared.listing_ref!.price).toBe("250000");
  });

  it("rejects a shared listing that does not exist", async () => {
    const { buyer, conv } = await mkThread();
    await expect(
      sendMessage(buyer.clerkId, conv.id, "look", { listingRefId: randomUUID() })
    ).rejects.toThrow(/shared listing not found/i);
  });
});

describe("ConversationService — voice / media kind", () => {
  it("carries media_kind for a voice note", async () => {
    const { buyer, conv } = await mkThread();
    const voice = await sendMessage(buyer.clerkId, conv.id, "", {
      mediaUrl: "https://cdn.example.com/voice/abc.m4a",
      mediaKind: "audio",
    });
    expect(voice.media_kind).toBe("audio");
    expect(voice.media_url).toContain("abc.m4a");

    const fromThread = (await getMessages(buyer.clerkId, conv.id)).find((m) => m.id === voice.id)!;
    expect(fromThread.media_kind).toBe("audio");
  });

  it("defaults media_kind to image for a legacy image attachment", async () => {
    const { buyer, conv } = await mkThread();
    const img = await sendMessage(buyer.clerkId, conv.id, "", {
      mediaUrl: "https://cdn.example.com/img/x.jpg",
    });
    expect(img.media_kind).toBe("image");
  });
});
