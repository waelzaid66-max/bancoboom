import { Router } from "express";
import {
  listCompaniesHandler,
  getCompanyHandler,
  getCompanyListingsHandler,
  followCompanyHandler,
  unfollowCompanyHandler,
} from "../../controllers/companiesController";
import { requireAuth, optionalAuth } from "../../middlewares/authGuard";
import { publicRateLimiter, writeRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.get("/", publicRateLimiter, optionalAuth, listCompaniesHandler);
router.get("/:id", publicRateLimiter, optionalAuth, getCompanyHandler);
router.get("/:id/listings", publicRateLimiter, getCompanyListingsHandler);
router.post("/:id/follow", writeRateLimiter, requireAuth, followCompanyHandler);
router.delete("/:id/follow", writeRateLimiter, requireAuth, unfollowCompanyHandler);

export default router;
