import { Router } from "express";
import {
  createConversationHandler,
  listConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  reactToMessageHandler,
  markConversationReadHandler,
  deleteConversationHandler,
} from "../../controllers/conversationController";
import { requireAuth } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, requireAuth, listConversationsHandler);
router.post("/", writeRateLimiter, requireAuth, createConversationHandler);
router.delete("/:id", writeRateLimiter, requireAuth, deleteConversationHandler);
router.get("/:id/messages", publicRateLimiter, requireAuth, getMessagesHandler);
router.post("/:id/messages", writeRateLimiter, requireAuth, sendMessageHandler);
router.post(
  "/:id/messages/:messageId/react",
  writeRateLimiter,
  requireAuth,
  reactToMessageHandler
);
router.post("/:id/read", writeRateLimiter, requireAuth, markConversationReadHandler);

export default router;
