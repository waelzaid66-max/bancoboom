import { Router } from "express";
import {
  requestUploadUrlHandler,
  serveObjectHandler,
  promoteUploadHandler,
  verifyUploadHandler,
} from "../../controllers/uploadController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/request-url", writeRateLimiter, requireAuth, requestUploadUrlHandler);
router.post("/promote", writeRateLimiter, requireAuth, promoteUploadHandler);
// Read-only verify is called once per asset before Publish, so it must NOT share
// the 30/min write limiter (a 15-photo listing would exhaust it). Public limiter
// (120/min) + requireAuth is the right budget for an authenticated read.
router.post("/verify", publicRateLimiter, requireAuth, verifyUploadHandler);
router.get("/objects/*path", publicRateLimiter, optionalAuth, serveObjectHandler);

export default router;
