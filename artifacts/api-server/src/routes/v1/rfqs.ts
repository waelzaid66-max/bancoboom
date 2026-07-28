import { Router } from "express";
import {
  createRfqHandler,
  listRfqsHandler,
  listMyRfqsHandler,
  getRfqHandler,
  submitOfferHandler,
  acceptOfferHandler,
} from "../../controllers/rfqController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, listRfqsHandler);
router.post("/", writeRateLimiter, requireAuth, createRfqHandler);
// "/mine" must be registered before "/:id" so it is not captured as an id.
router.get("/mine", publicRateLimiter, requireAuth, listMyRfqsHandler);
router.get("/:id", publicRateLimiter, optionalAuth, getRfqHandler);
router.post("/:id/offers", writeRateLimiter, requireAuth, submitOfferHandler);
router.post("/:id/offers/:offerId/accept", writeRateLimiter, requireAuth, acceptOfferHandler);

export default router;
