import { Router } from "express";
import {
  listPlansHandler,
  getMySubscriptionHandler,
  subscribeHandler,
  confirmSubscriptionHandler,
  cancelSubscriptionHandler,
} from "../../controllers/subscriptionController";
import { requireAuth, requireDbUser } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/plans", publicRateLimiter, requireAuth, requireDbUser, listPlansHandler);
router.get("/me", publicRateLimiter, requireAuth, requireDbUser, getMySubscriptionHandler);
router.post("/", writeRateLimiter, requireAuth, requireDbUser, subscribeHandler);
router.post(
  "/intents/:id/confirm",
  writeRateLimiter,
  requireAuth,
  requireDbUser,
  confirmSubscriptionHandler
);
router.post("/cancel", writeRateLimiter, requireAuth, requireDbUser, cancelSubscriptionHandler);

export default router;
