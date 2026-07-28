import type { Request, Response } from "express";
import { ZodError } from "zod";
import { listReviews, createReview } from "../services/ReviewService";
import {
  SellerReviewSchema,
  ReviewsResponseSchema,
  ReviewBodySchema,
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";

function handleError(err: unknown, res: Response, ctx: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  if (e.code === "NOT_FOUND")
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "NOT_ELIGIBLE")
    return res.status(403).json(errorResponse("FORBIDDEN", e.message ?? "Not eligible"));
  if (e.code === "RATE_LIMITED")
    return res.status(429).json(errorResponse("RATE_LIMITED", e.message ?? "Too many requests"));
  console.error(ctx, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Internal error"));
}

// GET /v1/sellers/:id/reviews — public reviews + summary; viewer-aware can_review.
export async function getReviewsHandler(req: Request, res: Response) {
  try {
    const result = await listReviews(req.params.id as string, req.userId ?? null);
    const validated = validateResponse(ReviewsResponseSchema, result);
    return res.json(successResponse(validated, { total: validated.summary.count }));
  } catch (err) {
    return handleError(err, res, "[Reviews list]");
  }
}

// POST /v1/sellers/:id/reviews — create/update a review (auth + eligibility).
export async function createReviewHandler(req: Request, res: Response) {
  try {
    const input = ReviewBodySchema.parse(req.body);
    const result = await createReview(
      req.userId!,
      req.params.id as string,
      input.rating,
      input.body ?? null
    );
    const validated = validateResponse(SellerReviewSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Review create]");
  }
}
