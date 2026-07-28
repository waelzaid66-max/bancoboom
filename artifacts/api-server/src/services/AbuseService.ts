import { db } from "@workspace/db";
import { auditLog, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { auditLogger } from "../lib/logger";
import { SlidingWindowCounter, DedupStore } from "../lib/slidingWindow";
import { hasSession } from "./AdaptiveFeedEngine";

/**
 * AbuseService — the revenue-protection / abuse-control layer that sits above
 * the low-level DoS hardening (rate-limit middleware, circuit breakers).
 *
 * It decides whether a money-path action (a lead/click, an ad impression, a
 * listing publish) is legitimate, and records every blocked or suspicious
 * event to the durable `audit_log` table (mirrored to the `audit` log channel)
 * for the Admin Control Center to consume later.
 *
 * The sliding-window/dedup detectors are now DURABLE (Postgres-backed via
 * `../lib/slidingWindow`): their budgets survive a restart/redeploy and are
 * shared across instances, so an abuser can no longer reset a limit by forcing
 * a crash. Because the primitives touch the DB, every check is async.
 *
 * Failure policy when the durable store is unavailable:
 *  - money / billable paths (leads, impressions) FAIL CLOSED — a counter outage
 *    must never be exploitable to wave through fraudulent demand that bills a
 *    dealer.
 *  - user-convenience caps (listing/message/comment/profile rate) FAIL OPEN —
 *    a transient counter outage should not block legitimate users; the lapse is
 *    logged for review.
 */

type AuditEvent =
  | "blocked_lead"
  | "suspicious_click"
  | "invalid_impression"
  | "flagged_listing"
  | "price_outlier"
  | "spam_content"
  | "rate_limit_exceeded"
  | "shadow_ban"
  | "admin_action";

type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEntry {
  eventType: AuditEvent;
  severity?: AuditSeverity;
  actorUserId?: string | null;
  subjectUserId?: string | null;
  listingId?: string | null;
  adId?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/* ── Tunables ──────────────────────────────────────────── */

const LEAD_DEDUP_MS = 60_000; // identical buyer→listing lead within 60s is a dup
const LEAD_REPEAT_WINDOW_MS = 10 * 60_000; // window for "repeated same-user clicks"
const MAX_LEAD_REPEATS = 5; // same buyer → same listing within the repeat window
const MAX_LEADS_PER_MINUTE = 10; // per-user lead rate cap
const IP_CLICK_WINDOW_MS = 10_000; // bot-burst detection window
const MAX_IP_CLICK_BURST = 15; // clicks/IP within the burst window
// Per-listing aggregate intake cap: limits total leads a listing can accept per
// hour from ALL callers combined. This is the primary defence against
// multi-account / rotated-IP coordinated CPL-drain attacks, where per-user or
// per-IP limits are insufficient — a listing cannot become a target for
// arbitrarily many synthetic leads regardless of how many accounts are involved.
const MAX_LEADS_PER_LISTING_PER_HOUR = 60;

const IMPRESSION_DEDUP_MS = 30_000; // one billable impression per session→ad / 30s
const IMPRESSION_WINDOW_MS = 60_000;
const MAX_IMPRESSIONS_PER_WINDOW = 60; // per session
const IP_IMPRESSION_WINDOW_MS = 60_000;
const MAX_BILLABLE_IMPRESSIONS_PER_IP = 30; // hard cap so session rotation from one IP can't drain budget

const MAX_LISTINGS_PER_HOUR = 20; // per-user listing publish cap
const MAX_PROFILE_MUTATIONS_PER_HOUR = 30; // per-user profile-mutation cap
const MAX_MESSAGES_PER_MINUTE = 20; // per-user direct-message send cap (anti-spam)
const MAX_COMMENTS_PER_HOUR = 40; // per-user listing comment/Q&A cap (anti-spam)
// Report flood / queue-poisoning cap: limits how many open reports a single
// user can file per hour. Without this, any authenticated user could bury the
// moderation queue with synthetic reports, disrupting admin triage.
const MAX_REPORTS_PER_USER_PER_HOUR = 10;
// Conversation-creation cap: limits how many new threads a user can open per
// hour. Prevents bulk conversation spam to sellers while preserving the
// conversation service's listing-visibility gate (the real auth boundary).
const MAX_NEW_CONVERSATIONS_PER_HOUR = 20;

const SUSPICION_WINDOW_MS = 60 * 60_000; // 1h rolling suspicion budget
const SUSPICION_BAN_THRESHOLD = 25; // events before auto shadow-ban

/* ── Durable detectors ─────────────────────────────────── */
// The first constructor argument is a STABLE namespace persisted as
// `counter_name` / `store_name`; do not rename it without a data migration, or
// the counter will appear to reset.

const leadDedup = new DedupStore("lead_dedup", LEAD_DEDUP_MS);
const leadRepeat = new SlidingWindowCounter("lead_repeat", LEAD_REPEAT_WINDOW_MS);
const leadRate = new SlidingWindowCounter("lead_rate", 60_000);
const listingLeadRate = new SlidingWindowCounter("listing_lead_rate", 60 * 60_000);
const ipClicks = new SlidingWindowCounter("ip_clicks", IP_CLICK_WINDOW_MS);

const impressionDedup = new DedupStore("impression_dedup", IMPRESSION_DEDUP_MS);
const impressionRate = new SlidingWindowCounter("impression_rate", IMPRESSION_WINDOW_MS);
const ipBillableImpressions = new SlidingWindowCounter("ip_billable_impressions", IP_IMPRESSION_WINDOW_MS);

const listingRate = new SlidingWindowCounter("listing_rate", 60 * 60_000);
const profileMutationRate = new SlidingWindowCounter("profile_mutation_rate", 60 * 60_000);
const messageRate = new SlidingWindowCounter("message_rate", 60_000);
const commentRate = new SlidingWindowCounter("comment_rate", 60 * 60_000);
const reportRate = new SlidingWindowCounter("report_rate", 60 * 60_000);
const conversationRate = new SlidingWindowCounter("conversation_rate", 60 * 60_000);

const suspicion = new SlidingWindowCounter("suspicion", SUSPICION_WINDOW_MS);
// Users auto-banned recently, to avoid hammering the DB with repeat bans.
const recentlyBanned = new DedupStore("recently_banned", SUSPICION_WINDOW_MS);

/* ── Audit trail ───────────────────────────────────────── */

/**
 * Records an abuse/revenue-protection event. Fire-and-forget: it never blocks
 * or throws into the caller's request path. Always mirrors to the durable
 * `audit` log channel first so the trail survives even if the DB write fails.
 */
export function writeAudit(entry: AuditEntry): void {
  const severity = entry.severity ?? "warning";
  auditLogger.info(
    {
      event: entry.eventType,
      severity,
      actor_user_id: entry.actorUserId ?? null,
      subject_user_id: entry.subjectUserId ?? null,
      listing_id: entry.listingId ?? null,
      ad_id: entry.adId ?? null,
      ip: entry.ip ?? null,
      device_id: entry.deviceId ?? null,
      reason: entry.reason ?? null,
      ...entry.metadata,
    },
    `audit:${entry.eventType}`,
  );

  setImmediate(async () => {
    try {
      await db.insert(auditLog).values({
        eventType: entry.eventType,
        severity,
        actorUserId: entry.actorUserId ?? null,
        subjectUserId: entry.subjectUserId ?? null,
        listingId: entry.listingId ?? null,
        adId: entry.adId ?? null,
        ip: entry.ip ?? null,
        deviceId: entry.deviceId ?? null,
        reason: entry.reason ?? null,
        metadata: entry.metadata ?? null,
      });
    } catch (err) {
      auditLogger.error({ err, event: entry.eventType }, "Failed to persist audit_log entry");
    }
  });
}

/* ── Listing abuse audit ───────────────────────────────── */

/**
 * Records a durable audit trail when a listing is flagged/demoted by the
 * normalization pipeline (spam keywords or price outlier). Emits a specific
 * event type (`spam_content` / `price_outlier`) plus a `flagged_listing`
 * marker so admin/analytics workflows can find every flagged listing in one
 * place. Suspicion is escalated for spam (it indicates intent) but not for a
 * lone price outlier, which is frequently legitimate.
 */
export async function auditListingFlag(params: {
  listingId: string;
  sellerId: string;
  isFlagged: boolean;
  flagReason: string | null;
  spamFlags: string[];
  isPriceOutlier: boolean;
  ip?: string;
}): Promise<void> {
  const { listingId, sellerId, isFlagged, flagReason, spamFlags, isPriceOutlier, ip } = params;
  if (!isFlagged && !isPriceOutlier) return;

  const eventType: AuditEvent = isFlagged ? "spam_content" : "price_outlier";
  writeAudit({
    eventType,
    severity: isFlagged ? "warning" : "info",
    subjectUserId: sellerId,
    listingId,
    ip,
    reason: flagReason ?? eventType,
    metadata: { spam_flags: spamFlags, is_price_outlier: isPriceOutlier },
  });

  // A unified marker so every flagged/demoted listing is discoverable via one event type.
  writeAudit({
    eventType: "flagged_listing",
    severity: isFlagged ? "warning" : "info",
    subjectUserId: sellerId,
    listingId,
    ip,
    reason: flagReason ?? (isPriceOutlier ? "price_outlier" : "flagged"),
  });

  if (isFlagged) {
    await escalate(sellerId, { ip, reason: "spam_content" });
  }
}

/* ── Suspicion escalation → automatic shadow ban ───────── */

/**
 * Increments a user's rolling suspicion budget. Once it crosses the threshold
 * the user is automatically shadow-banned (their listings silently disappear
 * from the public feed). Only known (db) users are escalated; anonymous abuse
 * is contained by the per-IP detectors instead. Best-effort: it swallows its
 * own errors so it never breaks the caller's decision, but callers `await` it
 * on blocked/suspicious paths so the durable suspicion increment is committed
 * before the request returns.
 */
async function escalate(
  subjectUserId: string | null | undefined,
  ctx: { ip?: string; deviceId?: string; reason: string },
): Promise<void> {
  if (!subjectUserId) return;
  try {
    const score = await suspicion.hit(subjectUserId);
    if (score >= SUSPICION_BAN_THRESHOLD && !(await recentlyBanned.isDuplicate(subjectUserId))) {
      await setShadowBan(subjectUserId, true, `auto: ${ctx.reason} (suspicion=${score})`, {
        ip: ctx.ip,
        deviceId: ctx.deviceId,
      });
    }
  } catch (err) {
    auditLogger.error({ err, subject_user_id: subjectUserId }, "Failed to escalate suspicion");
  }
}

/**
 * Sets (or clears) a user's shadow-ban flag and records it to the audit trail.
 * Shadow-banned users are never notified; their listings are filtered out of
 * the public feed/search by the read paths.
 */
export async function setShadowBan(
  userId: string,
  banned: boolean,
  reason: string,
  ctx?: { actorUserId?: string | null; ip?: string; deviceId?: string },
): Promise<void> {
  try {
    await db.update(users).set({ isShadowBanned: banned }).where(eq(users.id, userId));
    writeAudit({
      eventType: "shadow_ban",
      severity: banned ? "critical" : "info",
      actorUserId: ctx?.actorUserId ?? null,
      subjectUserId: userId,
      ip: ctx?.ip ?? null,
      deviceId: ctx?.deviceId ?? null,
      reason,
      metadata: { banned },
    });
  } catch (err) {
    auditLogger.error({ err, user_id: userId }, "Failed to set shadow ban");
  }
}

/* ── Lead / click validation ───────────────────────────── */

export interface LeadContext {
  listingId: string;
  sellerId: string;
  /** Resolved db user id of the buyer, when authenticated. */
  buyerId?: string | null;
  ip?: string;
  deviceId?: string;
}

export interface AbuseDecision {
  ok: boolean;
  reason?: string;
}

/**
 * Decides whether a lead/click is legitimate and should therefore be recorded
 * and (later) charged to the dealer. Blocks: per-user lead-rate bursts,
 * duplicate clicks within 60s, repeated same-user clicks on the same listing,
 * and bot-like per-IP click bursts. Blocked attempts are audited so the dealer
 * is never charged for fraudulent demand — without notifying the abuser.
 *
 * Fails CLOSED if the durable counters are unavailable (money path).
 */
export async function validateLead(ctx: LeadContext): Promise<AbuseDecision> {
  const actorKey = ctx.buyerId ?? ctx.deviceId ?? ctx.ip ?? "anon";

  const block = async (reason: string, severity: AuditSeverity = "warning"): Promise<AbuseDecision> => {
    writeAudit({
      eventType: "blocked_lead",
      severity,
      actorUserId: ctx.buyerId ?? null,
      subjectUserId: ctx.sellerId,
      listingId: ctx.listingId,
      ip: ctx.ip ?? null,
      deviceId: ctx.deviceId ?? null,
      reason,
    });
    await escalate(ctx.buyerId, { ip: ctx.ip, deviceId: ctx.deviceId, reason });
    return { ok: false, reason };
  };

  try {
    // Per-user lead rate cap.
    if ((await leadRate.hit(actorKey)) > MAX_LEADS_PER_MINUTE) {
      return await block("lead_rate_exceeded");
    }

    // Per-listing aggregate intake cap (multi-account / coordinated CPL-drain
    // defence). Per-buyer limits alone cannot stop an attacker who rotates
    // accounts or IPs; capping total intake per listing per hour ensures even a
    // distributed attack cannot drain the seller's full CPL budget.
    if ((await listingLeadRate.hit(ctx.listingId)) > MAX_LEADS_PER_LISTING_PER_HOUR) {
      return await block("listing_lead_intake_exceeded");
    }

    // Bot-like per-IP click burst (also serves as click-fraud detection).
    if (ctx.ip && (await ipClicks.hit(ctx.ip)) > MAX_IP_CLICK_BURST) {
      return await block("bot_click_burst", "critical");
    }

    // Duplicate identical lead within 60s.
    if (await leadDedup.isDuplicate(`${actorKey}:${ctx.listingId}`)) {
      return await block("duplicate_within_60s");
    }

    // Repeated same-user clicks on the same listing.
    if ((await leadRepeat.hit(`${actorKey}:${ctx.listingId}`)) > MAX_LEAD_REPEATS) {
      return await block("repeated_clicks");
    }

    return { ok: true };
  } catch (err) {
    auditLogger.error(
      { err, listing_id: ctx.listingId },
      "Lead validation counters unavailable — failing closed",
    );
    return { ok: false, reason: "validation_unavailable" };
  }
}

/* ── Ad impression validation ──────────────────────────── */

export interface ImpressionContext {
  adId: string;
  sellerId?: string | null;
  /** Required marker of a real, valid client session. */
  sessionId?: string;
  userId?: string | null;
  ip?: string;
  deviceId?: string;
}

/**
 * Decides whether an ad impression is billable. Only impressions from a real
 * client with a valid session count against budget; missing-session traffic,
 * rapid duplicate impressions, and per-session/IP bursts are dropped (and
 * audited) so bots cannot drain a dealer's ad budget.
 *
 * Fails CLOSED if the durable counters are unavailable (billable path).
 */
export async function validateImpression(ctx: ImpressionContext): Promise<AbuseDecision> {
  const drop = (reason: string): AbuseDecision => {
    writeAudit({
      eventType: "invalid_impression",
      severity: "info",
      actorUserId: ctx.userId ?? null,
      subjectUserId: ctx.sellerId ?? null,
      adId: ctx.adId,
      ip: ctx.ip ?? null,
      deviceId: ctx.deviceId ?? null,
      reason,
    });
    return { ok: false, reason };
  };

  // Every billable impression — authenticated or not — must carry a session the
  // server created during real browsing (populated via feed / behavior signals).
  // Authenticated users are NOT exempt: an attacker with valid credentials could
  // otherwise pass fabricated session ids and drain a dealer's budget within the
  // per-IP cap window. Requiring hasSession for everyone closes that bypass.
  if (!ctx.sessionId) return drop("missing_session");
  if (!hasSession(ctx.sessionId)) return drop("unverified_session");

  try {
    // Anti-fraud keys: dedup/burst per session, PLUS a hard per-IP billable cap
    // so an attacker can't bypass the per-session limits by rotating session ids.
    const subjectKey = ctx.sessionId;
    if ((await impressionRate.hit(subjectKey)) > MAX_IMPRESSIONS_PER_WINDOW) return drop("impression_burst");
    if (await impressionDedup.isDuplicate(`${subjectKey}:${ctx.adId}`)) return drop("duplicate_impression");
    if (ctx.ip && (await ipBillableImpressions.hit(ctx.ip)) > MAX_BILLABLE_IMPRESSIONS_PER_IP) {
      return drop("ip_impression_cap");
    }

    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, ad_id: ctx.adId }, "Impression validation counters unavailable — failing closed");
    return drop("validation_unavailable");
  }
}

