import { db } from "@workspace/db";
import { pushTokens, users } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * PushService — registration + best-effort remote delivery of Expo push
 * notifications (Task #102). Every send is fire-and-forget: a push failure must
 * NEVER break the originating action or the in-app notification it accompanies.
 *
 * Delivery uses Expo's push service (https://exp.host/--/api/v2/push/send),
 * which needs no server-side secret for Expo push tokens. Tokens reported as
 * DeviceNotRegistered are pruned so dead devices stop being targeted.
 */

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
// Expo accepts up to 100 messages per request.
const EXPO_CHUNK_SIZE = 100;

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

/** Loose validation of an Expo push token shape. */
export function isExpoPushToken(token: string): boolean {
  const t = token.trim();
  return (
    t.startsWith("ExponentPushToken[") ||
    t.startsWith("ExpoPushToken[") ||
    // Bare FCM/APNs tokens are rejected; we only support Expo tokens here.
    false
  );
}

/**
 * Persist a device's Expo push token for a user. `token` is globally unique:
 * re-registering the same device under a different user reassigns ownership so
 * a shared/handed-down device never leaks the previous user's notifications.
 */
export async function registerPushToken(
  clerkId: string,
  token: string,
  platform?: string | null,
): Promise<{ registered: boolean }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  if (!isExpoPushToken(token)) {
    throw Object.assign(new Error("Invalid push token"), { code: "INVALID_DATA" });
  }

  await db
    .insert(pushTokens)
    .values({ userId: user.id, token: token.trim(), platform: platform ?? null })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: { userId: user.id, platform: platform ?? null, updatedAt: new Date() },
    });

  return { registered: true };
}

/**
 * Remove a device token (e.g. on sign-out). Scoped to the caller so a user can
 * only delete their own tokens. Idempotent.
 */
export async function unregisterPushToken(
  clerkId: string,
  token: string,
): Promise<{ removed: boolean }> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  if (!user) throw Object.assign(new Error("User not found"), { code: "UNAUTHORIZED" });

  await db
    .delete(pushTokens)
    .where(eq(pushTokens.token, token.trim()));

  return { removed: true };
}

async function pruneTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  try {
    await db.delete(pushTokens).where(inArray(pushTokens.token, tokens));
  } catch (err) {
    console.error("[Push prune]", err);
  }
}

/**
 * Send a push to every registered device of an internal user id. Best-effort:
 * all errors are swallowed after logging. Caller passes the SAME userId used
 * for the in-app notification, so push honors the exact same recipient + the
 * per-category mute already applied upstream in createNotification.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const rows = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    const tokens = rows.map((r) => r.token).filter(isExpoPushToken);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: "default" as const,
      // Android notification channel — created client-side on registration.
      channelId: "default",
    }));

    for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
      const chunk = messages.slice(i, i + EXPO_CHUNK_SIZE);
      const chunkTokens = tokens.slice(i, i + EXPO_CHUNK_SIZE);
      await sendChunk(chunk, chunkTokens);
    }
  } catch (err) {
    console.error("[Push send]", err);
  }
}

async function sendChunk(
  messages: Array<Record<string, unknown>>,
  chunkTokens: string[],
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("[Push send] Expo responded", res.status);
      return;
    }

    const json = (await res.json()) as {
      data?: Array<{ status: string; details?: { error?: string } }>;
    };

    const dead: string[] = [];
    json.data?.forEach((ticket, idx) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered" &&
        chunkTokens[idx]
      ) {
        dead.push(chunkTokens[idx]);
      }
    });
    await pruneTokens(dead);
  } catch (err) {
    console.error("[Push chunk]", err);
  }
}
