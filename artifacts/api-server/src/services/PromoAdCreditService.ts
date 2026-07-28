import { db } from "@workspace/db";
import {
  users,
  promoAdTransactions,
  promoAdGrants,
  promoAdCampaignConfig,
} from "@workspace/db/schema";
import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { withAdvisoryLock } from "../lib/advisoryLock";
import { logger } from "../lib/logger";
import { invalidData } from "../lib/billing";

/** The transaction handle passed to a `db.transaction(async (tx) => …)` body. */
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Promo ad credit — a SEPARATE virtual ad-only allowance that is auto-granted
 * monthly to every user, tiered by verification, and is use-it-or-lose-it.
 *
 * Hard boundaries (why this service exists):
 *  - It is the ONLY writer of `users.promo_ad_balance`. That column always
 *    equals SUM(promo_ad_transactions.amount) for the user — the signed-delta
 *    ledger mirrors the balance exactly, just like the real wallet does.
 *  - Promo credit is NOT money: it never touches `transactions`, the wallet
 *    balance, invoices, or settlement. It can only be spent on a boost, and is
 *    always consumed BEFORE the real wallet.
 *  - Config lives in a singleton row (DB-first with code defaults), mirroring
 *    PaymentConfigService. Admins edit amounts/duration/enabled and can renew
 *    the campaign (which bumps campaign_version and resets balances).
 */

/* ── constants & helpers ───────────────────────────────── */

export const SINGLETON_ID = "singleton";
// Distinct advisory-lock key (see jobs/index.ts for the others). The monthly
// grant cycle AND admin renew share this key so they can never run together.
export const PROMO_AD_CREDIT_LOCK_KEY = 48150006;
const TIMEZONE = process.env.CRON_TIMEZONE ?? "Africa/Cairo";
const CHUNK = 500;
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

const DEFAULTS = {
  enabled: false,
  verifiedMonthlyAmount: "10000.00",
  unverifiedMonthlyAmount: "5000.00",
  durationMonths: 4,
  campaignVersion: 1,
};

/** Format a number as a 2-dp EGP string (handles negatives for debits). */
function money(n: number): string {
  return n.toFixed(2);
}

/** Calendar year/month (1-12) of an instant, read in the campaign timezone. */
function tzYearMonth(d: Date): { y: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  return { y, m };
}

/** Whole calendar months elapsed (in TIMEZONE) from `startsAt` to `now`. */
export function monthIndexFrom(startsAt: Date, now: Date): number {
  const s = tzYearMonth(startsAt);
  const n = tzYearMonth(now);
  return n.y * 12 + (n.m - 1) - (s.y * 12 + (s.m - 1));
}

/** Offset (minutes) between TIMEZONE wall-clock and UTC at instant `d`. */
function tzOffsetMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const asUTC = Date.UTC(
    +m.year,
    +m.month - 1,
    +m.day,
    +m.hour,
    +m.minute,
    +m.second,
  );
  return Math.round((asUTC - d.getTime()) / 60000);
}

/**
 * Instant at which the NEXT calendar month begins in TIMEZONE — the
 * use-it-or-lose-it expiry for a grant made during the current month.
 */
export function startOfNextMonth(now: Date): Date {
  const { y, m } = tzYearMonth(now); // m is 1-12
  let ny = y;
  let nm = m + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  // Convert the TIMEZONE wall-clock (1st, 00:00:00) to a UTC instant by
  // adjusting for the offset that TIMEZONE has at that moment.
  const utcGuess = Date.UTC(ny, nm - 1, 1, 0, 0, 0);
  const offsetMin = tzOffsetMinutes(new Date(utcGuess));
  return new Date(utcGuess - offsetMin * 60000);
}

