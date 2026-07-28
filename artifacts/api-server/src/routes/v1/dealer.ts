import express, { Router } from "express";
import {
  dealerStatsHandler,
  dealerListingsHandler,
  dealerBulkActionHandler,
  dealerBoostHandler,
  dealerLeadsHandler,
  dealerUpdateLeadHandler,
  dealerAnalyticsHandler,
  dealerBulkImportHandler,
} from "../../controllers/dealerController";
import { requireDealerRole } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Scoped CSV parser: only for the authenticated bulk-import route
const csvParser = express.text({ type: "text/csv", limit: "10mb" });

// All dealer routes require dealer role
router.use(requireDealerRole);

router.get("/stats", publicRateLimiter, dealerStatsHandler);
router.get("/analytics", publicRateLimiter, dealerAnalyticsHandler);
router.get("/listings", publicRateLimiter, dealerListingsHandler);
router.post("/listings/bulk", writeRateLimiter, dealerBulkActionHandler);
router.post("/listings/boost", writeRateLimiter, dealerBoostHandler);
router.post("/listings/import", writeRateLimiter, csvParser, dealerBulkImportHandler);
router.get("/leads", publicRateLimiter, dealerLeadsHandler);
router.patch("/leads/:id", writeRateLimiter, dealerUpdateLeadHandler);

export default router;
