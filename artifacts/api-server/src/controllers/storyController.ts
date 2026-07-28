import type { Request, Response } from "express";
import {
  createStory,
  listActiveStories,
  viewStory,
} from "../services/StoryService";
import {
  CreateStorySchema,
  StoryItemSchema,
  StoryViewResultSchema,
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";
import { z, ZodError } from "zod";

function handleError(err: unknown, res: Response, ctx: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  console.error(ctx, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Internal error"));
}

export async function listStoriesHandler(req: Request, res: Response) {
  try {
    const items = await listActiveStories(req.userId);
    const validated = validateResponse(z.array(StoryItemSchema), items);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    return handleError(err, res, "[Stories list]");
  }
}

export async function createStoryHandler(req: Request, res: Response) {
  try {
    const input = CreateStorySchema.parse(req.body ?? {});
    const story = await createStory(req.userId!, input);
    const validated = validateResponse(StoryItemSchema, story);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Stories create]");
  }
}

export async function viewStoryHandler(req: Request, res: Response) {
  try {
    const result = await viewStory(req.userId!, req.params.id as string);
    const validated = validateResponse(StoryViewResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Stories view]");
  }
}
