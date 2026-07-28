import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  listInvestments,
  listMyInvestments,
  getInvestmentDetail,
  createInvestment,
  updateInvestment,
  submitInterest,
} from "../services/InvestmentService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  InvestmentSummarySchema,
  InvestmentDetailSchema,
  InvestmentsQuerySchema,
  CreateInvestmentSchema,
  UpdateInvestmentSchema,
  InvestmentCreateResultSchema,
  InvestmentUpdateResultSchema,
  SubmitInvestmentInterestSchema,
  InvestmentInterestResultSchema,
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

// GET /v1/investments — public board of open investment opportunities.
export async function listInvestmentsHandler(req: Request, res: Response) {
  try {
    const query = InvestmentsQuerySchema.parse(req.query);
    const result = await listInvestments(
      {
        investment_type: query.investment_type,
        industry: query.industry,
        location: query.location,
        status: query.status,
      },
      query.cursor,
      query.limit,
    );
    const validated = validateResponse(InvestmentSummarySchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[Investments list]");
  }
}

// GET /v1/investments/mine — the authenticated owner's investments (all statuses).
export async function listMyInvestmentsHandler(req: Request, res: Response) {
  try {
    const query = InvestmentsQuerySchema.parse(req.query);
    const result = await listMyInvestments(req.userId!, query.cursor, query.limit);
    const validated = validateResponse(InvestmentSummarySchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[Investments mine]");
  }
}

// GET /v1/investments/:id — detail with viewer-aware interest/ownership flags.
export async function getInvestmentHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const inv = await getInvestmentDetail(id, req.userId);
    if (!inv) return res.status(404).json(errorResponse("NOT_FOUND", "Investment not found"));
    const validated = validateResponse(InvestmentDetailSchema, inv);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Investment get]");
  }
}

// POST /v1/investments — create (business roles only, enforced in service).
export async function createInvestmentHandler(req: Request, res: Response) {
  try {
    const input = CreateInvestmentSchema.parse(req.body);
    const result = await createInvestment(req.userId!, input);
    const validated = validateResponse(InvestmentCreateResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Investment create]");
  }
}

// PATCH /v1/investments/:id — owner-only edit.
export async function updateInvestmentHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = UpdateInvestmentSchema.parse(req.body);
    const result = await updateInvestment(req.userId!, id, input);
    const validated = validateResponse(InvestmentUpdateResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Investment update]");
  }
}

// POST /v1/investments/:id/interest — buyer expresses interest (notifies owner).
export async function submitInvestmentInterestHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = SubmitInvestmentInterestSchema.parse(req.body);
    const result = await submitInterest(req.userId!, id, input);
    const validated = validateResponse(InvestmentInterestResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Investment interest]");
  }
}
