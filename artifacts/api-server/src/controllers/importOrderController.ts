import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createImportOrder,
  listMyImportOrders,
  getImportOrder,
} from "../services/ImportOrderService";
import {
  successResponse,
  errorResponse,
  validateResponse,
  ImportOrderSchema,
  ImportOrderListItemSchema,
  CreateImportOrderSchema,
  ImportOrderCreateResultSchema,
} from "../validators/schemas";

function mapError(res: Response, err: unknown, label: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "INVALID_DATA")
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  if (e.code === "UNAUTHORIZED")
    return res.status(401).json(errorResponse("UNAUTHORIZED", e.message ?? "Unauthorized"));
  if (e.code === "NOT_FOUND")
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  console.error(label, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Request failed"));
}

// POST /v1/import-orders — create a car-import order (authenticated buyer).
export async function createImportOrderHandler(req: Request, res: Response) {
  try {
    const input = CreateImportOrderSchema.parse(req.body);
    const result = await createImportOrder(req.userId!, input);
    const validated = validateResponse(ImportOrderCreateResultSchema, result);
    return res.status(201).json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[ImportOrder create]");
  }
}

// GET /v1/import-orders/mine — the authenticated buyer's own import orders.
export async function listMyImportOrdersHandler(req: Request, res: Response) {
  try {
    const result = await listMyImportOrders(req.userId!);
    const validated = validateResponse(ImportOrderListItemSchema.array(), result);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[ImportOrder mine]");
  }
}

// GET /v1/import-orders/:id — a single import order owned by the buyer.
export async function getImportOrderHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const order = await getImportOrder(req.userId!, id);
    if (!order)
      return res.status(404).json(errorResponse("NOT_FOUND", "Import order not found"));
    const validated = validateResponse(ImportOrderSchema, order);
    return res.json(successResponse(validated));
  } catch (err) {
    return mapError(res, err, "[ImportOrder get]");
  }
}