/* ── Per-user publish rate limit ───────────────────────── */

/**
 * Enforces the max-listings-per-hour cap for a single user. Returns a decision;
 * the caller turns a block into a 429. Hitting the cap is audited. Fails OPEN if
 * the durable counter is unavailable (user-convenience cap).
 */
export async function checkListingRate(ctx: { userId: string; ip?: string }): Promise<AbuseDecision> {
  try {
    if ((await listingRate.hit(ctx.userId)) > MAX_LISTINGS_PER_HOUR) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        ip: ctx.ip ?? null,
        reason: "listings_per_hour_exceeded",
        metadata: { limit: MAX_LISTINGS_PER_HOUR },
      });
      await escalate(ctx.userId, { ip: ctx.ip, reason: "listings_per_hour_exceeded" });
      return { ok: false, reason: "listings_per_hour_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.userId }, "Listing rate counter unavailable — failing open");
    return { ok: true };
  }
}

/* ── Direct-message / comment spam limits ──────────────── */

/**
 * Enforces the max-messages-per-minute cap for a single user. Returns a
 * decision; the caller turns a block into a 429. Hitting the cap is audited and
 * escalates suspicion (message spam is a strong intent signal). Fails OPEN if
 * the durable counter is unavailable (user-convenience cap).
 */
