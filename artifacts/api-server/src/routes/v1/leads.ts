import { Router } from "express";
import {
  contactLeadHandler,
  behaviorSignalHandler,
} from "../../controllers/leadController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// POST /leads/contact — atomic contact reveal: records the lead and returns the
// seller's phone number in one operation. Requires authentication so leads are
// always attributed to an account (required for per-user abuse counters and
// seller notifications). The listing's phone number is NOT available in the
// listing detail endpoint — it is only returned here, making the reveal itself
// the server-observed contact event.
router.post("/contact", writeRateLimiter, requireAuth, contactLeadHandler);
router.post("/signal", publicRateLimiter, behaviorSignalHandler);

export default router;
