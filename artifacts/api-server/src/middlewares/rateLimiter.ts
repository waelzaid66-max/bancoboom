import rateLimit from "express-rate-limit";
import { errorResponse } from "../validators/schemas";

export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("INVALID_DATA", "Too many requests, please slow down"));
  },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("INVALID_DATA", "Too many search requests"));
  },
});

export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("INVALID_DATA", "Too many write requests"));
  },
});

// AI assistant calls hit a paid upstream model, so they get a tighter budget
// than ordinary writes to keep cost and abuse in check.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("INVALID_DATA", "Too many assistant requests, please slow down"));
  },
});
