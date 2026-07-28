import type { Request, Response } from "express";
import { suggestPlaces } from "../services/ReferenceService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  PlaceSuggestionSchema,
} from "../validators/schemas";

// GET /v1/reference/places?q=&country=&limit= — autocomplete over the geo /
// real-estate reference dataset. Read-only, public.
export async function placeSuggestionsHandler(req: Request, res: Response) {
  try {
    const q = String(req.query.q ?? "").trim();
    const country = req.query.country ? String(req.query.country) : null;
    const limitRaw = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

    const suggestions = await suggestPlaces({ q, country, limit });
    const validated = validateResponse(PlaceSuggestionSchema.array(), suggestions);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    console.error("[PlaceSuggestions]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Place suggestions failed"));
  }
}
