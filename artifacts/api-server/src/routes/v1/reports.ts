import { Router } from "express";
import { createReportHandler } from "../../controllers/reportController";
import { requireAuth, requireDbUser } from "../../middlewares/authGuard";
import { writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/", writeRateLimiter, requireAuth, requireDbUser, createReportHandler);

export default router;
