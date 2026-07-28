import { Router } from "express";
import { feedHandler } from "../../controllers/feedController";
import { optionalAuth } from "../../middlewares/authGuard";
import { publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, optionalAuth, feedHandler);

export default router;
