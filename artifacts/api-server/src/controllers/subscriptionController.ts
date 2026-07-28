import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  PlanSchema,
  SubscribeSchema,
  SubscribeResultSchema,
  SubscriptionConfirmResultSchema,
  SubscriptionMeSchema,
  SubscriptionSchema,
} from "../validators/schemas";
import {
  listPlans,
  startSubscription,
  getSubscriptionIntentStatus,
  cancelSubscription,
  getMySubscription,
} from "../services/SubscriptionService";
import type { UserRole } from "../services/PlanService";

function handleError(res: Response, err: unknown, fallback: string, tag: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "NOT_FOUND")
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  console.error(tag, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", fallback));
}

export async function listPlansHandler(req: Request, res: Response) {
  try {
    const result = await listPlans((req.userRole ?? "individual") as UserRole);
    const validated = validateResponse(PlanSchema.array(), result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to load plans", "[Subscriptions plans]");
  }
}

export async function getMySubscriptionHandler(req: Request, res: Response) {
  try {
    const result = await getMySubscription(
      req.dbUserId!,
      (req.userRole ?? "individual") as UserRole
    );
    const validated = validateResponse(SubscriptionMeSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to load subscription", "[Subscription me]");
  }
}

export async function subscribeHandler(req: Request, res: Response) {
  try {
    const input = SubscribeSchema.parse(req.body);
    const result = await startSubscription({
      userId: req.dbUserId!,
      role: (req.userRole ?? "individual") as UserRole,
      planSlug: input.plan_slug,
      paymentMethod: input.payment_method,
    });
    const validated = validateResponse(SubscribeResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to start subscription", "[Subscribe]");
  }
}

export async function confirmSubscriptionHandler(req: Request, res: Response) {
  try {
    const intentId = z.string().uuid().parse(req.params.id);
    const result = await getSubscriptionIntentStatus(intentId, req.dbUserId!);
    const validated = validateResponse(SubscriptionConfirmResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to confirm subscription", "[Subscription confirm]");
  }
}

export async function cancelSubscriptionHandler(req: Request, res: Response) {
  try {
    const result = await cancelSubscription(req.dbUserId!);
    const validated = validateResponse(SubscriptionSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to cancel subscription", "[Subscription cancel]");
  }
}
