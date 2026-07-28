import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  FinancingRequestsQuerySchema,
  UpdateFinancingRequestSchema,
  CreateFinancingIntermediarySchema,
  UpdateFinancingIntermediarySchema,
  FinancingRequestSchema,
  FinancingIntermediarySchema,
  InstitutionInboxQuerySchema,
  InstitutionInboxSchema,
  UpdateInstitutionRequestSchema,
  FinancingBranchSchema,
  FinancingSeatSchema,
  CreateFinancingBranchSchema,
  CreateFinancingSeatSchema,
} from "../validators/schemas";
import * as FinancingService from "../services/FinancingService";
import { getDbUser } from "../services/UserService";

function handleError(res: Response, err: unknown, label: string, fallback: string) {
  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "NOT_FOUND") {
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  }
  if (e.code === "INVALID_DATA") {
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  }
  if (e.code === "FORBIDDEN") {
    return res.status(403).json(errorResponse("FORBIDDEN", e.message ?? "Forbidden"));
  }
  if (e.code === "CONFLICT") {
    return res.status(409).json(errorResponse("CONFLICT", e.message ?? "Conflict"));
  }
  console.error(label, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", fallback));
}

/* ── Requests ──────────────────────────────────────────── */

export async function financingRequestsHandler(req: Request, res: Response) {
  try {
    const query = FinancingRequestsQuerySchema.parse(req.query);
    const result = await FinancingService.listFinancingRequests({
      category: query.category,
      status: query.status,
      search: query.search,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      cursor: query.cursor,
      limit: query.limit,
    });
    const validated = validateResponse(FinancingRequestSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Financing requests]", "Failed to load financing requests");
  }
}

export async function financingRequestsExportHandler(req: Request, res: Response) {
  try {
    const query = FinancingRequestsQuerySchema.parse(req.query);
    const csv = await FinancingService.exportFinancingRequestsCsv({
      category: query.category,
      status: query.status,
      search: query.search,
      dateFrom: query.date_from,
      dateTo: query.date_to,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="financing-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return res.send(csv);
  } catch (err) {
    return handleError(res, err, "[Financing export]", "Failed to export financing requests");
  }
}

export async function updateFinancingRequestHandler(req: Request, res: Response) {
  try {
    const leadId = req.params.leadId as string;
    const input = UpdateFinancingRequestSchema.parse(req.body);
    const result = await FinancingService.updateFinancingRequest({
      leadId,
      status: input.status,
      intermediaryId: input.intermediary_id,
      notes: input.notes,
      adminUserId: req.dbUserId!,
    });
    return res.json(successResponse(validateResponse(FinancingRequestSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing update]", "Failed to update financing request");
  }
}

/* ── Intermediaries ────────────────────────────────────── */

export async function financingIntermediariesHandler(_req: Request, res: Response) {
  try {
    const result = await FinancingService.listIntermediaries();
    return res.json(successResponse(validateResponse(FinancingIntermediarySchema.array(), result)));
  } catch (err) {
    return handleError(res, err, "[Financing intermediaries]", "Failed to load intermediaries");
  }
}

export async function createFinancingIntermediaryHandler(req: Request, res: Response) {
  try {
    const input = CreateFinancingIntermediarySchema.parse(req.body);
    const result = await FinancingService.createIntermediary({
      name: input.name,
      contactEmail: input.contact_email,
      contactPhone: input.contact_phone,
      notes: input.notes,
      adminUserId: req.dbUserId!,
    });
    return res.json(successResponse(validateResponse(FinancingIntermediarySchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing intermediary create]", "Failed to create intermediary");
  }
}

export async function updateFinancingIntermediaryHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = UpdateFinancingIntermediarySchema.parse(req.body);
    const result = await FinancingService.updateIntermediary({
      id,
      name: input.name,
      contactEmail: input.contact_email,
      contactPhone: input.contact_phone,
      notes: input.notes,
      isActive: input.is_active,
      ownerUserId: input.owner_user_id,
      adminUserId: req.dbUserId!,
    });
    return res.json(successResponse(validateResponse(FinancingIntermediarySchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing intermediary update]", "Failed to update intermediary");
  }
}

/* ── FI phase 2: institution inbox (bank-side, requireAuth) ─────────────── */

/** Resolve the caller's db user id (requireAuth gives us the Clerk id only). */
async function requireDbUser(req: Request): Promise<string> {
  const dbUser = await getDbUser(req.userId!);
  if (!dbUser) {
    throw Object.assign(new Error("User not found"), { code: "FORBIDDEN" });
  }
  return dbUser.id;
}

export async function institutionInboxHandler(req: Request, res: Response) {
  try {
    const dbUserId = await requireDbUser(req);
    const query = InstitutionInboxQuerySchema.parse(req.query);
    const result = await FinancingService.listInstitutionRequests({
      dbUserId,
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return res.json(
      successResponse(
        validateResponse(InstitutionInboxSchema, {
          membership: result.membership,
          items: result.items,
          branches: result.branches,
          cursor: result.cursor ?? null,
          has_next: result.has_next,
        }),
      ),
    );
  } catch (err) {
    return handleError(res, err, "[Financing institution inbox]", "Failed to load inbox");
  }
}

export async function institutionUpdateRequestHandler(req: Request, res: Response) {
  try {
    const dbUserId = await requireDbUser(req);
    const leadId = req.params.leadId as string;
    const input = UpdateInstitutionRequestSchema.parse(req.body);
    const result = await FinancingService.updateInstitutionRequest({
      dbUserId,
      leadId,
      status: input.status,
      branchId: input.branch_id,
    });
    return res.json(successResponse(validateResponse(FinancingRequestSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing institution update]", "Failed to update request");
  }
}

/* ── FI phase 2: branches + seats (admin) ─────────────── */

export async function financingBranchesHandler(req: Request, res: Response) {
  try {
    const intermediaryId = req.params.id as string;
    const result = await FinancingService.listBranches(intermediaryId);
    return res.json(
      successResponse(validateResponse(FinancingBranchSchema.array(), result)),
    );
  } catch (err) {
    return handleError(res, err, "[Financing branches list]", "Failed to load branches");
  }
}

export async function createFinancingBranchHandler(req: Request, res: Response) {
  try {
    const intermediaryId = req.params.id as string;
    const input = CreateFinancingBranchSchema.parse(req.body);
    const result = await FinancingService.createBranch({
      intermediaryId,
      name: input.name,
      city: input.city ?? null,
      adminUserId: req.dbUserId!,
    });
    return res.json(successResponse(validateResponse(FinancingBranchSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing branch create]", "Failed to create branch");
  }
}

export async function financingSeatsHandler(req: Request, res: Response) {
  try {
    const intermediaryId = req.params.id as string;
    const result = await FinancingService.listSeats(intermediaryId);
    return res.json(
      successResponse(validateResponse(FinancingSeatSchema.array(), result)),
    );
  } catch (err) {
    return handleError(res, err, "[Financing seats list]", "Failed to load seats");
  }
}

export async function createFinancingSeatHandler(req: Request, res: Response) {
  try {
    const intermediaryId = req.params.id as string;
    const input = CreateFinancingSeatSchema.parse(req.body);
    const result = await FinancingService.createSeat({
      intermediaryId,
      userId: input.user_id,
      branchId: input.branch_id ?? null,
      role: input.role,
      adminUserId: req.dbUserId!,
    });
    return res.json(successResponse(validateResponse(FinancingSeatSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Financing seat create]", "Failed to create seat");
  }
}
