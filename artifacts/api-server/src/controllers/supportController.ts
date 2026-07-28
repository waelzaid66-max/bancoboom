import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  CreateSupportTicketSchema,
  SupportTicketSchema,
} from "../validators/schemas";
import { createTicket } from "../services/SupportService";

/** Public (authenticated): a user opens a support ticket. */
export async function createSupportTicketHandler(req: Request, res: Response) {
  try {
    const input = CreateSupportTicketSchema.parse(req.body);
    const result = await createTicket({
      userId: req.dbUserId ?? null,
      subject: input.subject,
      message: input.message,
      category: input.category,
    });
    return res.json(successResponse(validateResponse(SupportTicketSchema, result)));
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
    }
    console.error("[Create ticket]", err);
    return res.status(500).json(errorResponse("INTERNAL_ERROR", "Failed to create ticket"));
  }
}
