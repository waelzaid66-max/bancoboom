import { Router } from "express";
import {
  createImportOrderHandler,
  listMyImportOrdersHandler,
  getImportOrderHandler,
} from "../../controllers/importOrderController";
import { requireAuth } from "../../middlewares/authGuard";
import {
  publicRateLimiter,
  writeRateLimiter,
} from "../../middlewares/rateLimiter";

const router = Router();

router.post("/", writeRateLimiter, requireAuth, createImportOrderHandler);
// "/mine" must be registered before "/:id" so it is not captured as an id.
router.get("/mine", publicRateLimiter, requireAuth, listMyImportOrdersHandler);
router.get("/:id", publicRateLimiter, requireAuth, getImportOrderHandler);

export default router;
