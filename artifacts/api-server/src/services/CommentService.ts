import { db } from "@workspace/db";
import { listingComments, listings, users } from "@workspace/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import { checkCommentRate } from "./AbuseService";
import { publicVisibilityConditions } from "../lib/feedVisibility";

type CodedError = Error & { code?: string };
function codedError(code: string, message: string): CodedError {
  return Object.assign(new Error(message), { code });
}

export interface CommentDTO {
  id: string;
  listing_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  is_seller: boolean;
  body: string;
  created_at: string;
}

async function getUserId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw codedError("UNAUTHORIZED", "User not found");
  return user.id;
}

const MAX_BODY = 1000;

/**
 * Public listing Q&A in chronological order. Each row carries the author's name
 * and an `is_seller` flag (the author owns the listing) so the client can group
 * questions with the seller's answers and badge the seller's replies. A flat
 * thread: a question has `parent_id = null`; answers/replies reference it.
 */
export async function listComments(listingId: string): Promise<CommentDTO[]> {
  // Public surface: a flagged listing or shadow-banned seller is suppressed
  // (404) so its Q&A never leaks. Mirrors publicVisibilityConditions().
  const [listing] = await db
    .select({ id: listings.id, sellerId: listings.userId })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.userId))
    .where(and(eq(listings.id, listingId), ...publicVisibilityConditions()))
    .limit(1);
  if (!listing) throw codedError("NOT_FOUND", "Listing not found");

  const rows = await db
    .select({
      id: listingComments.id,
      listingId: listingComments.listingId,
      parentId: listingComments.parentId,
      authorId: listingComments.authorId,
      body: listingComments.body,
      createdAt: listingComments.createdAt,
    })
    .from(listingComments)
    .where(eq(listingComments.listingId, listingId))
    .orderBy(asc(listingComments.createdAt));

  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
  const nameRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, authorIds));
  const nameMap = new Map(nameRows.map((n) => [n.id, n.name]));

  return rows.map((r) => ({
    id: r.id,
    listing_id: r.listingId,
    parent_id: r.parentId ?? null,
    author_id: r.authorId,
    author_name: nameMap.get(r.authorId) ?? "User",
    is_seller: r.authorId === listing.sellerId,
    body: r.body,
    created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));
}

/**
 * Post a question (top-level) or a reply/answer on a listing. Any authenticated
 * user may comment, subject to the per-user anti-spam rate cap. Notifies the
 * listing owner of a new question, or the parent author of a reply (never
 * self-notifies). Idempotency is not required: each post is a distinct entry.
 */
export async function createComment(
  clerkId: string,
  listingId: string,
  body: string,
  parentId?: string | null
): Promise<CommentDTO> {
  const authorId = await getUserId(clerkId);

  const text = (body ?? "").trim();
  if (!text) throw codedError("INVALID_DATA", "Comment cannot be empty");
  if (text.length > MAX_BODY) throw codedError("INVALID_DATA", "Comment is too long");

  const rate = await checkCommentRate({ userId: authorId });
  if (!rate.ok) throw codedError("RATE_LIMITED", "Too many comments, please slow down");

  // Block posting onto suppressed inventory (flagged listing / shadow-banned
  // seller) — same guard as the read path.
  const [listing] = await db
    .select({ id: listings.id, title: listings.title, sellerId: listings.userId })
    .from(listings)
    .innerJoin(users, eq(users.id, listings.userId))
    .where(and(eq(listings.id, listingId), ...publicVisibilityConditions()))
    .limit(1);
  if (!listing) throw codedError("NOT_FOUND", "Listing not found");

  let parent: { id: string; authorId: string } | null = null;
  if (parentId) {
    const [p] = await db
      .select({ id: listingComments.id, authorId: listingComments.authorId, listingId: listingComments.listingId })
      .from(listingComments)
      .where(eq(listingComments.id, parentId))
      .limit(1);
    if (!p || p.listingId !== listingId) {
      throw codedError("NOT_FOUND", "Parent comment not found");
    }
    parent = { id: p.id, authorId: p.authorId };
  }

  const [row] = await db
    .insert(listingComments)
    .values({ listingId, authorId, parentId: parentId ?? null, body: text })
    .returning();

  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, authorId))
    .limit(1);
  const authorName = author?.name ?? "User";
  const preview = text.length > 80 ? `${text.slice(0, 79)}…` : text;

  // Notify: a top-level question pings the listing owner; a reply pings the
  // parent author. Never notify yourself.
  const recipientId = parent ? parent.authorId : listing.sellerId;
  if (recipientId && recipientId !== authorId) {
    await createNotification({
      userId: recipientId,
      type: "comment",
      title: parent
        ? `${authorName} ردّ عليك · replied`
        : `${authorName} سأل عن إعلانك · asked a question`,
      body: preview,
      data: { listing_id: listingId, comment_id: row.id, parent_id: parentId ?? null },
    });
  }

  return {
    id: row.id,
    listing_id: listingId,
    parent_id: row.parentId ?? null,
    author_id: authorId,
    author_name: authorName,
    is_seller: authorId === listing.sellerId,
    body: row.body,
    created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}

/**
 * Delete a comment. Allowed for the comment's own author OR the listing owner
 * (two-sided moderation). Replies cascade away automatically via the
 * self-referential parent_id FK (onDelete: cascade). Idempotent enough: a
 * second delete on a missing comment returns NOT_FOUND.
 */
export async function deleteComment(
  clerkId: string,
  listingId: string,
  commentId: string
): Promise<{ deleted: boolean }> {
  const userId = await getUserId(clerkId);

  const [listing] = await db
    .select({ id: listings.id, sellerId: listings.userId })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing) throw codedError("NOT_FOUND", "Listing not found");

  const [comment] = await db
    .select({
      id: listingComments.id,
      authorId: listingComments.authorId,
      listingId: listingComments.listingId,
    })
    .from(listingComments)
    .where(eq(listingComments.id, commentId))
    .limit(1);
  if (!comment || comment.listingId !== listingId) {
    throw codedError("NOT_FOUND", "Comment not found");
  }

  const isAuthor = comment.authorId === userId;
  const isOwner = listing.sellerId === userId;
  if (!isAuthor && !isOwner) {
    throw codedError("FORBIDDEN", "Not allowed to delete this comment");
  }

  await db.delete(listingComments).where(eq(listingComments.id, commentId));
  return { deleted: true };
}
