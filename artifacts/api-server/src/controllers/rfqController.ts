import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createRfq,
  listOpenRfqs,
  listMyRfqs,
  getRfqDetail,
  submitOffer,
  acceptOffer,
} from "../services/RfqService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  RfqSchema,
  RfqDetailSchema,
  RfqsQuerySchema,
  CreateRfqSchema,
  RfqCreateResultSchema,
  SubmitOfferSchema,
  SubmitOfferResultSchema,
  AcceptOfferResultSchema,
} from "../validators/schemas";

function mapError(res: Response, err: unknown, label: string) {
  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "INVALID_DATA") return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "UNAUTHORIZED") return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  if (e.code === "FORBIDDEN") return res.status(403).json(errorResponse("UNAUTHORIZED", e.message ?? "Forbidden"));
  if (e.code === "NOT_FOUND") return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  if (e.code === "CONFLICT") return res.status(409).json(errorResponse("INVALID_DATA", e.message ?? "Conflict"));
  console.error(label, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Request failed"));
}

// POST /v1/rfqs — create an RFQ (any authenticated buyer).
export async function createRfqHandler(req: Request, res: Response) {
  try {
    const input = CreateRfqSchema.parse(req.body);
    const result = await createRfq(req.userId!, input);
    const validated = validateResponse(RfqCreateResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[RFQ create]");
  }
}

// GET /v1/rfqs — public board of open RFQs.
export async function listRfqsHandler(req: Request, res: Response) {
  try {
    const query = RfqsQuerySchema.parse(req.query);
    const result = await listOpenRfqs(
      { category: query.category, industry: query.industry, industrial_type: query.industrial_type },
      query.cursor,
      query.limit
    );
    const validated = validateResponse(RfqSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[RFQ list]");
  }
}

// GET /v1/rfqs/mine — the authenticated buyer's own RFQs (all statuses).
export async function listMyRfqsHandler(req: Request, res: Response) {
  try {
    const query = RfqsQuerySchema.parse(req.query);
    const result = await listMyRfqs(req.userId!, query.cursor, query.limit);
    const validated = validateResponse(RfqSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[RFQ mine]");
  }
}

// GET /v1/rfqs/:id — RFQ detail with authz-gated offer visibility.
export async function getRfqHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const rfq = await getRfqDetail(id, req.userId);
    if (!rfq) return res.status(404).json(errorResponse("NOT_FOUND", "RFQ not found"));
    const validated = validateResponse(RfqDetailSchema, rfq);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[RFQ get]");
  }
}

// POST /v1/rfqs/:id/offers — submit / update a supplier offer.
export async function submitOfferHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = SubmitOfferSchema.parse(req.body);
    const result = await submitOffer(req.userId!, id, input);
    const validated = validateResponse(SubmitOfferResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[RFQ offer]");
  }
}

// POST /v1/rfqs/:id/offers/:offerId/accept — buyer awards an offer.
export async function acceptOfferHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const offerId = req.params.offerId as string;
    const result = await acceptOffer(req.userId!, id, offerId);
    const validated = validateResponse(AcceptOfferResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[RFQ accept]");
  }
}
