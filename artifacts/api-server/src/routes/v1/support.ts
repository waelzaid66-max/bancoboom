import { Router } from "express";
import { createSupportTicketHandler } from "../../controllers/supportController";
import { requireAuth, resolveDbUser } from "../../middlewares/authGuard";
import { writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/tickets", writeRateLimiter, requireAuth, resolveDbUser, createSupportTicketHandler);

export default router;
