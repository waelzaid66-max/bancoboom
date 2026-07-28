import type { Request, Response } from "express";
import {
  createConversation,
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteConversation,
  reactToMessage,
} from "../services/ConversationService";
import {
  CreateConversationSchema,
  SendMessageSchema,
  ReactToMessageSchema,
  ReactionResultSchema,
  ConversationSummarySchema,
  MessageItemSchema,
  MarkReadResultSchema,
  DeleteConversationResultSchema,
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

export async function createConversationHandler(req: Request, res: Response) {
  try {
    const input = CreateConversationSchema.parse(req.body);
    const result = await createConversation(req.userId!, input.listing_id, req.ip ?? undefined);
    const validated = validateResponse(ConversationSummarySchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Conversation create]");
  }
}

export async function listConversationsHandler(req: Request, res: Response) {
  try {
    const result = await listConversations(req.userId!);
    const validated = validateResponse(z.array(ConversationSummarySchema), result);
    const unread = validated.reduce((sum, c) => sum + c.unread, 0);
    return res.json(successResponse(validated, { total: unread }));
  } catch (err) {
    return handleError(err, res, "[Conversation list]");
  }
}

export async function getMessagesHandler(req: Request, res: Response) {
  try {
    const result = await getMessages(req.userId!, req.params.id as string);
    const validated = validateResponse(z.array(MessageItemSchema), result);
    return res.json(successResponse(validated, { total: validated.length }));
  } catch (err) {
    return handleError(err, res, "[Messages get]");
  }
}

export async function sendMessageHandler(req: Request, res: Response) {
  try {
    const input = SendMessageSchema.parse(req.body);
    const result = await sendMessage(req.userId!, req.params.id as string, input.body, {
      mediaUrl: input.media_url ?? null,
      mediaKind: input.media_kind ?? null,
      replyToId: input.reply_to_id ?? null,
      listingRefId: input.listing_ref_id ?? null,
    });
    const validated = validateResponse(MessageItemSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Message send]");
  }
}

export async function reactToMessageHandler(req: Request, res: Response) {
  try {
    const input = ReactToMessageSchema.parse(req.body);
    const result = await reactToMessage(
      req.userId!,
      req.params.id as string,
      req.params.messageId as string,
      input.emoji
    );
    const validated = validateResponse(ReactionResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Message react]");
  }
}

export async function deleteConversationHandler(req: Request, res: Response) {
  try {
    const result = await deleteConversation(req.userId!, req.params.id as string);
    const validated = validateResponse(DeleteConversationResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Conversation delete]");
  }
}

export async function markConversationReadHandler(req: Request, res: Response) {
  try {
    const result = await markConversationRead(req.userId!, req.params.id as string);
    const validated = validateResponse(MarkReadResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(err, res, "[Conversation read]");
  }
}