/** Append a signed-delta row to the promo ledger (mirrors the balance change). */
async function writePromoLedger(
  tx: DbTx,
  input: {
    userId: string;
    type: "grant" | "consume" | "expire" | "reset";
    amount: string; // signed
    balanceAfter: string;
    campaignVersion: number;
    referenceType?: string | null;
    referenceId?: string | null;
    description?: string | null;
    idempotencyKey?: string | null;
  },
): Promise<void> {
  await tx.insert(promoAdTransactions).values({
    userId: input.userId,
    type: input.type,
    amount: input.amount,
    balanceAfter: input.balanceAfter,
    campaignVersion: input.campaignVersion,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    description: input.description ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

/* ── campaign config (singleton, DB-first) ─────────────── */

export interface PromoCampaignConfig {
  enabled: boolean;
  verifiedMonthlyAmount: string;
  unverifiedMonthlyAmount: string;
  durationMonths: number;
  campaignVersion: number;
  startsAt: Date;
  updatedAt: Date | null;
  updatedBy: string | null;
}

async function getConfigRow() {
  const [row] = await db
    .select()
    .from(promoAdCampaignConfig)
    .where(eq(promoAdCampaignConfig.id, SINGLETON_ID))
    .limit(1);
  return row ?? null;
}

/**
 * Resolved campaign config. When no row exists yet, returns code defaults with
 * `startsAt = now` (disabled, so the grant cycle is a no-op until an admin
 * enables it). Always reads fresh — config changes take effect immediately.
 */
export async function getCampaignConfig(): Promise<PromoCampaignConfig> {
  const row = await getConfigRow();
  if (!row) {
    return {
      enabled: DEFAULTS.enabled,
      verifiedMonthlyAmount: DEFAULTS.verifiedMonthlyAmount,
      unverifiedMonthlyAmount: DEFAULTS.unverifiedMonthlyAmount,
      durationMonths: DEFAULTS.durationMonths,
      campaignVersion: DEFAULTS.campaignVersion,
      startsAt: new Date(),
      updatedAt: null,
      updatedBy: null,
    };
  }
  return {
    enabled: row.enabled,
    verifiedMonthlyAmount: row.verifiedMonthlyAmount,
    unverifiedMonthlyAmount: row.unverifiedMonthlyAmount,
    durationMonths: row.durationMonths,
    campaignVersion: row.campaignVersion,
    startsAt: row.startsAt,
    updatedAt: row.updatedAt ?? null,
    updatedBy: row.updatedBy ?? null,
  };
}

async function getCampaignVersionTx(tx: DbTx): Promise<number> {
  const [row] = await tx
    .select({ v: promoAdCampaignConfig.campaignVersion })
    .from(promoAdCampaignConfig)
    .where(eq(promoAdCampaignConfig.id, SINGLETON_ID))
    .limit(1);
  return row?.v ?? DEFAULTS.campaignVersion;
}

export type CampaignStatus = "disabled" | "upcoming" | "active" | "ended";

export interface CampaignAdminView {
  enabled: boolean;
  verified_monthly_amount: string;
  unverified_monthly_amount: string;
  duration_months: number;
  campaign_version: number;
  starts_at: string;
  updated_at: string | null;
  updated_by: string | null;
  status: CampaignStatus;
  current_month_index: number;
  months_remaining: number;
}

function campaignStatus(cfg: PromoCampaignConfig, monthIndex: number): CampaignStatus {
  if (!cfg.enabled) return "disabled";
  if (monthIndex < 0) return "upcoming";
  if (monthIndex >= cfg.durationMonths) return "ended";
  return "active";
}

function monthsRemaining(cfg: PromoCampaignConfig, monthIndex: number): number {
  if (!cfg.enabled) return 0;
  if (monthIndex < 0) return cfg.durationMonths;
  if (monthIndex >= cfg.durationMonths) return 0;
  return cfg.durationMonths - monthIndex;
}

export async function getCampaignAdminView(): Promise<CampaignAdminView> {
  const cfg = await getCampaignConfig();
  const monthIndex = monthIndexFrom(cfg.startsAt, new Date());
  return {
    enabled: cfg.enabled,
    verified_monthly_amount: cfg.verifiedMonthlyAmount,
    unverified_monthly_amount: cfg.unverifiedMonthlyAmount,
    duration_months: cfg.durationMonths,
    campaign_version: cfg.campaignVersion,
    starts_at: cfg.startsAt.toISOString(),
    updated_at: cfg.updatedAt ? cfg.updatedAt.toISOString() : null,
    updated_by: cfg.updatedBy,
    status: campaignStatus(cfg, monthIndex),
    current_month_index: monthIndex,
    months_remaining: monthsRemaining(cfg, monthIndex),
  };
}

export interface CampaignConfigUpdate {
  enabled?: boolean;
  verifiedMonthlyAmount?: string | number;
  unverifiedMonthlyAmount?: string | number;
  durationMonths?: number;
}

function normalizeAmount(v: string | number, label: string): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n) || n < 0) {
    throw invalidData(`${label} must be a non-negative number`);
  }
  return money(n);
}

