import { Router } from "express";
import {
  listStoriesHandler,
  createStoryHandler,
  viewStoryHandler,
} from "../../controllers/storyController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import {
  writeRateLimiter,
  publicRateLimiter,
} from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, optionalAuth, listStoriesHandler);
router.post("/", writeRateLimiter, requireAuth, createStoryHandler);
router.post("/:id/view", writeRateLimiter, requireAuth, viewStoryHandler);

export default router;
