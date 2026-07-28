import { Router } from "express";
import {
  listInvestmentsHandler,
  listMyInvestmentsHandler,
  getInvestmentHandler,
  createInvestmentHandler,
  updateInvestmentHandler,
  submitInvestmentInterestHandler,
} from "../../controllers/investmentsController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, listInvestmentsHandler);
router.post("/", writeRateLimiter, requireAuth, createInvestmentHandler);
// "/mine" must be registered before "/:id" so it is not captured as an id.
router.get("/mine", publicRateLimiter, requireAuth, listMyInvestmentsHandler);
router.get("/:id", publicRateLimiter, optionalAuth, getInvestmentHandler);
router.patch("/:id", writeRateLimiter, requireAuth, updateInvestmentHandler);
router.post("/:id/interest", writeRateLimiter, requireAuth, submitInvestmentInterestHandler);

export default router;