function normalizeDuration(v: number): number {
  if (!Number.isInteger(v) || v < 1 || v > 24) {
    throw invalidData("durationMonths must be an integer between 1 and 24");
  }
  return v;
}

/**
 * Create or update the singleton campaign config. Does NOT bump the version or
 * touch balances — use `renewCampaign` for a fresh cycle. Editing amounts or
 * duration mid-campaign simply changes what future monthly grants give.
 */
export async function upsertCampaignConfig(
  input: CampaignConfigUpdate,
  adminUserId: string,
): Promise<CampaignAdminView> {
  const existing = await getConfigRow();

  const values = {
    id: SINGLETON_ID,
    enabled: input.enabled ?? existing?.enabled ?? DEFAULTS.enabled,
    verifiedMonthlyAmount:
      input.verifiedMonthlyAmount !== undefined
        ? normalizeAmount(input.verifiedMonthlyAmount, "verifiedMonthlyAmount")
        : (existing?.verifiedMonthlyAmount ?? DEFAULTS.verifiedMonthlyAmount),
    unverifiedMonthlyAmount:
      input.unverifiedMonthlyAmount !== undefined
        ? normalizeAmount(
            input.unverifiedMonthlyAmount,
            "unverifiedMonthlyAmount",
          )
        : (existing?.unverifiedMonthlyAmount ??
          DEFAULTS.unverifiedMonthlyAmount),
    durationMonths:
      input.durationMonths !== undefined
        ? normalizeDuration(input.durationMonths)
        : (existing?.durationMonths ?? DEFAULTS.durationMonths),
    updatedBy: adminUserId,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(promoAdCampaignConfig)
      .set(values)
      .where(eq(promoAdCampaignConfig.id, SINGLETON_ID));
  } else {
    // First write anchors the campaign at "now".
    await db
      .insert(promoAdCampaignConfig)
      .values({ ...values, startsAt: new Date() });
  }
  return getCampaignAdminView();
}

/* ── per-user balance read ─────────────────────────────── */

export interface PromoBalanceSummary {
  /** Effective (non-expired) balance as a 2-dp string. */
  balance: string;
  /** When the current balance lapses, or null when none/expired. */
  expires_at: string | null;
  campaign_enabled: boolean;
  campaign_active: boolean;
  /** The monthly allowance for THIS user's verification tier. */
  monthly_amount: string;
  months_remaining: number;
}

/** Effective balance = 0 once the expiry has passed (use-it-or-lose-it). */
function effectiveBalance(bal: string, expiresAt: Date | null, now: Date): number {
  if (expiresAt != null && expiresAt <= now) return 0;
  return Number(bal);
}

