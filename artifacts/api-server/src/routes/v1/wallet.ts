import { Router } from "express";
import {
  getWalletHandler,
  getPromoAdSummaryHandler,
  listTransactionsHandler,
  createTopupHandler,
  confirmTopupHandler,
} from "../../controllers/walletController";
import { requireAuth, requireDbUser } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, requireAuth, requireDbUser, getWalletHandler);
router.get(
  "/promo",
  publicRateLimiter,
  requireAuth,
  requireDbUser,
  getPromoAdSummaryHandler
);
router.get(
  "/transactions",
  publicRateLimiter,
  requireAuth,
  requireDbUser,
  listTransactionsHandler
);
router.post(
  "/topup",
  writeRateLimiter,
  requireAuth,
  requireDbUser,
  createTopupHandler
);
router.post(
  "/topup/:id/confirm",
  writeRateLimiter,
  requireAuth,
  requireDbUser,
  confirmTopupHandler
);

export default router;
