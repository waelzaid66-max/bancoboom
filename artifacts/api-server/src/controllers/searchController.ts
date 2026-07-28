import type { Request, Response } from "express";
import { z } from "zod";
import { parseSearchQuery, searchListings, getAutocomplete, getTrending, getRecommendations, getFacets, mapClusters } from "../services/SearchService";
import { SearchQuerySchema, FacetsQuerySchema, FacetCountsSchema, FeedItemSchema, successResponse, errorResponse, validateResponse, MapClustersQuerySchema, MapClusterSchema } from "../validators/schemas";
import { ZodError } from "zod";

// Build the engine's ParsedSearchQuery from a validated query: NLP-parse the free
// text, then let explicit params override. Shared by searchHandler and
// mapClustersHandler so the list and the map filter IDENTICALLY — add a filter
// once and both surfaces honour it (single source of truth).
function parsedFromSearchQuery(query: z.infer<typeof SearchQuerySchema>) {
  // q is optional: a section results screen may filter by engine chips alone.
  const parsed = parseSearchQuery(query.q ?? "");

  if (query.category) parsed.category = query.category;
  if (query.industrial_type) parsed.industrial_type = query.industrial_type;
  if (query.min_price) parsed.min_price = query.min_price;
  if (query.max_price) parsed.max_price = query.max_price;
  if (query.location) parsed.location = query.location;
  // Near-me / radius (engine applies it only when all three are present).
  if (query.near_lat !== undefined) parsed.near_lat = query.near_lat;
  if (query.near_lng !== undefined) parsed.near_lng = query.near_lng;
  if (query.radius_km !== undefined) parsed.radius_km = query.radius_km;
  if (query.has_installment !== undefined) parsed.has_installment = query.has_installment;
  // Per-section engine filters (explicit params override anything inferred by NLP).
  if (query.condition) parsed.condition = query.condition;
  if (query.payment_plan) parsed.payment_plan = query.payment_plan;
  if (query.property_type) parsed.property_type = query.property_type;
  if (query.finishing_type) parsed.finishing_type = query.finishing_type;
  if (query.compound !== undefined) parsed.compound = query.compound;
  if (query.furnished !== undefined) parsed.furnished = query.furnished;
  if (query.offer_type) parsed.offer_type = query.offer_type;
  if (query.rental_term) parsed.rental_term = query.rental_term;
  if (query.fuel_type) parsed.fuel_type = query.fuel_type;
  if (query.transmission) parsed.transmission = query.transmission;
  if (query.brand) parsed.brand = query.brand;
  if (query.model) parsed.model = query.model;
  if (query.min_year !== undefined) parsed.min_year = query.min_year;
  if (query.max_year !== undefined) parsed.max_year = query.max_year;
  if (query.industry) parsed.industry = query.industry;
  if (query.origin_type) parsed.origin_type = query.origin_type;
  if (query.is_request !== undefined) parsed.is_request = query.is_request;
  // sort always has a value (schema default "recommended").
  parsed.sort = query.sort;
  return parsed;
}

export async function searchHandler(req: Request, res: Response) {
  try {
    const query = SearchQuerySchema.parse(req.query);
    const parsed = parsedFromSearchQuery(query);

    const result = await searchListings(parsed, query.cursor, query.limit);
    const validated = validateResponse(FeedItemSchema.array(), result.items);

    // Anonymous search results are safe to cache briefly at the CDN/browser layer.
    if (!req.userId) {
      res.setHeader("Cache-Control", "public, max-age=20, stale-while-revalidate=60");
    } else {
      res.setHeader("Cache-Control", "private, no-store");
    }

    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Search]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Search failed"));
  }
}

// GET /v1/search/map — clustered pins for the current viewport, using the SAME
// filters as searchHandler (incl. offer_type=rent for the Booking-style rental
// map across real-estate / land / factories). Returns aggregated cells, not
// every pin, so it scales.
export async function mapClustersHandler(req: Request, res: Response) {
  try {
    const query = MapClustersQuerySchema.parse(req.query);
    const parsed = parsedFromSearchQuery(query);
    const clusters = await mapClusters(
      parsed,
      {
        min_lat: query.min_lat,
        max_lat: query.max_lat,
        min_lng: query.min_lng,
        max_lng: query.max_lng,
      },
      query.zoom,
    );
    const validated = validateResponse(MapClusterSchema.array(), clusters);
    res.setHeader("Cache-Control", "public, max-age=20, stale-while-revalidate=60");
    return res.json(successResponse(validated, { total: clusters.length }));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Map clusters]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Map clustering failed"));
  }
}

export async function autocompleteHandler(req: Request, res: Response) {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q || q.length < 2) {
      const validated = validateResponse(z.string().array(), []);
      return res.json(successResponse(validated, { total: 0 }));
    }
    const suggestions = await getAutocomplete(q);
    const validated = validateResponse(z.string().array(), suggestions);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    console.error("[Autocomplete]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Autocomplete failed"));
  }
}

export async function facetsHandler(req: Request, res: Response) {
  try {
    const query = FacetsQuerySchema.parse(req.query);
    const facets = await getFacets(query.category);
    const validated = validateResponse(FacetCountsSchema, facets);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(successResponse(validated, { total: facets.total }));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Facets]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load facets"));
  }
}

export async function trendingHandler(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const items = await getTrending(limit);
    const validated = validateResponse(FeedItemSchema.array(), items);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    console.error("[Trending]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load trending"));
  }
}

export async function recommendationsHandler(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const items = await getRecommendations(req.userId ?? "", limit);
    const validated = validateResponse(FeedItemSchema.array(), items);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    console.error("[Recommendations]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load recommendations"));
  }
}
