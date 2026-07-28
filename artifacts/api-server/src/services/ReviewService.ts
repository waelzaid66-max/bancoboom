import { db } from "@workspace/db";
import {
  sellerReviews,
  conversations,
  leadHistory,
  users,
} from "@workspace/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import { recomputeDealerQuality } from "./QualityService";

type CodedError = Error & { code?: string };
function codedError(code: string, message: string): CodedError {
  return Object.assign(new Error(message), { code });
}

export interface ReviewDTO {
  id: string;
  seller_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
}

export interface ReviewsResponseDTO {
  items: ReviewDTO[];
  summary: ReviewSummary;
  /** Whether the viewer is allowed to leave/update a review for this seller. */
  can_review: boolean;
  /** The viewer's existing rating, if they already reviewed (for prefill). */
  my_rating: number | null;
}

const MAX_BODY = 1000;

async function getUserId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw codedError("UNAUTHORIZED", "User not found");
  return user.id;
}

/**
 * Reviews are restricted to authors who have a *real* interaction with the
 * seller — they either messaged them (a conversation) or generated a recorded
 * lead. This is the anti-fake-review gate; it is enforced on write and also
 * powers the read-side `can_review` flag so the client only shows the form to
 * eligible users.
 */
async function hasRealInteraction(authorId: string, sellerId: string): Promise<boolean> {
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.buyerId, authorId), eq(conversations.sellerId, sellerId)))
    .limit(1);
  if (conv) return true;

  const [lead] = await db
    .select({ id: leadHistory.id })
    .from(leadHistory)
    .where(and(eq(leadHistory.buyerId, authorId), eq(leadHistory.sellerId, sellerId)))
    .limit(1);
  return !!lead;
}

/** Aggregate rating for a seller (avg rounded to 1 decimal, plus count). */
export async function getReviewSummary(sellerId: string): Promise<ReviewSummary> {
  const [agg] = await db
    .select({
      avg: sql<number | null>`AVG(${sellerReviews.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(sellerReviews)
    .where(eq(sellerReviews.sellerId, sellerId));

  const count = Number(agg?.count ?? 0);
  const average =
    count > 0 && agg?.avg != null ? Math.round(Number(agg.avg) * 10) / 10 : null;
  return { average, count };
}

/**
 * Public list of a seller's reviews (newest first) with the aggregate summary.
 * When a viewer is provided, also returns whether they may review and their own
 * existing rating (so the form can prefill / switch to "update").
 */
export async function listReviews(
  sellerId: string,
  viewerClerkId?: string | null
): Promise<ReviewsResponseDTO> {
  const [seller] = await db
    .select({ id: users.id, isShadowBanned: users.isShadowBanned })
    .from(users)
    .where(eq(users.id, sellerId))
    .limit(1);
  // A shadow-banned seller's public surface is suppressed (mirror CompanyService).
  if (!seller || seller.isShadowBanned === true)
    throw codedError("NOT_FOUND", "Seller not found");

  const rows = await db
    .select({
      id: sellerReviews.id,
      sellerId: sellerReviews.sellerId,
      authorId: sellerReviews.authorId,
      rating: sellerReviews.rating,
      body: sellerReviews.body,
      createdAt: sellerReviews.createdAt,
    })
    .from(sellerReviews)
    .where(eq(sellerReviews.sellerId, sellerId))
    .orderBy(desc(sellerReviews.createdAt))
    .limit(100);

  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
  const nameMap = new Map<string, string | null>();
  if (authorIds.length) {
    const nameRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, authorIds));
    for (const n of nameRows) nameMap.set(n.id, n.name);
  }

  const items: ReviewDTO[] = rows.map((r) => ({
    id: r.id,
    seller_id: r.sellerId,
    author_id: r.authorId,
    author_name: nameMap.get(r.authorId) ?? "User",
    rating: r.rating,
    body: r.body ?? null,
    created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));

  // Aggregate over ALL reviews (not just the returned page) so trust counts and
  // the average stay accurate beyond the 100-row list cap.
  const summary = await getReviewSummary(sellerId);

  let canReview = false;
  let myRating: number | null = null;
  if (viewerClerkId) {
    try {
      const viewerId = await getUserId(viewerClerkId);
      if (viewerId !== sellerId) {
        canReview = await hasRealInteraction(viewerId, sellerId);
        const existing = items.find((i) => i.author_id === viewerId);
        myRating = existing ? existing.rating : null;
      }
    } catch {
      // Unknown viewer — treated as not eligible.
    }
  }

  return { items, summary, can_review: canReview, my_rating: myRating };
}

/**
 * Create or update the viewer's review of a seller. Enforces: rating 1..5, no
 * self-review, and a real prior interaction with the seller. One review per
 * (seller, author) — re-submitting updates the row. Notifies the seller and
 * triggers a quality-score recompute (reviews feed the trust metric).
 */
export async function createReview(
  clerkId: string,
  sellerId: string,
  rating: number,
  body?: string | null
): Promise<ReviewDTO> {
  const authorId = await getUserId(clerkId);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw codedError("INVALID_DATA", "Rating must be an integer from 1 to 5");
  }
  if (authorId === sellerId) {
    throw codedError("INVALID_DATA", "You cannot review yourself");
  }

  const text = body == null ? null : body.trim();
  if (text && text.length > MAX_BODY) {
    throw codedError("INVALID_DATA", "Review is too long");
  }

  const [seller] = await db
    .select({ id: users.id, name: users.name, isShadowBanned: users.isShadowBanned })
    .from(users)
    .where(eq(users.id, sellerId))
    .limit(1);
  if (!seller || seller.isShadowBanned === true)
    throw codedError("NOT_FOUND", "Seller not found");

  const eligible = await hasRealInteraction(authorId, sellerId);
  if (!eligible) {
    throw codedError(
      "NOT_ELIGIBLE",
      "You can only review a seller you have contacted or messaged"
    );
  }

  const [row] = await db
    .insert(sellerReviews)
    .values({ sellerId, authorId, rating, body: text ?? null })
    .onConflictDoUpdate({
      target: [sellerReviews.sellerId, sellerReviews.authorId],
      set: { rating, body: text ?? null, updatedAt: new Date() },
    })
    .returning();

  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, authorId))
    .limit(1);
  const authorName = author?.name ?? "User";

  await createNotification({
    userId: sellerId,
    type: "review",
    title: `${authorName} قيّمك · rated you ${rating}★`,
    body:
      text && text.length > 0
        ? text.length > 80
          ? `${text.slice(0, 79)}…`
          : text
        : `تقييم جديد ${rating}★ · New ${rating}-star rating`,
    data: { seller_id: sellerId, review_id: row.id, rating },
  });

  // Reviews feed the dealer quality / trust metric — recompute off the hot path.
  recomputeDealerQuality(sellerId);

  return {
    id: row.id,
    seller_id: sellerId,
    author_id: authorId,
    author_name: authorName,
    rating: row.rating,
    body: row.body ?? null,
    created_at: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
  };
}
