import { db } from "@workspace/db";
import { listings, ads, users, interactions, listingAttributes } from "@workspace/db/schema";
import { and, eq, desc, sql, inArray, type SQL } from "drizzle-orm";
import { normalizePaymentOptions } from "./PaymentService";
import { transformFeedItems, transformToFeedItem } from "./BffService";
import { enrichListings, buildAttributeConditions, type PaymentPlan, type IndustrialSubtype } from "./SearchService";
import { adaptFeed } from "./AdaptiveFeedEngine";
import { publicVisibilityConditions } from "../lib/feedVisibility";
import type { FeedItem } from "../validators/schemas";

interface FeedWeights {
  freshness: number;
  engagement: number;
  media: number;
  verified: number;
  trust: number;
  quality: number;
  saves: number;
  ads: number;
}

const DEFAULT_WEIGHTS: FeedWeights = {
  freshness: 0.30,
  engagement: 0.25,
  media: 0.12,
  verified: 0.08,
  trust: 0.15,
  quality: 0.10, // dealer quality score as a ranking modifier
  saves: 0.08, // engagement resurfacing (saved_listings count, log-scaled)
  ads: 10, // multiplier for sponsored items
};

// Listings flagged as duplicates are heavily demoted but not removed.
const DUPLICATE_PENALTY = 0.4;

function timeDécay(createdAt: Date | string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp(-ageDays / 14); // half-life ~14 days
}

function normalizeEngagement(views: number, clicks: number, maxViews = 500): number {
  const raw = views + clicks * 3;
  return Math.min(raw / maxViews, 1);
}

// Saves are a strong intent signal but must not let one popular listing dominate
// — log-scale and cap at 1 (0 saves → 0, ~9 → 0.5, ~99 → 1). This lifts ranking
// on the NEXT fetch only; it never touches recency, so it cannot fake "just posted".
function normalizeSaves(savesCount: number): number {
  if (savesCount <= 0) return 0;
  return Math.min(Math.log10(savesCount + 1) / 2, 1);
}

function computeScore(
  row: {
    created_at: Date | string | null;
    bumped_at?: Date | string | null;
    saves_count?: number | null;
    views: number;
    clicks: number;
    has_video: boolean;
    is_verified: boolean | null;
    trust_score?: number | null;
    quality_score?: number | null;
    is_duplicate?: boolean | null;
  },
  weights: FeedWeights
): number {
  // Recycling (bump) refreshes a listing's EFFECTIVE recency without ever
  // changing created_at, so freshness keys off COALESCE(bumped_at, created_at).
  const freshness =
    weights.freshness * timeDécay(row.bumped_at ?? row.created_at ?? new Date());
  const engagement = weights.engagement * normalizeEngagement(row.views, row.clicks);
  const media = weights.media * (row.has_video ? 1 : 0);
  const verified = weights.verified * (row.is_verified ? 1 : 0);
  const trust = weights.trust * ((row.trust_score ?? 0) / 100);
  // Dealer quality acts as a ranking modifier; unscored dealers (null) are
  // treated as neutral (50) so they are neither boosted nor buried.
  const quality = weights.quality * ((row.quality_score ?? 50) / 100);
  // Engagement resurfacing: a modest, capped, log-scaled saves signal. Lifts
  // ranking on the next fetch only — never bumps recency (not gameable).
  const saves = weights.saves * normalizeSaves(row.saves_count ?? 0);
  const base = freshness + engagement + media + verified + trust + quality + saves;
  return row.is_duplicate ? base * DUPLICATE_PENALTY : base;
}

async function getActiveAds(limit: number, scope: SQL[] = []): Promise<FeedItem[]> {
  const adRows = await db
    .select({
      id: listings.id,
      title: listings.title,
      category: listings.category,
      base_price_cash: listings.basePriceCash,
      location: listings.location,
      status: listings.status,
      created_at: listings.createdAt,
      user_id: listings.userId,
      is_verified: users.isVerified,
      user_name: users.name,
      user_role: users.role,
      is_request: listings.isRequest,
    })
    .from(ads)
    .innerJoin(listings, eq(ads.listingId, listings.id))
    .leftJoin(users, eq(listings.userId, users.id))
    .leftJoin(listingAttributes, eq(listingAttributes.listingId, listings.id))
    .where(
      and(
        eq(ads.isActive, true),
        eq(listings.status, "active"),
        sql`${ads.expiresAt} > NOW()`,
        // Same section scope as the organic feed so a filtered section never
        // surfaces a sponsored listing from another category/subtype/engine.
        ...scope,
        ...publicVisibilityConditions()
      )
    )
    // Higher plan ranking weight surfaces first; randomize within equal tiers.
    // This only affects ads that pass the active + unexpired filter above, so
    // the weight is inherently time-bound to the boost window.
    .orderBy(sql`${ads.rankingWeight} DESC`, sql`RANDOM()`)
    .limit(limit);

  const enriched = await enrichListings(adRows);
  const items = transformFeedItems(enriched);
  return items.map((item) => ({ ...item, is_sponsored: true }));
}

function injectAds(feed: FeedItem[], adItems: FeedItem[], interval = 6): FeedItem[] {
  if (adItems.length === 0) return feed;
  const result: FeedItem[] = [];
  let adIndex = 0;

  for (let i = 0; i < feed.length; i++) {
    result.push(feed[i]);
    if ((i + 1) % interval === 0 && adIndex < adItems.length) {
      result.push(adItems[adIndex++]);
    }
  }
  return result;
}