export async function checkMessageRate(ctx: { userId: string; ip?: string }): Promise<AbuseDecision> {
  try {
    if ((await messageRate.hit(ctx.userId)) > MAX_MESSAGES_PER_MINUTE) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        ip: ctx.ip ?? null,
        reason: "messages_per_minute_exceeded",
        metadata: { limit: MAX_MESSAGES_PER_MINUTE },
      });
      await escalate(ctx.userId, { ip: ctx.ip, reason: "messages_per_minute_exceeded" });
      return { ok: false, reason: "messages_per_minute_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.userId }, "Message rate counter unavailable — failing open");
    return { ok: true };
  }
}

/**
 * Enforces the max-comments-per-hour cap for a single user (listing Q&A
 * anti-spam). Returns a decision; the caller turns a block into a 429. Hitting
 * the cap is audited and escalates suspicion. Fails OPEN if the durable counter
 * is unavailable (user-convenience cap).
 */
export async function checkCommentRate(ctx: { userId: string; ip?: string }): Promise<AbuseDecision> {
  try {
    if ((await commentRate.hit(ctx.userId)) > MAX_COMMENTS_PER_HOUR) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        ip: ctx.ip ?? null,
        reason: "comments_per_hour_exceeded",
        metadata: { limit: MAX_COMMENTS_PER_HOUR },
      });
      await escalate(ctx.userId, { ip: ctx.ip, reason: "comments_per_hour_exceeded" });
      return { ok: false, reason: "comments_per_hour_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.userId }, "Comment rate counter unavailable — failing open");
    return { ok: true };
  }
}

