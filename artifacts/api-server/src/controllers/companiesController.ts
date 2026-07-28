import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  getCompanyProfile,
  getCompanyListings,
  upsertMyCompanyProfile,
  listCompaniesDirectory,
  followCompany,
  unfollowCompany,
  listMyFollowing,
} from "../services/CompanyService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  CompanyProfileSchema,
  CompanyListingsQuerySchema,
  UpsertCompanyProfileSchema,
  UpsertCompanyProfileResultSchema,
  CompanyDirectoryItemSchema,
  CompaniesDirectoryQuerySchema,
  FollowingQuerySchema,
  FollowResultSchema,
  FeedItemSchema,
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

// GET /v1/companies — public suppliers directory (viewer-aware is_following).
export async function listCompaniesHandler(req: Request, res: Response) {
  try {
    const query = CompaniesDirectoryQuerySchema.parse(req.query);
    const result = await listCompaniesDirectory(
      { q: query.q, industry: query.industry, hq_country: query.hq_country, verified: query.verified },
      query.cursor,
      query.limit,
      req.userId,
    );
    const validated = validateResponse(CompanyDirectoryItemSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[Companies directory]");
  }
}

// GET /v1/companies/:id — public seller/company profile (viewer-aware follow).
export async function getCompanyHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const profile = await getCompanyProfile(id, req.userId);
    if (!profile) return res.status(404).json(errorResponse("NOT_FOUND", "Company not found"));
    const validated = validateResponse(CompanyProfileSchema, profile);
    return res.json(successResponse(validated));
  } catch (err) {
    console.error("[Company get]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load company"));
  }
}

// POST /v1/companies/:id/follow — follow a company (idempotent).
export async function followCompanyHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const result = await followCompany(req.userId!, id);
    const validated = validateResponse(FollowResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Company follow]");
  }
}

// DELETE /v1/companies/:id/follow — unfollow a company (idempotent).
export async function unfollowCompanyHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const result = await unfollowCompany(req.userId!, id);
    const validated = validateResponse(FollowResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[Company unfollow]");
  }
}

// GET /v1/me/following — the caller's followed companies.
export async function listMyFollowingHandler(req: Request, res: Response) {
  try {
    const query = FollowingQuerySchema.parse(req.query);
    const result = await listMyFollowing(req.userId!, query.cursor, query.limit);
    const validated = validateResponse(CompanyDirectoryItemSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return mapError(res, err, "[My following]");
  }
}

// GET /v1/companies/:id/listings — the company's public active listings.
export async function getCompanyListingsHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const query = CompanyListingsQuerySchema.parse(req.query);
    const result = await getCompanyListings(id, query.cursor, query.limit);
    const validated = validateResponse(FeedItemSchema.array(), result.items);
    return res.json(
      successResponse(validated, { cursor: result.cursor, has_next: result.has_next })
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid query"));
    }
    console.error("[Company listings]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to load company listings"));
  }
}

// PATCH /v1/me/company — owner upsert of the rich B2B block (business roles only).
export async function updateMyCompanyHandler(req: Request, res: Response) {
  try {
    const clerkId = req.userId!;
    const input = UpsertCompanyProfileSchema.parse(req.body);
    const result = await upsertMyCompanyProfile(clerkId, input);
    const validated = validateResponse(UpsertCompanyProfileResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const e = err as { code?: string; message?: string };
    if (e.code === "UNAUTHORIZED") return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
    if (e.code === "FORBIDDEN") return res.status(403).json(errorResponse("UNAUTHORIZED", e.message ?? "Forbidden"));
    console.error("[Company update]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to update company"));
  }
}
