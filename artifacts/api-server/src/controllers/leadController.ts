import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { contactLead } from "../services/LeadService";
import {
  ContactLeadBodySchema,
  ContactLeadResultSchema,
  BehaviorSignalSchema,
  successResponse,
  errorResponse,
  validateResponse,
  BehaviorSignalResultSchema,
} from "../validators/schemas";
import { updateSession } from "../services/AdaptiveFeedEngine";
import { ZodError } from "zod";

/**
 * POST /leads/contact — Atomic contact reveal.
 *
 * Records the lead (including CPL billing) and returns the seller's phone
 * number in a single server-observed operation. The phone number is NOT
 * available in the listing detail endpoint; obtaining it requires creating a
 * lead record here. This ensures every phone reveal is bound to a
 * server-observed billable contact event, preventing forged CPL charges.
 */
export async function contactLeadHandler(req: Request, res: Response) {
  try {
    const input = ContactLeadBodySchema.parse(req.body);
    const clerkId = req.userId!;

    // Resolve the buyer's database id (used for per-buyer abuse counters and
    // lead attribution). A missing row is non-fatal — the lead still records.
    let buyerDbId: string | undefined;
    try {
      const [buyer] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);
      buyerDbId = buyer?.id;
    } catch {
      // non-fatal
    }

    const result = await contactLead({
      listingId: input.listing_id,
      actionType: input.action_type,
      buyerClerkId: clerkId,
      buyerDbId,
      contactToken: input.contact_token,
      buyerName: input.buyer_name,
      buyerPhone: input.buyer_phone,
      ip: req.ip ?? undefined,
      deviceId: req.header("x-device-id") ?? undefined,
    });

    const validated = validateResponse(ContactLeadResultSchema, { phone: result.phone });
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const e = err as { code?: string; message?: string };
    if (e.code === "INVALID_TOKEN") {
      return res
        .status(403)
        .json(errorResponse("INVALID_TOKEN", e.message ?? "Contact token is invalid or expired — please reload the listing"));
    }
    if (e.code === "NOT_FOUND") {
      return res
        .status(404)
        .json(errorResponse("NOT_FOUND", e.message ?? "Listing not found"));
    }
    if (e.code === "RATE_LIMITED") {
      return res
        .status(429)
        .json(errorResponse("RATE_LIMITED", e.message ?? "Too many requests"));
    }
    console.error("[Lead contact]", err);
    return res
      .status(500)
      .json(errorResponse("INTERNAL_ERROR", "Failed to process contact request"));
  }
}

export async function behaviorSignalHandler(req: Request, res: Response) {
  try {
    const input = BehaviorSignalSchema.parse(req.body);
    const validated = validateResponse(BehaviorSignalResultSchema, { received: true });
    setImmediate(() => {
      updateSession(input.session_id, input.action, {
        category: input.category,
        price: input.price,
      });
    });
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid signal"));
    }
    console.error("[Behavior signal]", err);
    return res
      .status(500)
      .json(errorResponse("INTERNAL_ERROR", "Signal processing failed"));
  }
}
