import { Router } from "express";
import { getMeHandler, updateMeHandler } from "../../controllers/meController";
import {
  updateMyCompanyHandler,
  listMyFollowingHandler,
} from "../../controllers/companiesController";
import {
  getMySocialLinksHandler,
  setMySocialLinksHandler,
  getMyNotificationPreferencesHandler,
  setMyNotificationPreferencesHandler,
  listMySavedSearchesHandler,
  createSavedSearchHandler,
  updateSavedSearchHandler,
  deleteSavedSearchHandler,
  getMyMetricsHandler,
  getMyListingsHandler,
  getMyManagedListingsHandler,
} from "../../controllers/profileController";
import { askBancoAssistantHandler } from "../../controllers/aiController";
import { requireAuth } from "../../middlewares/authGuard";
import {
  publicRateLimiter,
  writeRateLimiter,
  aiRateLimiter,
} from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, requireAuth, getMeHandler);
router.patch("/", writeRateLimiter, requireAuth, updateMeHandler);
router.patch("/company", writeRateLimiter, requireAuth, updateMyCompanyHandler);

// Companies the caller follows (Task #40 suppliers directory).
router.get("/following", publicRateLimiter, requireAuth, listMyFollowingHandler);

// Profile metrics — REAL stats only.
router.get("/metrics", publicRateLimiter, requireAuth, getMyMetricsHandler);

// Owner's own listings (role-agnostic) for the Instagram-style profile grid.
router.get("/listings", publicRateLimiter, requireAuth, getMyListingsHandler);

// Owner's own listings WITH management fields (status/views/leads/created_at) —
// role-agnostic so individuals manage their catalogue without a dealer gate.
router.get("/listings/manage", publicRateLimiter, requireAuth, getMyManagedListingsHandler);

// BANCO AI assistant — server-side, grounded-only. Tight rate limit (paid model).
router.post("/ai/assistant", aiRateLimiter, requireAuth, askBancoAssistantHandler);

// Public social links (owner-scoped CRUD).
router.get("/social-links", publicRateLimiter, requireAuth, getMySocialLinksHandler);
router.put("/social-links", writeRateLimiter, requireAuth, setMySocialLinksHandler);

// Per-category notification preferences.
router.get(
  "/notification-preferences",
  publicRateLimiter,
  requireAuth,
  getMyNotificationPreferencesHandler,
);
router.put(
  "/notification-preferences",
  writeRateLimiter,
  requireAuth,
  setMyNotificationPreferencesHandler,
);

// Saved searches (owner-scoped CRUD).
router.get("/saved-searches", publicRateLimiter, requireAuth, listMySavedSearchesHandler);
router.post("/saved-searches", writeRateLimiter, requireAuth, createSavedSearchHandler);
router.patch("/saved-searches/:id", writeRateLimiter, requireAuth, updateSavedSearchHandler);
router.delete("/saved-searches/:id", writeRateLimiter, requireAuth, deleteSavedSearchHandler);

export default router;
