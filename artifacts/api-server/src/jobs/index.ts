import cron from "node-cron";
import { logger } from "../lib/logger";
import { withAdvisoryLock } from "../lib/advisoryLock";
import { archiveOldListings } from "./archiveListings";
import { generateDealerPerformance } from "./dealerPerformance";
import { expireSubscriptions } from "./subscriptionExpiry";
import { remindSubscriptionsExpiringSoon } from "./subscriptionExpiringReminders";
import { sendWeeklyReports } from "./weeklyReports";
import { backfillStaffRoles } from "./backfillStaffRoles";
import {
  runPromoAdCreditCycle,
  PROMO_AD_CREDIT_LOCK_KEY,
} from "../services/PromoAdCreditService";

// Distinct advisory-lock keys so each job coordinates independently across
// instances. Arbitrary but stable integers.
const ARCHIVE_LOCK_KEY = 48150001;
const PERFORMANCE_LOCK_KEY = 48150002;
const SUBSCRIPTION_LOCK_KEY = 48150003;
const SUBSCRIPTION_REMINDER_LOCK_KEY = 48150007;
const WEEKLY_REPORT_LOCK_KEY = 48150004;
const STAFF_ROLE_BACKFILL_LOCK_KEY = 48150005;
// PROMO_AD_CREDIT_LOCK_KEY (48150006) is owned by PromoAdCreditService so the
// monthly grant cycle and admin renew share one lock and never interleave.

const TIMEZONE = process.env.CRON_TIMEZONE ?? "Africa/Cairo";

let started = false;

/**
 * Registers the scheduled maintenance jobs. Safe to call once at boot; repeated
 * calls are ignored. Each job acquires a Postgres advisory lock before running
 * so that with multiple instances only one performs the work.
 */
export function startScheduledJobs(): void {
  if (started) return;
  started = true;

  // Daily at 03:00 — archive active listings older than 90 days.
  cron.schedule(
    "0 3 * * *",
    () => {
      void runJob("archive-old-listings", ARCHIVE_LOCK_KEY, archiveOldListings);
    },
    { timezone: TIMEZONE },
  );

  // Weekly on Monday at 04:00 — per-dealer performance summary.
  cron.schedule(
    "0 4 * * 1",
    () => {
      void runJob("dealer-performance", PERFORMANCE_LOCK_KEY, generateDealerPerformance);
    },
    { timezone: TIMEZONE },
  );

  // Daily at 02:00 — expire lapsed subscriptions + enforce baseline caps.
  cron.schedule(
    "0 2 * * *",
    () => {
      void runJob("expire-subscriptions", SUBSCRIPTION_LOCK_KEY, expireSubscriptions);
    },
    { timezone: TIMEZONE },
  );

  // Daily at 09:00 — remind users before paid subscriptions lapse.
  cron.schedule(
    "0 9 * * *",
    () => {
      void runJob(
        "subscription-expiring-reminders",
        SUBSCRIPTION_REMINDER_LOCK_KEY,
        remindSubscriptionsExpiringSoon,
      );
    },
    { timezone: TIMEZONE },
  );

  // Weekly on Monday at 08:00 — per-dealer activity digest email.
  cron.schedule(
    "0 8 * * 1",
    () => {
      void runJob("weekly-reports", WEEKLY_REPORT_LOCK_KEY, sendWeeklyReports);
    },
    { timezone: TIMEZONE },
  );

  // Daily at 02:30 — promo ad credit cycle: expire lapsed balances and grant
  // the current month's allowance (idempotent per user/version/month). Running
  // daily (not just on the 1st) means a user who joins mid-month still receives
  // the current month's credit on the next run.
  cron.schedule(
    "30 2 * * *",
    () => {
      void runJob(
        "promo-ad-credit",
        PROMO_AD_CREDIT_LOCK_KEY,
        runPromoAdCreditCycle,
      );
    },
    { timezone: TIMEZONE },
  );

  logger.info({ timezone: TIMEZONE }, "Scheduled maintenance jobs registered");
}

/**
 * One-shot startup migrations. Advisory-locked so that with multiple instances
 * only one performs the work. Currently: backfill staff roles for pre-existing
 * admins (idempotent, safe to run on every boot).
 */
export async function runStartupBackfills(): Promise<void> {
  await runJob("backfill-staff-roles", STAFF_ROLE_BACKFILL_LOCK_KEY, backfillStaffRoles);
}

async function runJob(
  name: string,
  lockKey: number,
  fn: () => Promise<number>,
): Promise<void> {
  const start = Date.now();
  try {
    const ran = await withAdvisoryLock(lockKey, async () => {
      await fn();
    });
    if (!ran) {
      logger.info({ job: name }, "Job skipped — lock held by another instance");
      return;
    }
    logger.info({ job: name, duration_ms: Date.now() - start }, "Job completed");
  } catch (err) {
    logger.error({ job: name, err }, "Scheduled job failed");
  }
}
