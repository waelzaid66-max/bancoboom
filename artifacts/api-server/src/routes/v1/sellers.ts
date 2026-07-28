import { Router } from "express";
import { getReviewsHandler, createReviewHandler } from "../../controllers/reviewController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/:id/reviews", publicRateLimiter, optionalAuth, getReviewsHandler);
router.post("/:id/reviews", writeRateLimiter, requireAuth, createReviewHandler);

export default router;
