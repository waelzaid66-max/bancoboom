import { db } from "@workspace/db";
import { listings, leadHistory, users } from "@workspace/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { MarketTrend } from "../validators/schemas";

type Category = "car" | "real_estate" | "industrial";
type Metric = "avg_price" | "listing_volume" | "demand" | "lead_volume";

const CATEGORIES: Category[] = ["car", "real_estate", "industrial"];
const METRICS: Metric[] = ["avg_price", "listing_volume", "demand", "lead_volume"];

const CATEGORY_LABEL: Record<Category, string> = {
  car: "Cars",
  real_estate: "Real Estate",
  industrial: "Industrial",
};

const WINDOW_DAYS = 30;
// Below this many samples in the current window we will NOT assert a direction —
// the trend is reported honestly as insufficient rather than inventing movement.
const MIN_SAMPLES = 5;

function dataQuality(sample: number): MarketTrend["data_quality"] {
  if (sample < MIN_SAMPLES) return "insufficient";
  if (sample >= 30) return "high";
  if (sample >= 10) return "medium";
  return "low";
}

function direction(
  current: number | null,
  previous: number | null,
  sample: number,
): MarketTrend["direction"] {
  if (sample < MIN_SAMPLES || current == null || previous == null || previous === 0) {
    return "insufficient";
  }
  const ratio = current / previous;
  if (ratio > 1.05) return "up";
  if (ratio < 0.95) return "down";
  return "stable";
}

function changePct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function changeDisplay(pct: number | null, dir: MarketTrend["direction"]): string {
  if (dir === "insufficient" || pct == null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function formatEgp(value: number | null): string | null {
  if (value == null) return null;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}M EGP`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString()}K EGP`;
  return `${Math.round(value).toLocaleString()} EGP`;
}

interface WindowAgg {
  count: number;
  avgPrice: number | null;
  leadCount: number;
}

// One round-trip per window: listing count + avg price (current-window listings)
// and the lead count whose parent listing is in the category. All time-bounded
// by createdAt so the figures are genuinely period-over-period.
async function aggregateWindow(
  category: Category,
  from: Date,
  to: Date,
): Promise<WindowAgg> {
  const [listingAgg] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      avg_price: sql<number | null>`AVG(${listings.basePriceCash})`,
    })
    .from(listings)
    .leftJoin(users, eq(listings.userId, users.id))
    .where(
      and(
        eq(listings.category, category),
        gte(listings.createdAt, from),
        lt(listings.createdAt, to),
        sql`${listings.isFlagged} IS NOT TRUE`,
        sql`${users.isShadowBanned} IS NOT TRUE`,
      ),
    );

  const [leadAgg] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(leadHistory)
    .leftJoin(listings, eq(leadHistory.listingId, listings.id))
    .leftJoin(users, eq(listings.userId, users.id))
    .where(
      and(
        eq(listings.category, category),
        gte(leadHistory.createdAt, from),
        lt(leadHistory.createdAt, to),
        // Abuse-control parity with the listing aggregate: never count leads on
        // flagged listings or listings from shadow-banned sellers.
        sql`${listings.isFlagged} IS NOT TRUE`,
        sql`${users.isShadowBanned} IS NOT TRUE`,
      ),
    );

  return {
    count: Number(listingAgg?.count ?? 0),
    avgPrice: listingAgg?.avg_price != null ? Number(listingAgg.avg_price) : null,
    leadCount: Number(leadAgg?.count ?? 0),
  };
}

function buildTrend(
  category: Category,
  metric: Metric,
  cur: WindowAgg,
  prev: WindowAgg,
): MarketTrend {
  const periodLabel = `Last ${WINDOW_DAYS} days vs previous ${WINDOW_DAYS} days`;
  const base = {
    segment: category,
    segment_label: CATEGORY_LABEL[category],
    metric,
    period_label: periodLabel,
  };

  let current: number | null;
  let previous: number | null;
  let sample: number;
  let currentValueDisplay: string | null;

  switch (metric) {
    case "avg_price":
      current = cur.avgPrice;
      previous = prev.avgPrice;
      sample = cur.count;
      currentValueDisplay = formatEgp(cur.avgPrice);
      break;
    case "listing_volume":
      current = cur.count;
      previous = prev.count;
      sample = cur.count;
      currentValueDisplay = `${cur.count.toLocaleString()}`;
      break;
    case "lead_volume":
      current = cur.leadCount;
      previous = prev.leadCount;
      sample = cur.leadCount;
      currentValueDisplay = `${cur.leadCount.toLocaleString()}`;
      break;
    case "demand": {
      // demand index = leads per listing in the window (engagement intensity).
      current = cur.count > 0 ? cur.leadCount / cur.count : null;
      previous = prev.count > 0 ? prev.leadCount / prev.count : null;
      sample = cur.leadCount;
      currentValueDisplay = current != null ? `${(Math.round(current * 100) / 100).toString()}` : null;
      break;
    }
  }

  const dir = direction(current, previous, sample);
  const pct = changePct(current, previous);

  return {
    ...base,
    direction: dir,
    change_pct: dir === "insufficient" ? null : pct,
    change_display: changeDisplay(pct, dir),
    current_value_display: currentValueDisplay,
    sample_size: sample,
    data_quality: dataQuality(sample),
  };
}

/**
 * LIVE market trends computed from real listings + leads, period-over-period.
 * No figure is invented: when the current window is below MIN_SAMPLES the trend
 * reports direction "insufficient" and data_quality "insufficient".
 */
export async function getMarketTrends(filters: {
  category?: Category;
  metric?: Metric;
}): Promise<{ trends: MarketTrend[]; period_label: string; generated_at: string }> {
  const now = new Date();
  const curFrom = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const prevFrom = new Date(now.getTime() - 2 * WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const categories = filters.category ? [filters.category] : CATEGORIES;
  const metrics = filters.metric ? [filters.metric] : METRICS;

  const trends: MarketTrend[] = [];
  for (const category of categories) {
    const [cur, prev] = await Promise.all([
      aggregateWindow(category, curFrom, now),
      aggregateWindow(category, prevFrom, curFrom),
    ]);
    for (const metric of metrics) {
      trends.push(buildTrend(category, metric, cur, prev));
    }
  }

  return {
    trends,
    period_label: `Last ${WINDOW_DAYS} days vs previous ${WINDOW_DAYS} days`,
    generated_at: now.toISOString(),
  };
}
