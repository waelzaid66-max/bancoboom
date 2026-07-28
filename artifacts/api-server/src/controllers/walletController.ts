import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  WalletStateSchema,
  WalletTransactionSchema,
  WalletTransactionsQuerySchema,
  TopupCreateSchema,
  TopupIntentResultSchema,
  TopupConfirmResultSchema,
  PromoAdSummarySchema,
} from "../validators/schemas";
import { getWalletBalance, listTransactions } from "../services/WalletService";
import { getPromoSummary } from "../services/PromoAdCreditService";
import {
  createTopupIntent,
  getTopupIntentStatus,
} from "../services/PaymentIntentService";

function handleError(res: Response, err: unknown, fallback: string, tag: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "NOT_FOUND")
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  console.error(tag, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", fallback));
}

export async function getWalletHandler(req: Request, res: Response) {
  try {
    const balance = await getWalletBalance(req.dbUserId!);
    const validated = validateResponse(WalletStateSchema, {
      balance,
      currency: "EGP",
    });
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to load wallet", "[Wallet]");
  }
}

export async function getPromoAdSummaryHandler(req: Request, res: Response) {
  try {
    const summary = await getPromoSummary(req.dbUserId!);
    const validated = validateResponse(PromoAdSummarySchema, summary);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to load promo credit", "[Wallet promo]");
  }
}

export async function listTransactionsHandler(req: Request, res: Response) {
  try {
    const query = WalletTransactionsQuerySchema.parse(req.query);
    const page = await listTransactions(req.dbUserId!, {
      limit: query.limit,
      cursor: query.cursor,
      from: query.from,
      to: query.to,
      type: query.type,
    });
    const validated = validateResponse(WalletTransactionSchema.array(), page.items);
    return res.json(
      successResponse(validated, { cursor: page.cursor, has_next: page.hasNext })
    );
  } catch (err) {
    return handleError(res, err, "Failed to load transactions", "[Wallet transactions]");
  }
}

export async function createTopupHandler(req: Request, res: Response) {
  try {
    const input = TopupCreateSchema.parse(req.body);
    const result = await createTopupIntent({
      userId: req.dbUserId!,
      amount: input.amount,
      method: input.method,
    });
    const validated = validateResponse(TopupIntentResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to create top-up", "[Wallet topup]");
  }
}

export async function confirmTopupHandler(req: Request, res: Response) {
  try {
    const intentId = z.string().uuid().parse(req.params.id);
    const result = await getTopupIntentStatus(intentId, req.dbUserId!);
    const validated = validateResponse(TopupConfirmResultSchema, result);
    return res.json(successResponse(validated));
  } catch (err) {
    return handleError(res, err, "Failed to confirm top-up", "[Wallet topup confirm]");
  }
}
