import { db } from "@workspace/db";
import { stories, storyViews, users } from "@workspace/db/schema";
import { eq, and, gt, or, desc, inArray, sql } from "drizzle-orm";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoryDTO {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  media_url: string;
  caption: string | null;
  listing_id: string | null;
  created_at: string;
  expires_at: string;
  seen: boolean;
  is_mine: boolean;
  view_count?: number;
}

async function resolveUserId(clerkId: string): Promise<string | null> {
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return u?.id ?? null;
}

export async function createStory(
  clerkId: string,
  input: { media_url: string; listing_id?: string; caption?: string }
): Promise<StoryDTO> {
  const userId = await resolveUserId(clerkId);
  if (!userId)
    throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  const expiresAt = new Date(Date.now() + STORY_TTL_MS);
  const [row] = await db
    .insert(stories)
    .values({
      userId,
      listingId: input.listing_id ?? null,
      mediaUrl: input.media_url,
      caption: input.caption ?? null,
      expiresAt,
    })
    .returning();

  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    id: row.id,
    user_id: userId,
    user_name: author?.name ?? "You",
    user_avatar: null,
    media_url: row.mediaUrl,
    caption: row.caption,
    listing_id: row.listingId,
    created_at: (row.createdAt ?? new Date()).toISOString(),
    expires_at: row.expiresAt.toISOString(),
    seen: true,
    is_mine: true,
    view_count: 0,
  };
}

/**
 * Active (non-expired) stories for the rail. Shadow-banned authors' stories are
 * hidden from everyone except the author (abuse control parity with listings).
 * `seen` is per-viewer; anonymous callers always get seen=false.
 */
export async function listActiveStories(clerkId?: string): Promise<StoryDTO[]> {
  const viewerId = clerkId ? await resolveUserId(clerkId) : null;
  const now = new Date();

  const visibility = viewerId
    ? or(eq(users.isShadowBanned, false), eq(stories.userId, viewerId))
    : eq(users.isShadowBanned, false);

  const rows = await db
    .select({
      id: stories.id,
      userId: stories.userId,
      mediaUrl: stories.mediaUrl,
      caption: stories.caption,
      listingId: stories.listingId,
      createdAt: stories.createdAt,
      expiresAt: stories.expiresAt,
      userName: users.name,
      viewCount: sql<number>`(
        select count(*)::int from ${storyViews}
        where ${storyViews.storyId} = ${stories.id}
      )`,
    })
    .from(stories)
    .innerJoin(users, eq(stories.userId, users.id))
    .where(and(gt(stories.expiresAt, now), visibility))
    .orderBy(desc(stories.createdAt))
    .limit(200);

  let seen = new Set<string>();
  if (viewerId && rows.length) {
    const views = await db
      .select({ storyId: storyViews.storyId })
      .from(storyViews)
      .where(
        and(
          eq(storyViews.viewerId, viewerId),
          inArray(
            storyViews.storyId,
            rows.map((r) => r.id)
          )
        )
      );
    seen = new Set(views.map((v) => v.storyId));
  }

  return rows.map((r) => ({
    id: r.id,
    user_id: r.userId,
    user_name: r.userName ?? "Unknown",
    user_avatar: null,
    media_url: r.mediaUrl,
    caption: r.caption,
    listing_id: r.listingId,
    created_at: (r.createdAt ?? new Date()).toISOString(),
    expires_at: r.expiresAt.toISOString(),
    seen: viewerId ? seen.has(r.id) : false,
    is_mine: viewerId === r.userId,
    view_count: Number(r.viewCount ?? 0),
  }));
}

export async function viewStory(
  clerkId: string,
  storyId: string
): Promise<{ viewed: boolean }> {
  const viewerId = await resolveUserId(clerkId);
  if (!viewerId)
    throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  await db
    .insert(storyViews)
    .values({ storyId, viewerId })
    .onConflictDoNothing();
  return { viewed: true };
}
