import type { Request, Response } from "express";
import {
  listNotifications,
  markNotificationsRead,
} from "../services/NotificationService";
import {
  registerPushToken,
  unregisterPushToken,
} from "../services/PushService";
import {
  MarkNotificationsReadSchema,
  NotificationItemSchema,
  MarkReadResultSchema,
  RegisterPushTokenSchema,
  RegisterPushTokenResultSchema,
  UnregisterPushTokenSchema,
  UnregisterPushTokenResultSchema,
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";
import { z, ZodError } from "zod";

function handleError(err: unknown, res: Response, ctx: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  console.error(ctx, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Internal error"));
}

export async function listNotificationsHandler(req: Request, res: Response) {
  try {
    const { items, unread } = await listNotifications(req.userId!);
    const validated = validateResponse(z.array(NotificationItemSchema), items);
    return res.json(successResponse(validated, { total: unread }));
  } catch (err) {
    return handleError(err, res, "[Notifications list]");
  }
}

export async function markNotificationsReadHandler(req: Request, res: Response) {
  try {
    const input = MarkNotificationsReadSchema.parse(req.body ?? {});
    const result = await markNotificationsRead(req.userId!, input.id);
    const validated = validateResponse(MarkReadResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Notifications read]");
  }
}

export async function registerPushTokenHandler(req: Request, res: Response) {
  try {
    const input = RegisterPushTokenSchema.parse(req.body ?? {});
    const result = await registerPushToken(req.userId!, input.token, input.platform);
    const validated = validateResponse(RegisterPushTokenResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Push register]");
  }
}

export async function unregisterPushTokenHandler(req: Request, res: Response) {
  try {
    const input = UnregisterPushTokenSchema.parse(req.body ?? {});
    const result = await unregisterPushToken(req.userId!, input.token);
    const validated = validateResponse(UnregisterPushTokenResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Push unregister]");
  }
}
