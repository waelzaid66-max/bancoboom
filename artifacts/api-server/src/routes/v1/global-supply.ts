import { Router } from "express";
import {
  listGlobalSupplyHandler,
  listMyGlobalSupplyHandler,
  getGlobalSupplyHandler,
  createGlobalSupplyHandler,
  respondGlobalSupplyHandler,
} from "../../controllers/globalSupplyController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, listGlobalSupplyHandler);
router.post("/", writeRateLimiter, requireAuth, createGlobalSupplyHandler);
// "/mine" must be registered before "/:id" so it is not captured as an id.
router.get("/mine", publicRateLimiter, requireAuth, listMyGlobalSupplyHandler);
router.get("/:id", publicRateLimiter, optionalAuth, getGlobalSupplyHandler);
router.post("/:id/responses", writeRateLimiter, requireAuth, respondGlobalSupplyHandler);

export default router;