/* ── Profile-mutation abuse ────────────────────────────── */

/**
 * Enforces the max-profile-mutations-per-hour cap for a single user (anti-abuse
 * for rapid re-edits / scripted profile churn). Returns a decision; the caller
 * turns a block into a 429. Hitting the cap is audited and escalates suspicion.
 * Fails OPEN if the durable counter is unavailable (user-convenience cap).
 */
export async function checkProfileMutationRate(ctx: { userId: string; ip?: string }): Promise<AbuseDecision> {
  try {
    if ((await profileMutationRate.hit(ctx.userId)) > MAX_PROFILE_MUTATIONS_PER_HOUR) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        ip: ctx.ip ?? null,
        reason: "profile_mutations_per_hour_exceeded",
        metadata: { limit: MAX_PROFILE_MUTATIONS_PER_HOUR },
      });
      await escalate(ctx.userId, { ip: ctx.ip, reason: "profile_mutations_per_hour_exceeded" });
      return { ok: false, reason: "profile_mutations_per_hour_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.userId }, "Profile mutation rate counter unavailable — failing open");
    return { ok: true };
  }
}

/**
 * Enforces the per-user report-submission cap (anti-queue-poisoning). Returns a
 * decision; the caller converts a block into a 429. A single authenticated user
 * filing more than MAX_REPORTS_PER_USER_PER_HOUR reports within the window is
 * treated as a moderation-queue flooding attempt — the excess is silently dropped
 * and audited. Fails OPEN if the durable counter is unavailable (user-convenience
 * cap — blocking legitimate reporters on a counter outage is worse).
 */