export async function getPromoSummary(
  userId: string,
): Promise<PromoBalanceSummary> {
  const [u] = await db
    .select({
      bal: users.promoAdBalance,
      exp: users.promoAdBalanceExpiresAt,
      verified: users.isVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const cfg = await getCampaignConfig();
  const now = new Date();
  const monthIndex = monthIndexFrom(cfg.startsAt, now);
  const active = campaignStatus(cfg, monthIndex) === "active";
  const expired = u?.exp != null && u.exp <= now;
  const balance = u ? effectiveBalance(u.bal, u.exp, now) : 0;
  const monthlyAmount = u?.verified
    ? cfg.verifiedMonthlyAmount
    : cfg.unverifiedMonthlyAmount;
  return {
    balance: money(balance),
    expires_at: expired || !u?.exp ? null : u.exp.toISOString(),
    campaign_enabled: cfg.enabled,
    campaign_active: active,
    monthly_amount: monthlyAmount,
    months_remaining: monthsRemaining(cfg, monthIndex),
  };
}

/* ── consume (called inside the boost transaction) ─────── */

export interface ConsumeResult {
  /** Positive magnitude of promo credit applied, as a 2-dp string. */
  promo_used: string;
  /** Promo balance after this consume, as a 2-dp string. */
  balance_after: string;
  replayed: boolean;
}

/**
 * Spend up to `requestedAmount` of promo credit, returning how much was applied
 * (which may be less than requested — the caller charges the remainder to the
 * real wallet). MUST run inside the caller's boost transaction so promo +
 * wallet commit atomically.
 *
 * Expired balance is never spent. The user row is locked FOR UPDATE so a
 * concurrent boost can't double-spend, and the guarded UPDATE is the final
 * race guard. When `idempotencyKey` matches an existing consume row this is a
 * no-op replay.
 */
export async function consumePromoCredit(
  tx: DbTx,
  userId: string,
  requestedAmount: number,
  ref: {
    referenceType?: string | null;
    referenceId?: string | null;
    description?: string | null;
  },
  idempotencyKey?: string | null,
): Promise<ConsumeResult> {
  const reqMag = Number(requestedAmount);

  if (idempotencyKey) {
    const [existing] = await tx
      .select({
        amount: promoAdTransactions.amount,
        balanceAfter: promoAdTransactions.balanceAfter,
      })
      .from(promoAdTransactions)
      .where(eq(promoAdTransactions.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing) {
      return {
        promo_used: money(Math.abs(Number(existing.amount))),
        balance_after: existing.balanceAfter,
        replayed: true,
      };
    }
  }

  const now = new Date();
  const [u] = await tx
    .select({
      bal: users.promoAdBalance,
      exp: users.promoAdBalanceExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .for("update")
    .limit(1);
  if (!u) {
    return { promo_used: "0.00", balance_after: "0.00", replayed: false };
  }

  const avail = effectiveBalance(u.bal, u.exp, now);
  const use = Math.min(avail, reqMag);
  if (!(use > 0)) {
    return {
      promo_used: "0.00",
      balance_after: money(Number(u.bal)),
      replayed: false,
    };
  }

  const useStr = money(use);
  const rows = await tx
    .update(users)
    .set({ promoAdBalance: sql`${users.promoAdBalance} - ${useStr}::numeric` })
    .where(
      and(
        eq(users.id, userId),
        sql`${users.promoAdBalance} >= ${useStr}::numeric`,
        or(
          isNull(users.promoAdBalanceExpiresAt),
          gt(users.promoAdBalanceExpiresAt, now),
        ),
      ),
    )
    .returning({ bal: users.promoAdBalance });
  if (rows.length === 0) {
    // Lost a race or expired between read and update → treat as no promo used.
    return {
      promo_used: "0.00",
      balance_after: money(Number(u.bal)),
      replayed: false,
    };
  }

  const balanceAfter = rows[0].bal;
  const version = await getCampaignVersionTx(tx);
  await writePromoLedger(tx, {
    userId,
    type: "consume",
    amount: money(-use),
    balanceAfter,
    campaignVersion: version,
    referenceType: ref.referenceType ?? null,
    referenceId: ref.referenceId ?? null,
    description: ref.description ?? null,
    idempotencyKey: idempotencyKey ?? null,
  });

  return { promo_used: useStr, balance_after: balanceAfter, replayed: false };
}

/* ── monthly grant cycle (job) ─────────────────────────── */

/**
 * One daily promo-credit cycle (idempotent, advisory-locked by the caller):
 *  1. Expire any balances whose use-it-or-lose-it date has passed.
 *  2. If the campaign is enabled and within its duration, grant THIS month's
 *     allowance to every active user exactly once (per campaign_version +
 *     month). Each grant REPLACES the prior balance (use-it-or-lose-it).
 *
 * Returns the number of users granted this run.
 */
export async function runPromoAdCreditCycle(): Promise<number> {
  const cfg = await getCampaignConfig();
  if (!cfg.enabled) return 0;

  const now = new Date();
  await expireLapsedBalances(now, cfg.campaignVersion);

  const monthIndex = monthIndexFrom(cfg.startsAt, now);
  if (monthIndex < 0 || monthIndex >= cfg.durationMonths) return 0;

  const expiresAt = startOfNextMonth(now);
  const verifiedAmount = Number(cfg.verifiedMonthlyAmount);
  const unverifiedAmount = Number(cfg.unverifiedMonthlyAmount);

  let granted = 0;
  let cursor = ZERO_UUID;
  for (;;) {
    const chunk = await db
      .select({ id: users.id, verified: users.isVerified })
      .from(users)
      .where(and(gt(users.id, cursor), isNull(users.deletedAt)))
      .orderBy(asc(users.id))
      .limit(CHUNK);
    if (chunk.length === 0) break;

    await db.transaction(async (tx) => {
      for (const user of chunk) {
        const amount = user.verified ? verifiedAmount : unverifiedAmount;
        // Idempotency ledger: only the row we actually insert gets granted.
        const inserted = await tx
          .insert(promoAdGrants)
          .values({
            userId: user.id,
            campaignVersion: cfg.campaignVersion,
            monthIndex,
            amount: money(amount),
          })
          .onConflictDoNothing({
            target: [
              promoAdGrants.userId,
              promoAdGrants.campaignVersion,
              promoAdGrants.monthIndex,
            ],
          })
          .returning({ id: promoAdGrants.id });
        if (inserted.length === 0) continue; // already granted this month

        // Replace: expire any leftover balance, then grant the new allowance.
        const [cur] = await tx
          .select({ bal: users.promoAdBalance })
          .from(users)
          .where(eq(users.id, user.id))
          .for("update")
          .limit(1);
        const oldBal = Number(cur?.bal ?? 0);
        if (oldBal > 0) {
          await writePromoLedger(tx, {
            userId: user.id,
            type: "expire",
            amount: money(-oldBal),
            balanceAfter: "0.00",
            campaignVersion: cfg.campaignVersion,
            description: "Unused promo ad credit reset at monthly rollover",
          });
        }
        await tx
          .update(users)
          .set({
            promoAdBalance: money(amount),
            promoAdBalanceExpiresAt: expiresAt,
          })
          .where(eq(users.id, user.id));
        await writePromoLedger(tx, {
          userId: user.id,
          type: "grant",
          amount: money(amount),
          balanceAfter: money(amount),
          campaignVersion: cfg.campaignVersion,
          description: `Monthly promo ad credit (month ${monthIndex + 1}/${cfg.durationMonths})`,
        });
        granted++;
      }
    });

    cursor = chunk[chunk.length - 1].id;
  }

  logger.info(
    {
      job: "promo-ad-credit",
      monthIndex,
      campaignVersion: cfg.campaignVersion,
      granted,
    },
    "Promo ad credit cycle completed",
  );
  return granted;
}

/** Zero out every balance whose use-it-or-lose-it date has passed. */
async function expireLapsedBalances(
  now: Date,
  campaignVersion: number,
): Promise<number> {
  let cleared = 0;
  let cursor = ZERO_UUID;
  for (;;) {
    const chunk = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          gt(users.id, cursor),
          sql`${users.promoAdBalance} > 0`,
          sql`${users.promoAdBalanceExpiresAt} is not null`,
          lte(users.promoAdBalanceExpiresAt, now),
        ),
      )
      .orderBy(asc(users.id))
      .limit(CHUNK);
    if (chunk.length === 0) break;

    await db.transaction(async (tx) => {
      for (const u of chunk) {
        const [locked] = await tx
          .select({
            bal: users.promoAdBalance,
            exp: users.promoAdBalanceExpiresAt,
          })
          .from(users)
          .where(eq(users.id, u.id))
          .for("update")
          .limit(1);
        if (!locked) continue;
        const bal = Number(locked.bal);
        if (!(bal > 0) || !locked.exp || locked.exp > now) continue;
        await tx
          .update(users)
          .set({ promoAdBalance: "0.00", promoAdBalanceExpiresAt: null })
          .where(eq(users.id, u.id));
        await writePromoLedger(tx, {
          userId: u.id,
          type: "expire",
          amount: money(-bal),
          balanceAfter: "0.00",
          campaignVersion,
          description: "Promo ad credit expired (unused)",
        });
        cleared++;
      }
    });

    cursor = chunk[chunk.length - 1].id;
  }
  return cleared;
}

/* ── admin renew / reset ───────────────────────────────── */

/**
 * Start a fresh campaign cycle: bump campaign_version, re-anchor `startsAt` to
 * now, optionally apply config overrides, and reset every user's balance to 0
 * (recording a `reset` ledger row so the balance==SUM(ledger) invariant holds).
 *
 * Shares the grant-cycle advisory lock so a renew can never interleave with a
 * monthly grant. After renew, the next cycle grants month 0 of the new version.
 */
export async function renewCampaign(
  input: CampaignConfigUpdate,
  adminUserId: string,
): Promise<CampaignAdminView> {
  const ran = await withAdvisoryLock(PROMO_AD_CREDIT_LOCK_KEY, async () => {
    const existing = await getConfigRow();
    const newVersion = (existing?.campaignVersion ?? DEFAULTS.campaignVersion) + 1;
    const now = new Date();

    const values = {
      id: SINGLETON_ID,
      enabled: input.enabled ?? existing?.enabled ?? DEFAULTS.enabled,
      verifiedMonthlyAmount:
        input.verifiedMonthlyAmount !== undefined
          ? normalizeAmount(input.verifiedMonthlyAmount, "verifiedMonthlyAmount")
          : (existing?.verifiedMonthlyAmount ?? DEFAULTS.verifiedMonthlyAmount),
      unverifiedMonthlyAmount:
        input.unverifiedMonthlyAmount !== undefined
          ? normalizeAmount(
              input.unverifiedMonthlyAmount,
              "unverifiedMonthlyAmount",
            )
          : (existing?.unverifiedMonthlyAmount ??
            DEFAULTS.unverifiedMonthlyAmount),
      durationMonths:
        input.durationMonths !== undefined
          ? normalizeDuration(input.durationMonths)
          : (existing?.durationMonths ?? DEFAULTS.durationMonths),
      campaignVersion: newVersion,
      startsAt: now,
      updatedBy: adminUserId,
      updatedAt: now,
    };

    if (existing) {
      await db
        .update(promoAdCampaignConfig)
        .set(values)
        .where(eq(promoAdCampaignConfig.id, SINGLETON_ID));
    } else {
      await db.insert(promoAdCampaignConfig).values(values);
    }

    await resetAllBalances(newVersion);
  });

  if (!ran) {
    throw invalidData(
      "A promo ad credit cycle is currently running — please retry shortly",
    );
  }
  return getCampaignAdminView();
}

/** Zero out ALL positive balances (campaign renew/reset), with ledger rows. */
async function resetAllBalances(campaignVersion: number): Promise<number> {
  let reset = 0;
  let cursor = ZERO_UUID;
  for (;;) {
    const chunk = await db
      .select({ id: users.id })
      .from(users)
      .where(and(gt(users.id, cursor), sql`${users.promoAdBalance} > 0`))
      .orderBy(asc(users.id))
      .limit(CHUNK);
    if (chunk.length === 0) break;

    await db.transaction(async (tx) => {
      for (const u of chunk) {
        const [locked] = await tx
          .select({ bal: users.promoAdBalance })
          .from(users)
          .where(eq(users.id, u.id))
          .for("update")
          .limit(1);
        if (!locked) continue;
        const bal = Number(locked.bal);
        if (!(bal > 0)) continue;
        await tx
          .update(users)
          .set({ promoAdBalance: "0.00", promoAdBalanceExpiresAt: null })
          .where(eq(users.id, u.id));
        await writePromoLedger(tx, {
          userId: u.id,
          type: "reset",
          amount: money(-bal),
          balanceAfter: "0.00",
          campaignVersion,
          description: "Promo ad credit reset (campaign renewed)",
        });
        reset++;
      }
    });

    cursor = chunk[chunk.length - 1].id;
  }
  return reset;
}
