import { Router } from "express";
import {
  institutionInboxHandler,
  institutionUpdateRequestHandler,
} from "../../controllers/financingController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// FI phase 2 — the bank's own inbox. Any signed-in user may CALL these, but the
// service resolves institution membership (owner account or employee seat) and
// rejects everyone else, so the routes stay simple while access stays scoped.
// Banks only ever see requests Banco explicitly forwarded to them.
router.get("/inbox", publicRateLimiter, requireAuth, institutionInboxHandler);
router.patch(
  "/inbox/:leadId",
  writeRateLimiter,
  requireAuth,
  institutionUpdateRequestHandler,
);

export default router;
