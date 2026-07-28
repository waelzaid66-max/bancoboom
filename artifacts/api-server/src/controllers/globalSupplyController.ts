import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  listGlobalRequests,
  listMyGlobalRequests,
  getGlobalRequestDetail,
  createGlobalRequest,
  respondToRequest,
} from "../services/GlobalSupplyService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  GlobalSupplyRequestSchema,
  GlobalSupplyDetailSchema,
  GlobalSupplyQuerySchema,
  CreateGlobalSupplySchema,
  GlobalSupplyCreateResultSchema,
  RespondGlobalSupplySchema,
  GlobalSupplyResponseResultSchema,
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

// GET /v1/global-supply — public board of open sourcing requests.
export async function listGlobalSupplyHandler(req: Request, res: Response) {
  try {
    const query = GlobalSupplyQuerySchema.parse(req.query);
    const result = await listGlobalRequests(
      {
        status: query.status,
        industry: query.industry,
        destination_country: query.destination_country,
      },
      query.cursor,
      query.limit,
    );
    const validated = validateResponse(GlobalSupplyRequestSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[GlobalSupply list]");
  }
}

// GET /v1/global-supply/mine — the authenticated buyer's own requests.
export async function listMyGlobalSupplyHandler(req: Request, res: Response) {
  try {
    const query = GlobalSupplyQuerySchema.parse(req.query);
    const result = await listMyGlobalRequests(req.userId!, query.cursor, query.limit);
    const validated = validateResponse(GlobalSupplyRequestSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[GlobalSupply mine]");
  }
}

// GET /v1/global-supply/:id — detail with responses + ranked supplier matches.
export async function getGlobalSupplyHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const request = await getGlobalRequestDetail(id, req.userId);
    if (!request) return res.status(404).json(errorResponse("NOT_FOUND", "Request not found"));
    const validated = validateResponse(GlobalSupplyDetailSchema, request);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[GlobalSupply get]");
  }
}

// POST /v1/global-supply — create a sourcing request (any authenticated buyer).
export async function createGlobalSupplyHandler(req: Request, res: Response) {
  try {
    const input = CreateGlobalSupplySchema.parse(req.body);
    const result = await createGlobalRequest(req.userId!, input);
    const validated = validateResponse(GlobalSupplyCreateResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[GlobalSupply create]");
  }
}

// POST /v1/global-supply/:id/responses — supplier submits/updates a quote.
export async function respondGlobalSupplyHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = RespondGlobalSupplySchema.parse(req.body);
    const result = await respondToRequest(req.userId!, id, input);
    const validated = validateResponse(GlobalSupplyResponseResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[GlobalSupply respond]");
  }
}
