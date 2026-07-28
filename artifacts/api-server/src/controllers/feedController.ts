import type { Request, Response } from "express";
import { getFeed } from "../services/FeedService";
import { FeedQuerySchema, FeedItemSchema, successResponse, errorResponse, validateResponse } from "../validators/schemas";
import { ZodError } from "zod";

export async function feedHandler(req: Request, res: Response) {
  try {
    const query = FeedQuerySchema.parse(req.query);
    const result = await getFeed({
      cursor: query.cursor,
      limit: query.limit,
      category: query.category,
      industrialTypes: query.industrial_type,
      condition: query.condition,
      paymentPlan: query.payment_plan,
      propertyType: query.property_type,
      finishingType: query.finishing_type,
      compound: query.compound,
      furnished: query.furnished,
      offerType: query.offer_type,
      rentalTerm: query.rental_term,
      fuelType: query.fuel_type,
      transmission: query.transmission,
      brand: query.brand,
      model: query.model,
      minYear: query.min_year,
      maxYear: query.max_year,
      industry: query.industry,
      originType: query.origin_type,
      marketCountry: query.market_country,
      isRequest: query.is_request,
      sessionId: query.session_id,
      userId: req.userId,
    });

    const validated = validateResponse(FeedItemSchema.array(), result.items);

    // Short public cache for anonymous browsing — trades freshness for speed.
    // Authenticated requests carry personalised content (saved state, etc.) so
    // they must never be served from a shared cache.
    if (!req.userId) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    } else {
      res.setHeader("Cache-Control", "private, no-store");
    }

    return res.json(
      successResponse(validated, { cursor: result.cursor, has_next: result.has_next })
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Feed]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load feed"));
  }
}
