import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../validators/schemas";
import { reportErrorAsync } from "../lib/errorReporter";

type CodedError = { code?: string; message?: string };

const CODE_STATUS = {
  INVALID_DATA: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

type ErrorCode = keyof typeof CODE_STATUS;

/**
 * 404 handler — any route that falls through the router still gets the
 * standard { data, error, meta } envelope instead of Express' HTML default.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(errorResponse("NOT_FOUND", `Route not found: ${req.method} ${req.path}`));
}

/**
 * Centralized error middleware — the safety net guaranteeing that EVERY
 * unhandled failure (thrown errors, body-parser syntax errors, etc.) is
 * returned as a { data, error, meta } envelope. Existing controllers keep
 * their own try/catch; this only catches what escapes them.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Malformed JSON from express.json() surfaces as a SyntaxError with a body.
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json(errorResponse("INVALID_DATA", "Malformed JSON in request body"));
    return;
  }

  const e = (err ?? {}) as CodedError;
  const code: ErrorCode =
    e.code && e.code in CODE_STATUS ? (e.code as ErrorCode) : "INTERNAL_ERROR";
  const status = CODE_STATUS[code];

  // Always log the full error server-side; never leak internals on a 500.
  console.error("[Unhandled error]", err);

  // Observability: only genuine server faults (500) are reported/alerted —
  // expected client errors (400/401/404) are not noise. Fire-and-forget.
  if (status === 500) {
    reportErrorAsync(err, { path: req.path, method: req.method });
  }

  const message = status === 500 ? "Internal server error" : e.message ?? "Request failed";
  res.status(status).json(errorResponse(code, message));
}