export async function validateReport(ctx: {
  reporterUserId: string;
  listingId: string;
  ip?: string;
}): Promise<AbuseDecision> {
  try {
    if ((await reportRate.hit(ctx.reporterUserId)) > MAX_REPORTS_PER_USER_PER_HOUR) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.reporterUserId,
        listingId: ctx.listingId,
        ip: ctx.ip ?? null,
        reason: "reports_per_hour_exceeded",
        metadata: { limit: MAX_REPORTS_PER_USER_PER_HOUR },
      });
      await escalate(ctx.reporterUserId, { ip: ctx.ip, reason: "reports_per_hour_exceeded" });
      return { ok: false, reason: "reports_per_hour_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.reporterUserId }, "Report rate counter unavailable — failing open");
    return { ok: true };
  }
}

/**
 * Enforces the per-user conversation-creation cap. Returns a decision; the
 * caller converts a block into a 429. Prevents bulk conversation spam directed
 * at sellers (a side-channel harassment vector). Fails OPEN on counter outage
 * (user-convenience cap — the listing-visibility gate is the real auth boundary).
 */
export async function checkConversationRate(ctx: {
  userId: string;
  ip?: string;
}): Promise<AbuseDecision> {
  try {
    if ((await conversationRate.hit(ctx.userId)) > MAX_NEW_CONVERSATIONS_PER_HOUR) {
      writeAudit({
        eventType: "rate_limit_exceeded",
        severity: "warning",
        actorUserId: ctx.userId,
        ip: ctx.ip ?? null,
        reason: "conversations_per_hour_exceeded",
        metadata: { limit: MAX_NEW_CONVERSATIONS_PER_HOUR },
      });
      await escalate(ctx.userId, { ip: ctx.ip, reason: "conversations_per_hour_exceeded" });
      return { ok: false, reason: "conversations_per_hour_exceeded" };
    }
    return { ok: true };
  } catch (err) {
    auditLogger.error({ err, user_id: ctx.userId }, "Conversation rate counter unavailable — failing open");
    return { ok: true };
  }
}

/**
 * Duplicate-account signal: a user tried to attach a phone already linked to
 * another active account — a strong multi-account / sock-puppet indicator.
 * Escalates suspicion (feeding the auto shadow-ban) and tells the caller to
 * block the mutation. The suspicion/shadow-ban path is the durable trail, so
 * no new audit event type is introduced here.
 */
export async function flagDuplicateAccount(ctx: {
  userId: string;
  otherUserId: string;
  ip?: string;
}): Promise<AbuseDecision> {
  auditLogger.warn(
    { actor_user_id: ctx.userId, subject_user_id: ctx.otherUserId, reason: "duplicate_account_phone" },
    "audit:duplicate_account",
  );
  await escalate(ctx.userId, { ip: ctx.ip, reason: "duplicate_account_phone" });
  return { ok: false, reason: "duplicate_account_phone" };
}
