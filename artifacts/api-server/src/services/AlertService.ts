import { db } from "@workspace/db";
import { savedSearches, companyFollows, users } from "@workspace/db/schema";
import { and, eq, ne, or, isNull, lte, gte } from "drizzle-orm";
import { createNotification } from "./NotificationService";
import { getSaverUserIds } from "./SaveService";
import {
  isEmailChannelEnabled,
  sendNewMatchEmail,
  sendPriceDropEmail,
} from "./EmailService";

/**
 * AlertService — best-effort, non-blocking dispatch of the two demand-side
 * alerts. Both functions never throw into the caller's request path (the
 * originating action — creating or repricing a listing — must always succeed).
 * createNotification itself already respects per-category mute, so muted users
 * are filtered there.
 */

// Anti-storm: a single saved search is alerted at most once per window, so a
// dealer bulk-publishing inventory can't flood a saver with notifications.
const NEW_MATCH_COOLDOWN_MS = 10 * 60_000;

/**
 * Notify owners of alerts-enabled saved searches whose criteria match a newly
 * created listing. Matching is conservative and REAL: category (when set),
 * price range (when set), and an optional free-text term against the title.
 * Never alerts the seller about their own listing.
 */
export async function notifyNewMatch(listing: {
  id: string;
  category: "car" | "real_estate" | "industrial";
  price: number;
  title: string;
  sellerId: string;
}): Promise<void> {
  try {
    const candidates = await db
      .select()
      .from(savedSearches)
      .where(
        and(
          eq(savedSearches.alertsEnabled, true),
          ne(savedSearches.userId, listing.sellerId),
          or(isNull(savedSearches.category), eq(savedSearches.category, listing.category)),
          or(isNull(savedSearches.priceMin), lte(savedSearches.priceMin, String(listing.price))),
          or(isNull(savedSearches.priceMax), gte(savedSearches.priceMax, String(listing.price))),
        ),
      );

    const now = Date.now();
    const titleLower = listing.title.toLowerCase();

    for (const search of candidates) {
      // Free-text term (if any) must appear in the listing title.
      if (search.query && !titleLower.includes(search.query.trim().toLowerCase())) continue;

      // Per-search cooldown to prevent notification storms.
      const last = search.lastNotifiedListingAt ? search.lastNotifiedListingAt.getTime() : 0;
      if (now - last < NEW_MATCH_COOLDOWN_MS) continue;

      await createNotification({
        userId: search.userId,
        type: "new_match",
        title: "نتيجة جديدة لبحثك المحفوظ · New match for your saved search",
        body: `إعلان جديد يطابق «${search.name}» · A new listing matches "${search.name}"`,
        data: { listing_id: listing.id, saved_search_id: search.id },
      });

      await db
        .update(savedSearches)
        .set({ lastNotifiedListingAt: new Date() })
        .where(eq(savedSearches.id, search.id));

      // Best-effort email — never blocks or throws into the caller.
      void (async () => {
        try {
          if (!(await isEmailChannelEnabled(search.userId, "new_match"))) return;
          const [u] = await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, search.userId))
            .limit(1);
          if (!u?.email) return;
          await sendNewMatchEmail({
            to: u.email,
            userName: u.name ?? "",
            searchName: search.name ?? "",
            listingTitle: listing.title,
            listingId: listing.id,
          });
        } catch (emailErr) {
          console.error("[Alert new_match email]", emailErr);
        }
      })();
    }
  } catch (err) {
    console.error("[Alert new_match]", err);
  }
}

/**
 * Notify every user who saved a listing that its cash price dropped. Real
 * numbers only — old/new price come straight from the update path.
 */
export async function notifyPriceDrop(listing: {
  id: string;
  title: string;
  oldPrice: number;
  newPrice: number;
  sellerId: string;
}): Promise<void> {
  try {
    const saverIds = await getSaverUserIds(listing.id);
    for (const userId of saverIds) {
      if (userId === listing.sellerId) continue;
      await createNotification({
        userId,
        type: "price_drop",
        title: "انخفض سعر إعلان محفوظ · Price drop on a saved listing",
        body: `انخفض سعر «${listing.title}» · "${listing.title}" dropped in price`,
        data: {
          listing_id: listing.id,
          old_price: listing.oldPrice,
          new_price: listing.newPrice,
        },
      });

      // Best-effort email — never blocks or throws into the caller.
      void (async () => {
        try {
          if (!(await isEmailChannelEnabled(userId, "price_drop"))) return;
          const [u] = await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          if (!u?.email) return;
          await sendPriceDropEmail({
            to: u.email,
            userName: u.name ?? "",
            listingTitle: listing.title,
            oldPrice: listing.oldPrice,
            newPrice: listing.newPrice,
            listingId: listing.id,
          });
        } catch (emailErr) {
          console.error("[Alert price_drop email]", emailErr);
        }
      })();
    }
  } catch (err) {
    console.error("[Alert price_drop]", err);
  }
}

/**
 * Notify everyone following a company when it publishes a NEW listing — closes
 * the follow loop (following was previously write-only: the company heard about
 * followers, followers never heard from the company). Rides the existing
 * "new_match" type (no enum change) so per-category mute + the listing
 * deep-link work unchanged. Best-effort; never alerts the seller; no-op when
 * the seller has no followers. Callers skip buyer-requests — a "wanted" post
 * is not inventory.
 */
export async function notifyFollowersOfNewListing(listing: {
  id: string;
  title: string;
  sellerId: string;
}): Promise<void> {
  try {
    const followers = await db
      .select({ followerId: companyFollows.followerId })
      .from(companyFollows)
      .where(eq(companyFollows.companyUserId, listing.sellerId));
    if (followers.length === 0) return;

    const [seller] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, listing.sellerId))
      .limit(1);
    const sellerName = seller?.name ?? "";

    for (const f of followers) {
      if (f.followerId === listing.sellerId) continue;
      await createNotification({
        userId: f.followerId,
        type: "new_match",
        title: sellerName
          ? `${sellerName} أضاف إعلاناً جديداً · ${sellerName} posted a new listing`
          : "إعلان جديد من حساب تتابعه · New listing from a company you follow",
        body: `«${listing.title}»`,
        data: { listing_id: listing.id, company_user_id: listing.sellerId },
      });
    }
  } catch (err) {
    console.error("[Alert followers]", err);
  }
}