export async function getFeed(options: {
  cursor?: string;
  limit?: number;
  category?: "car" | "real_estate" | "industrial";
  industrialTypes?: IndustrialSubtype[];
  condition?: string;
  paymentPlan?: PaymentPlan;
  propertyType?: string;
  finishingType?: string;
  compound?: boolean;
  furnished?: boolean;
  offerType?: string;
  rentalTerm?: string;
  fuelType?: string;
  transmission?: string;
  brand?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  industry?: string;
  originType?: string;
  marketCountry?: string;
  hasInstallment?: boolean;
  // Buyer request/wanted filter (undefined → both sales and requests).
  isRequest?: boolean;
  sessionId?: string;
  userId?: string;
}): Promise<{ items: FeedItem[]; cursor?: string; has_next: boolean }> {
  const { cursor, limit = 20, category, industrialTypes, sessionId } = options;

  // Section scope = category + industrial subtype(s) + engine filters. Built
  // once and shared by BOTH the organic query and the sponsored-ad query, so a
  // filtered section never surfaces inventory from another category (strict
  // section separation). Excludes status/cursor/visibility (added per-query).
  const scopeConditions: SQL[] = [];
  if (category) scopeConditions.push(eq(listings.category, category));
  // Industrial subtype filter (a single subtype or a whole group), backed by
  // the 1:1 listing_attributes sidecar — pushed into the DB so paginated group
  // browsing never false-empties. Only meaningful with category=industrial.
  if (industrialTypes && industrialTypes.length > 0)
    scopeConditions.push(inArray(listingAttributes.industrialType, industrialTypes));
  // Per-section engine filters — identical to search, so a chip filters the
  // Home feed in place and yields the same result set as the results screen.
  scopeConditions.push(
    ...buildAttributeConditions({
      condition: options.condition,
      payment_plan: options.paymentPlan,
      property_type: options.propertyType,
      finishing_type: options.finishingType,
      compound: options.compound,
      furnished: options.furnished,
      offer_type: options.offerType,
      rental_term: options.rentalTerm,
      fuel_type: options.fuelType,
      transmission: options.transmission,
      brand: options.brand,
      model: options.model,
      min_year: options.minYear,
      max_year: options.maxYear,
      industry: options.industry,
      origin_type: options.originType,
      market_country: options.marketCountry,
      has_installment: options.hasInstallment,
    })
  );

  const conditions: SQL[] = [eq(listings.status, "active"), ...scopeConditions];
  // Buyer request/wanted filter (undefined → both sales and requests).
  if (options.isRequest !== undefined)
    conditions.push(eq(listings.isRequest, options.isRequest));
  // Keyset cursor on the EFFECTIVE (bump-aware) recency timestamp so recycled
  // listings page consistently with the bump-aware ordering below.
  if (cursor)
    conditions.push(
      sql`COALESCE(${listings.bumpedAt}, ${listings.createdAt}) < ${new Date(cursor)}`
    );
  // Hide abuse-controlled inventory (flagged listings + shadow-banned sellers).
  conditions.push(...publicVisibilityConditions());

  const fetchLimit = Math.min((limit + 1) * 3, 150);

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      category: listings.category,
      base_price_cash: listings.basePriceCash,
      location: listings.location,
      status: listings.status,
      created_at: listings.createdAt,
      user_id: listings.userId,
      is_verified: users.isVerified,
      user_name: users.name,
      user_role: users.role,
      quality_score: users.qualityScore,
      trust_score: listings.trustScore,
      is_duplicate: listings.isDuplicate,
      industrial_type: listingAttributes.industrialType,
      // Origin (local / imported) — drives the "مستورد / Imported" card badge on
      // industrial + car listings, the key B2B / import-journey signal.
      origin_type: listingAttributes.originType,
      currency: sql<string | null>`${listingAttributes.specs}->>'currency'`,
      bumped_at: listings.bumpedAt,
      saves_count: listings.savesCount,
      is_request: listings.isRequest,
    })
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .leftJoin(listingAttributes, eq(listingAttributes.listingId, listings.id))
    .where(and(...conditions))
    // Bump-aware recency: recycled listings (bumped_at set) resurface to the top
    // of the candidate window; created_at is preserved, only the SORT is effective.
    .orderBy(desc(sql`COALESCE(${listings.bumpedAt}, ${listings.createdAt})`))
    .limit(fetchLimit);

  const enriched = await enrichListings(rows);

  // Score and sort
  const scored = enriched
    .map((row) => ({
      row,
      score: computeScore(row, DEFAULT_WEIGHTS),
    }))
    .sort((a, b) => b.score - a.score);

  const hasNext = scored.length > limit;
  const pageScored = scored.slice(0, limit);

  // Get sponsored ads (1 per 6 items)
  const adCount = Math.ceil(limit / 6);
  const adItems = await getActiveAds(adCount, scopeConditions).catch(() => []);

  // Transform to FeedItems
  const feedItems = transformFeedItems(pageScored.map((s) => s.row));

  // Inject ads
  const withAds = injectAds(feedItems, adItems, 6);

  // Adaptive re-ranking
  const adapted = adaptFeed(sessionId, withAds);

  const lastRow = pageScored[pageScored.length - 1];
  const nextCursor = hasNext && lastRow
    ? new Date(
        lastRow.row.bumped_at ?? lastRow.row.created_at ?? new Date()
      ).toISOString()
    : undefined;

  return { items: adapted, cursor: nextCursor, has_next: hasNext };
}
