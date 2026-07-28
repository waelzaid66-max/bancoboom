import type { FeedItem } from "../validators/schemas";

export interface SessionState {
  session_id: string;
  last_category?: "car" | "real_estate" | "industrial";
  price_range?: { min: number; max: number };
  scroll_depth: number;
  clicks: number;
  time_spent_ms: number;
  last_action?: string;
  category_counts: Record<string, number>;
  price_samples: number[];
  last_accessed_at: number;
}

const sessionStore = new Map<string, SessionState>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_MAX_SIZE = 5000;

/**
 * True only if the server has already observed this session (created via feed
 * browsing / behavior signals) and it has not expired. Used by abuse control to
 * reject impressions carrying fabricated session ids — a real client always has
 * server-side session state before an ad can be shown to it.
 */
export function hasSession(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  if (!session) return false;
  if (Date.now() - session.last_accessed_at > SESSION_TTL_MS) {
    sessionStore.delete(sessionId);
    return false;
  }
  return true;
}

export function getOrCreateSession(sessionId: string): SessionState {
  let session = sessionStore.get(sessionId);
  if (!session) {
    // Enforce hard cap: evict oldest entry before inserting a new one
    if (sessionStore.size >= SESSION_MAX_SIZE) {
      const oldestKey = sessionStore.keys().next().value;
      if (oldestKey !== undefined) sessionStore.delete(oldestKey);
    }
    session = {
      session_id: sessionId,
      scroll_depth: 0,
      clicks: 0,
      time_spent_ms: 0,
      category_counts: {},
      price_samples: [],
      last_accessed_at: Date.now(),
    };
    sessionStore.set(sessionId, session);
  } else {
    session.last_accessed_at = Date.now();
  }
  return session;
}

export function updateSession(
  sessionId: string,
  action: string,
  data?: { category?: string; price?: number }
) {
  const session = getOrCreateSession(sessionId);

  session.last_action = action;

  if (action === "click" || action === "open_detail") {
    session.clicks++;
  }
  // B-reactions: "interested" is a deliberate positive — counts as a click AND
  // gets the generic category bump below. "angry" is a deliberate rejection —
  // pull the category's affinity down (net -1 after the generic +1, floor 0).
  if (action === "interested") {
    session.clicks++;
  }
  if (action === "angry" && data?.category) {
    session.category_counts[data.category] = Math.max(
      0,
      (session.category_counts[data.category] ?? 0) - 2,
    );
  }
  if (action === "scroll_fast") {
    session.scroll_depth += 5;
  }
  if (action === "scroll_slow") {
    session.scroll_depth += 1;
  }
  if (data?.category) {
    session.category_counts[data.category] = (session.category_counts[data.category] ?? 0) + 1;
    const top = Object.entries(session.category_counts).sort((a, b) => b[1] - a[1])[0];
    if (top) session.last_category = top[0] as SessionState["last_category"];
  }
  if (data?.price) {
    session.price_samples.push(data.price);
    if (session.price_samples.length > 20) session.price_samples.shift();
    const avg = session.price_samples.reduce((a, b) => a + b, 0) / session.price_samples.length;
    session.price_range = { min: avg * 0.6, max: avg * 1.4 };
  }

  sessionStore.set(sessionId, session);
}

function cleanupSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessionStore) {
    if (session.last_accessed_at < cutoff) {
      sessionStore.delete(id);
    }
  }
}

// Run TTL eviction every 5 minutes regardless of request traffic
setInterval(cleanupSessions, 5 * 60 * 1000).unref();

/**
 * Re-weights feed items based on session signals.
 * Must run < 10ms — pure in-memory, no I/O.
 */
export function adaptFeed(sessionId: string | undefined, feed: FeedItem[]): FeedItem[] {
  if (!sessionId) return feed;

  const start = Date.now();
  const session = sessionStore.get(sessionId);
  if (!session) return feed;

  const scored = feed.map((item) => {
    let boost = 0;

    // Price range boost
    if (session.price_range) {
      const rawPrice = parseFloat(item.price_display.replace(/[^0-9.]/g, "")) * 1000;
      if (rawPrice >= session.price_range.min && rawPrice <= session.price_range.max) {
        boost += 2;
      }
    }

    // Engagement boost: sponsored + verified for low-engagement users
    if (session.scroll_depth > 20 && session.clicks === 0) {
      if (item.is_sponsored) boost += 1;
      if (item.trust_signal.includes("Verified")) boost += 1;
    }

    // After a click: boost items matching session's preferred price tier
    if (session.last_action === "open_detail" && session.last_category && session.price_range) {
      const rawPrice = parseFloat(item.price_display.replace(/[^0-9.]/g, "")) * 1000;
      if (rawPrice >= session.price_range.min && rawPrice <= session.price_range.max) {
        boost += 4;
      }
    }

    return { item, boost };
  });

  // Stable sort (preserve relative order for equal boosts)
  scored.sort((a, b) => b.boost - a.boost);

  const duration = Date.now() - start;
  if (duration > 10) {
    console.warn(`[AdaptiveFeed] Took ${duration}ms (target <10ms)`);
  }

  return scored.map((s) => s.item);
}
