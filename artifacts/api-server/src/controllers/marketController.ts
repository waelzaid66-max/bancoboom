import type { Request, Response } from "express";
import { ZodError } from "zod";
import { getMarketTrends } from "../services/MarketIntelligenceService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  MarketTrendsResultSchema,
  MarketTrendsQuerySchema,
} from "../validators/schemas";

// GET /v1/market/trends — LIVE-computed market intelligence. Figures are derived
// from real listings/interactions/leads; low samples report honestly.
export async function getMarketTrendsHandler(req: Request, res: Response) {
  try {
    const query = MarketTrendsQuerySchema.parse(req.query);
    const result = await getMarketTrends({ category: query.category, metric: query.metric });
    const validated = validateResponse(MarketTrendsResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Market trends]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to compute market trends"));
  }
}
