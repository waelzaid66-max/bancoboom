import type { Request, Response } from "express";
import { recordImpression } from "../services/AdsService";
import {
  ImpressionSchema,
  AdImpressionResultSchema,
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";
import { ZodError } from "zod";

export async function adImpressionHandler(req: Request, res: Response) {
  try {
    const adId = String(req.params.id);
    const input = ImpressionSchema.parse(req.body);
    const result = await recordImpression(adId, {
      sessionId: input.session_id,
      deviceId: input.device_id,
      ip: req.ip,
      // Pass DB UUID (not Clerk ID) so the audit_log actor_user_id FK is valid.
      userId: req.dbUserId ?? null,
    });
    const validated = validateResponse(AdImpressionResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Ad not found"));
    console.error("[Ad impression]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to record impression"));
  }
}
