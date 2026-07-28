import type { Request, Response } from "express";
import { getDealerListings, bulkUpdateListingStatus } from "../services/ListingService";
import { getDealerLeads, updateLeadStatus, getDealerStats } from "../services/LeadService";
import { boostListing } from "../services/AdsService";
import { bulkImportListings } from "../services/BulkImportService";
import {
  DealerListingsQuerySchema,
  BulkActionSchema,
  BoostListingSchema,
  DealerLeadsQuerySchema,
  UpdateLeadStatusSchema,
  successResponse,
  errorResponse,
  validateResponse,
  DealerStatsSchema,
  DealerListingItemSchema,
  DealerLeadItemSchema,
  AdBoostResultSchema,
  BulkActionResultSchema,
  ImportResultSchema,
  UpdateLeadResultSchema,
} from "../validators/schemas";
import { z, ZodError } from "zod";

export async function dealerStatsHandler(req: Request, res: Response) {
  try {
    const stats = await getDealerStats(req.dbUserId!);
    const validated = validateResponse(DealerStatsSchema, stats);
    return res.json(successResponse(validated));
  } catch (err) {
    console.error("[Dealer stats]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load stats"));
  }
}

export async function dealerListingsHandler(req: Request, res: Response) {
  try {
    const query = DealerListingsQuerySchema.parse(req.query);
    const result = await getDealerListings(req.dbUserId!, query);
    const validated = validateResponse(DealerListingItemSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    console.error("[Dealer listings]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load listings"));
  }
}

export async function dealerBulkActionHandler(req: Request, res: Response) {
  try {
    const input = BulkActionSchema.parse(req.body);
    const result = await bulkUpdateListingStatus(req.dbUserId!, input.listing_ids, input.action);
    const validated = validateResponse(BulkActionResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    console.error("[Dealer bulk]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Bulk action failed"));
  }
}

export async function dealerBoostHandler(req: Request, res: Response) {
  try {
    const input = BoostListingSchema.parse(req.body);
    const result = await boostListing(
      input.listing_id,
      req.dbUserId!,
      req.userRole as "individual" | "dealer" | "company" | "enterprise",
      input.ad_type,
      input.duration_days,
      input.idempotency_key ?? null
    );
    const validated = validateResponse(AdBoostResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    const e = err as { code?: string; message?: string };
    if (e.code === "INVALID_DATA") return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
    if (e.code === "NOT_FOUND") return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
    console.error("[Dealer boost]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Boost failed"));
  }
}

export async function dealerLeadsHandler(req: Request, res: Response) {
  try {
    const query = DealerLeadsQuerySchema.parse(req.query);
    const result = await getDealerLeads(req.dbUserId!, query);
    const validated = validateResponse(DealerLeadItemSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    console.error("[Dealer leads]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load leads"));
  }
}

export async function dealerUpdateLeadHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = UpdateLeadStatusSchema.parse(req.body);
    const result = await updateLeadStatus(id, req.dbUserId!, input.status);
    const validated = validateResponse(UpdateLeadResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    console.error("[Dealer update lead]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to update lead"));
  }
}

export async function dealerAnalyticsHandler(req: Request, res: Response) {
  try {
    const stats = await getDealerStats(req.dbUserId!);
    const validated = validateResponse(DealerStatsSchema, stats);
    return res.json(successResponse(validated));
  } catch (err) {
    console.error("[Dealer analytics]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load analytics"));
  }
}

export async function dealerBulkImportHandler(req: Request, res: Response) {
  try {
    // req.body is a string when Content-Type: text/csv (parsed by express.text())
    const csvInput: string | Buffer =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from("");
    if (!csvInput || (typeof csvInput === "string" && !csvInput.trim()) || (Buffer.isBuffer(csvInput) && csvInput.length === 0)) {
      return res.status(400).json(errorResponse("INVALID_DATA", "CSV body is empty — send Content-Type: text/csv"));
    }
    const result = await bulkImportListings(csvInput, req.dbUserId!);
    const validated = validateResponse(ImportResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    console.error("[Dealer import]", err);
    const e = err as { message?: string };
    if (e.message === "Invalid CSV format") {
      return res.status(400).json(errorResponse("INVALID_DATA", "Invalid CSV format"));
    }
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Import failed"));
  }
}
