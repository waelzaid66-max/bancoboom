import { Router } from "express";
import {
  adminOverviewHandler,
  adminUsersHandler,
  setUserBanHandler,
  adminListingsHandler,
  moderationQueueHandler,
  moderateListingHandler,
  adminLeadsHandler,
  adminAdsHandler,
  adminReportsHandler,
  resolveReportHandler,
  supportTicketsHandler,
  supportTicketHandler,
  respondTicketHandler,
  resolveTicketHandler,
  adminRevenueHandler,
  adminAnalyticsHandler,
  fraudSignalsHandler,
  adminAlertsHandler,
  adminMonitoringHandler,
  getPaymentConfigHandler,
  updatePaymentConfigHandler,
  testPaymentConfigHandler,
  getEmailConfigHandler,
  updateEmailConfigHandler,
  testEmailConfigHandler,
  getPromoCampaignHandler,
  updatePromoCampaignHandler,
  renewPromoCampaignHandler,
  setUserRoleHandler,
  setUserVerifiedHandler,
  adminPlansHandler,
  createPlanHandler,
  updatePlanHandler,
} from "../../controllers/adminController";
import {
  financingRequestsHandler,
  financingRequestsExportHandler,
  updateFinancingRequestHandler,
  financingIntermediariesHandler,
  financingBranchesHandler,
  createFinancingBranchHandler,
  financingSeatsHandler,
  createFinancingSeatHandler,
  createFinancingIntermediaryHandler,
  updateFinancingIntermediaryHandler,
} from "../../controllers/financingController";
import { requireAdminRole, requirePermission } from "../../middlewares/authGuard";
import { writeRateLimiter, publicRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Every admin route requires a staff user (isAdmin). Beyond that, each route is
// gated by a specific permission from the staff-role matrix (see lib/permissions).
router.use(requireAdminRole);

router.get("/overview", publicRateLimiter, requirePermission("view_admin"), adminOverviewHandler);

// Users — read needs base admin access; the sensitive mutations are gated to the
// matching permission (manage_roles / verify_users / ban_users).
router.get("/users", publicRateLimiter, requirePermission("view_admin"), adminUsersHandler);
router.post("/users/:id/role", writeRateLimiter, requirePermission("manage_roles"), setUserRoleHandler);
router.post("/users/:id/verify", writeRateLimiter, requirePermission("verify_users"), setUserVerifiedHandler);
router.post("/users/:id/ban", writeRateLimiter, requirePermission("ban_users"), setUserBanHandler);

// Listings & moderation.
router.get("/listings", publicRateLimiter, requirePermission("view_admin"), adminListingsHandler);
router.get("/moderation/queue", publicRateLimiter, requirePermission("moderate_listings"), moderationQueueHandler);
router.post("/listings/:id/moderate", writeRateLimiter, requirePermission("moderate_listings"), moderateListingHandler);

router.get("/leads", publicRateLimiter, requirePermission("view_admin"), adminLeadsHandler);
router.get("/ads", publicRateLimiter, requirePermission("view_finance"), adminAdsHandler);

// Reports & fraud.
router.get("/reports", publicRateLimiter, requirePermission("manage_reports"), adminReportsHandler);
router.post("/reports/:id/resolve", writeRateLimiter, requirePermission("manage_reports"), resolveReportHandler);

// Support tickets.
router.get("/support/tickets", publicRateLimiter, requirePermission("manage_support"), supportTicketsHandler);
router.get("/support/tickets/:id", publicRateLimiter, requirePermission("manage_support"), supportTicketHandler);
router.post("/support/tickets/:id/respond", writeRateLimiter, requirePermission("manage_support"), respondTicketHandler);
router.post("/support/tickets/:id/resolve", writeRateLimiter, requirePermission("manage_support"), resolveTicketHandler);

// Financial surfaces.
router.get("/revenue", publicRateLimiter, requirePermission("view_finance"), adminRevenueHandler);
router.get("/analytics", publicRateLimiter, requirePermission("view_finance"), adminAnalyticsHandler);
router.get("/fraud-signals", publicRateLimiter, requirePermission("manage_reports"), fraudSignalsHandler);
router.get("/alerts", publicRateLimiter, requirePermission("view_admin"), adminAlertsHandler);
router.get("/monitoring", publicRateLimiter, requirePermission("view_admin"), adminMonitoringHandler);

// Payment configuration.
router.get("/payment-config", publicRateLimiter, requirePermission("manage_payments"), getPaymentConfigHandler);
router.put("/payment-config", writeRateLimiter, requirePermission("manage_payments"), updatePaymentConfigHandler);
router.post("/payment-config/test", writeRateLimiter, requirePermission("manage_payments"), testPaymentConfigHandler);

// Email / Resend delivery config (admin-managed; gated like payment config).
router.get("/email-config", publicRateLimiter, requirePermission("manage_payments"), getEmailConfigHandler);
router.put("/email-config", writeRateLimiter, requirePermission("manage_payments"), updateEmailConfigHandler);
router.post("/email-config/test", writeRateLimiter, requirePermission("manage_payments"), testEmailConfigHandler);

// Bank-financing CRM. A dedicated permission gates the whole pipeline (read +
// write) so only authorized staff can view and act on finance requests. The
// static /export segment is declared before the :leadId param route.
router.get("/financing/requests", publicRateLimiter, requirePermission("manage_financing"), financingRequestsHandler);
router.get("/financing/requests/export", publicRateLimiter, requirePermission("manage_financing"), financingRequestsExportHandler);
router.patch("/financing/requests/:leadId", writeRateLimiter, requirePermission("manage_financing"), updateFinancingRequestHandler);
router.get("/financing/intermediaries", publicRateLimiter, requirePermission("manage_financing"), financingIntermediariesHandler);
router.post("/financing/intermediaries", writeRateLimiter, requirePermission("manage_financing"), createFinancingIntermediaryHandler);
router.patch("/financing/intermediaries/:id", writeRateLimiter, requirePermission("manage_financing"), updateFinancingIntermediaryHandler);
// FI phase 2 — an institution's branches + employee seats (admin-provisioned).
router.get("/financing/intermediaries/:id/branches", publicRateLimiter, requirePermission("manage_financing"), financingBranchesHandler);
router.post("/financing/intermediaries/:id/branches", writeRateLimiter, requirePermission("manage_financing"), createFinancingBranchHandler);
router.get("/financing/intermediaries/:id/seats", publicRateLimiter, requirePermission("manage_financing"), financingSeatsHandler);
router.post("/financing/intermediaries/:id/seats", writeRateLimiter, requirePermission("manage_financing"), createFinancingSeatHandler);

// Promo ad-credit campaign — the separate virtual ad-only allowance. Gated to
// the same finance-grade permission as payments since it governs free credit.
router.get("/promo-campaign", publicRateLimiter, requirePermission("manage_payments"), getPromoCampaignHandler);
router.put("/promo-campaign", writeRateLimiter, requirePermission("manage_payments"), updatePromoCampaignHandler);
router.post("/promo-campaign/renew", writeRateLimiter, requirePermission("manage_payments"), renewPromoCampaignHandler);

// Plans — the platform's economic levers (pricing/quotas/CPL/boost/ranking).
// Gated by manage_payments (owner + admin), like the other monetization config.
router.get("/plans", publicRateLimiter, requirePermission("manage_payments"), adminPlansHandler);
router.post("/plans", writeRateLimiter, requirePermission("manage_payments"), createPlanHandler);
router.patch("/plans/:id", writeRateLimiter, requirePermission("manage_payments"), updatePlanHandler);

export default router;
