import type { Request, Response } from "express";
import { ZodError } from "zod";
import { listComments, createComment, deleteComment } from "../services/CommentService";
import {
  CommentSchema,
  CommentBodySchema,
  CommentDeleteResultSchema,
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";
import { z } from "zod";

function handleError(err: unknown, res: Response, ctx: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  if (e.code === "NOT_FOUND")
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "FORBIDDEN")
    return res.status(403).json(errorResponse("FORBIDDEN", e.message ?? "Forbidden"));
  if (e.code === "RATE_LIMITED")
    return res.status(429).json(errorResponse("RATE_LIMITED", e.message ?? "Too many requests"));
  console.error(ctx, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Internal error"));
}

// GET /v1/listings/:id/comments — public Q&A thread for a listing.
export async function getCommentsHandler(req: Request, res: Response) {
  try {
    const result = await listComments(req.params.id as string);
    const validated = validateResponse(z.array(CommentSchema), result);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    return handleError(err, res, "[Comments list]");
  }
}

// POST /v1/listings/:id/comments — ask a question or reply (auth required).
export async function createCommentHandler(req: Request, res: Response) {
  try {
    const input = CommentBodySchema.parse(req.body);
    const result = await createComment(
      req.userId!,
      req.params.id as string,
      input.body,
      input.parent_id ?? null
    );
    const validated = validateResponse(CommentSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Comment create]");
  }
}

// DELETE /v1/listings/:id/comments/:commentId — author or listing owner only.
export async function deleteCommentHandler(req: Request, res: Response) {
  try {
    const result = await deleteComment(
      req.userId!,
      req.params.id as string,
      req.params.commentId as string
    );
    const validated = validateResponse(CommentDeleteResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Comment delete]");
  }
}
