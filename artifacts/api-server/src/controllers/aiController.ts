import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { askBancoAssistant } from "../services/AiAssistantService";
import {
  successResponse,
  errorResponse,
  validateResponse,
} from "../validators/schemas";

const AssistantTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const AskAssistantSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000),
  history: z.array(AssistantTurnSchema).max(20).optional(),
});

const AssistantActionSchema = z.object({
  kind: z.enum(["listing", "search", "conversation", "navigate"]),
  label: z.string(),
  listing_id: z.string().nullish(),
  price_display: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
  location: z.string().nullish(),
  query: z.string().nullish(),
  category: z.string().nullish(),
  max_price: z.number().nullish(),
  has_installment: z.boolean().nullish(),
  conversation_id: z.string().nullish(),
  screen: z.string().nullish(),
});

const AssistantResponseSchema = z.object({
  answer: z.string(),
  actions: z.array(AssistantActionSchema).optional(),
});

/**
 * POST /api/v1/me/ai/assistant
 *
 * Server-side BANCO assistant. Auth + rate limiting are enforced by the route
 * middleware; this handler validates the (client-held) turns and delegates all
 * prompt/grounding/model config to AiAssistantService.
 */
export async function askBancoAssistantHandler(req: Request, res: Response) {
  try {
    const body = AskAssistantSchema.parse(req.body);
    const result = await askBancoAssistant(req.userId!, {
      message: body.message,
      history: body.history,
    });
    return res.json(
      successResponse(validateResponse(AssistantResponseSchema, result)),
    );
  } catch (err) {
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    const code = (err as { code?: string })?.code;
    if (code === "INVALID_DATA") {
      return res.status(400).json(errorResponse("INVALID_DATA", (err as Error).message));
    }
    console.error("[AI assistant]", err);
    return res
      .status(502)
      .json(errorResponse("INTERNAL_ERROR", "The assistant is unavailable right now. Please try again."));
  }
}
