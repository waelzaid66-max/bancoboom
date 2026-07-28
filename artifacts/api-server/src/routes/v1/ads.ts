import { Router } from "express";
import { adImpressionHandler } from "../../controllers/adsController";
import { optionalAuth, resolveDbUser } from "../../middlewares/authGuard";
import { publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// resolveDbUser converts Clerk ID → DB UUID (req.dbUserId) so the audit log
// FK receives a valid UUID, not a Clerk string.
router.post("/:id/impression", publicRateLimiter, optionalAuth, resolveDbUser, adImpressionHandler);

export default router;
