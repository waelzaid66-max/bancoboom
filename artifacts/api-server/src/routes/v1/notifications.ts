import { Router } from "express";
import {
  listNotificationsHandler,
  markNotificationsReadHandler,
  registerPushTokenHandler,
  unregisterPushTokenHandler,
} from "../../controllers/notificationController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, requireAuth, listNotificationsHandler);
router.post("/read", writeRateLimiter, requireAuth, markNotificationsReadHandler);

// Device push-token registration (Task #102). Register on app start once the
// user is signed in; unregister on sign-out so a device stops receiving the
// previous user's notifications.
router.post("/push-token", writeRateLimiter, requireAuth, registerPushTokenHandler);
router.delete("/push-token", writeRateLimiter, requireAuth, unregisterPushTokenHandler);

export default router;
