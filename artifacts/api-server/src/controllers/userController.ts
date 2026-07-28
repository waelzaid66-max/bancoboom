import type { Request, Response } from "express";
import { deleteAccount } from "../services/UserService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  DeleteAccountResultSchema,
} from "../validators/schemas";

export async function deleteAccountHandler(req: Request, res: Response) {
  try {
    const result = await deleteAccount(req.userId!);
    const validated = validateResponse(DeleteAccountResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "NOT_FOUND") {
      return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "User not found"));
    }
    console.error("[Account delete]", err);
    return res
      .status(500)
      .json(errorResponse("INTERNAL_ERROR", "Failed to delete account"));
  }
}
