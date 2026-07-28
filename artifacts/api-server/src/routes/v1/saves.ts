import { Router } from "express";
import { toggleSaveHandler, getSavesHandler } from "../../controllers/saveController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/toggle", writeRateLimiter, requireAuth, toggleSaveHandler);
router.get("/", publicRateLimiter, requireAuth, getSavesHandler);

export default router;
