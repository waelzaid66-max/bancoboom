import type { Request, Response } from "express";
import { saveOrUnsaveListing, getUserSaves } from "../services/SaveService";
import {
  SaveListingSchema,
  successResponse,
  errorResponse,
  validateResponse,
  SaveToggleResultSchema,
} from "../validators/schemas";
import { z, ZodError } from "zod";

export async function toggleSaveHandler(req: Request, res: Response) {
  try {
    const input = SaveListingSchema.parse(req.body);
    const result = await saveOrUnsaveListing(req.userId!, input.listing_id);
    const validated = validateResponse(SaveToggleResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const e = err as { code?: string; message?: string };
    if (e.code === "UNAUTHORIZED") return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
    console.error("[Save toggle]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to update saved listing"));
  }
}

export async function getSavesHandler(req: Request, res: Response) {
  try {
    const saves = await getUserSaves(req.userId!);
    const validated = validateResponse(z.string().uuid().array(), saves);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    console.error("[Saves get]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to get saved listings"));
  }
}
