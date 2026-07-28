import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  CreateReportSchema,
  ReportSchema,
} from "../validators/schemas";
import { createReport } from "../services/ReportService";

/** Public (authenticated): a user reports a listing. */
export async function createReportHandler(req: Request, res: Response) {
  try {
    const input = CreateReportSchema.parse(req.body);
    const result = await createReport({
      listingId: input.listing_id,
      reporterUserId: req.dbUserId ?? null,
      reason: input.reason,
      details: input.details,
    });
    return res.json(successResponse(validateResponse(ReportSchema, result)));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") {
      return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Listing not found"));
    }
    if (e.code === "RATE_LIMITED") {
      return res.status(429).json(errorResponse("RATE_LIMITED", e.message ?? "Too many reports, please try again later"));
    }
    console.error("[Create report]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to create report"));
  }
}
