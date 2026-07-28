import { notifySubscriptionsExpiringSoon } from "../services/BillingNotificationService";
import { logger } from "../lib/logger";

/**
 * Daily reminder: paid subscriptions expiring within 3 days. Deduped per
 * subscription in BillingNotificationService.
 */
export async function remindSubscriptionsExpiringSoon(): Promise<number> {
  const sent = await notifySubscriptionsExpiringSoon();
  if (sent > 0) {
    logger.info({ job: "subscription-expiring-reminders", sent }, "Expiring subscription reminders sent");
  }
  return sent;
}
