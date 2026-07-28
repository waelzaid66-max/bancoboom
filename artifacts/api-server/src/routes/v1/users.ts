import { Router } from "express";
import { deleteAccountHandler } from "../../controllers/userController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Self-service account deletion (Google Play compliance).
router.delete("/me", writeRateLimiter, requireAuth, deleteAccountHandler);

export default router;
