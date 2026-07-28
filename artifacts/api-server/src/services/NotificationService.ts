import { db } from "@workspace/db";
import { notifications, users, notificationPreferences } from "@workspace/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { sendPushToUser } from "./PushService";

export type NotificationType =
  | "message"
  | "lead"
  | "system"
  | "rfq"
  | "new_match"
  | "price_drop"
  | "comment"
  | "review"
  // Additive (Task #40): B2B investment interest + global-supply response.
  | "investment"
  | "global_supply"
  // Additive: new short-stay booking request on a furnished/daily listing.
  | "booking"
  // Billing (Wave B3): PSP settlement, failed checkout, subscription renewal.
  | "payment_success"
  | "payment_failed"
  | "subscription_expiring"
  // Additive: car-import order lifecycle (created + each stage).
  | "car_import";

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Insert an in-app notification. Best-effort: a failure here must never break
 * the originating action (sending a message, tracking a lead), so errors are
 * swallowed after logging.
 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    // Respect per-category mute (Task #38): if the user explicitly disabled
    // in-app notifications for this category, skip creation entirely. Absence
    // of a preference row means the category is enabled (implicit default).
    const [pref] = await db
      .select({ inApp: notificationPreferences.inApp })
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, input.userId),
          eq(notificationPreferences.type, input.type),
        ),
      )
      .limit(1);
    if (pref && pref.inApp === false) return;

    await db.insert(notifications).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ?? null,
    });

    // Remote push (Task #102): fan out to the user's registered devices in
    // addition to the in-app record. Same recipient + same per-category mute
    // gate above, so push never fires for a category the user disabled. Fully
    // fire-and-forget — a push failure must not affect notification creation.
    void sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      data: { type: input.type, ...(input.data ?? {}) },
    });
  } catch (err) {
    console.error("[Notification create]", err);
  }
}

export async function listNotifications(
  clerkId: string
): Promise<{ items: NotificationDTO[]; unread: number }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) return { items: [], unread: 0 };

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const items: NotificationDTO[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data as Record<string, unknown> | null) ?? null,
    read_at: n.readAt ? n.readAt.toISOString() : null,
    created_at: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
  }));

  const unread = items.filter((i) => i.read_at === null).length;
  return { items, unread };
}

export async function markNotificationsRead(
  clerkId: string,
  id?: string
): Promise<{ read: boolean }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  if (id) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), eq(notifications.id, id)));
  } else {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  }
  return { read: true };
}
