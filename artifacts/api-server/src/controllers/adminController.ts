import type { Request, Response } from "express";
import { ZodError, z } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  AdminUsersQuerySchema,
  SetUserBanSchema,
  SetUserRoleSchema,
  SetUserVerifiedSchema,
  AdminListingsQuerySchema,
  ModerationQueueQuerySchema,
  ModerateListingSchema,
  AdminLeadsQuerySchema,
  AdminAdsQuerySchema,
  AdminReportsQuerySchema,
  ResolveReportSchema,
  SupportTicketsQuerySchema,
  RespondSupportTicketSchema,
  ResolveSupportTicketSchema,
  AdminUserSchema,
  AdminListingSchema,
  AdminLeadSchema,
  AdminAdSchema,
  ReportSchema,
  SupportTicketSchema,
  RevenueSummarySchema,
  AdminAnalyticsSchema,
  FraudSignalSchema,
  AlertSchema,
  MonitoringSchema,
  AdminOverviewSchema,
  PaymentConfigUpdateSchema,
  PaymentConfigViewSchema,
  PaymentConfigTestResultSchema,
  EmailConfigUpdateSchema,
  EmailConfigViewSchema,
  EmailConfigTestResultSchema,
  PromoCampaignUpdateSchema,
  PromoCampaignViewSchema,
  PlanUpdateSchema,
  PlanCreateSchema,
  PlanItemSchema,
} from "../validators/schemas";
import * as AdminService from "../services/AdminService";
import {
  listPlansAdmin,
  updatePlanAdmin,
  createPlanAdmin,
  type PlanWriteInput,
} from "../services/AdminPlanService";
import { listReports, resolveReport } from "../services/ReportService";
import {
  listTickets,
  getTicket,
  respondTicket,
  setTicketStatus,
} from "../services/SupportService";
import { getMetricsSnapshot } from "../lib/metrics";
import {
  getAdminView,
  upsertConfig,
  type PaymentConfigUpdate,
} from "../services/PaymentConfigService";
import {
  getAdminView as getEmailAdminView,
  upsertConfig as upsertEmailConfig,
  testConnection as testEmailConnection,
  type EmailConfigUpdate,
} from "../services/EmailConfigService";
import {
  getCampaignAdminView,
  upsertCampaignConfig,
  renewCampaign,
  type CampaignConfigUpdate,
} from "../services/PromoAdCreditService";
import { testProviderConnection } from "../lib/paymentProvider";
import { writeAudit } from "../services/AbuseService";

function handleError(res: Response, err: unknown, label: string, fallback: string) {
  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const e = err as { code?: string; message?: string };
  if (e.code === "NOT_FOUND") {
    return res.status(404).json(errorResponse("NOT_FOUND", e.message ?? "Not found"));
  }
  if (e.code === "FORBIDDEN") {
    return res.status(403).json(errorResponse("FORBIDDEN", e.message ?? "Forbidden"));
  }
  if (e.code === "INVALID_DATA") {
    return res.status(400).json(errorResponse("INVALID_DATA", e.message ?? "Invalid data"));
  }
  console.error(label, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", fallback));
}

/* ── Overview ──────────────────────────────────────────── */

export async function adminOverviewHandler(_req: Request, res: Response) {
  try {
    const data = await AdminService.overview();
    return res.json(successResponse(validateResponse(AdminOverviewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin overview]", "Failed to load overview");
  }
}

/* ── Users ─────────────────────────────────────────────── */

export async function adminUsersHandler(req: Request, res: Response) {
  try {
    const query = AdminUsersQuerySchema.parse(req.query);
    const result = await AdminService.listUsers(query);
    const validated = validateResponse(AdminUserSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin users]", "Failed to load users");
  }
}

export async function setUserBanHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = SetUserBanSchema.parse(req.body);
    const result = await AdminService.setUserBan({
      targetUserId: id,
      adminUserId: req.dbUserId!,
      actorStaffRole: req.staffRole ?? "user",
      banned: input.banned,
      reason: input.reason,
    });
    return res.json(successResponse(validateResponse(AdminUserSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin ban]", "Failed to update user");
  }
}

export async function setUserRoleHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = SetUserRoleSchema.parse(req.body);
    const result = await AdminService.setUserRole({
      targetUserId: id,
      actorUserId: req.dbUserId!,
      role: input.role,
    });
    return res.json(successResponse(validateResponse(AdminUserSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin set role]", "Failed to update user role");
  }
}

export async function setUserVerifiedHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = SetUserVerifiedSchema.parse(req.body);
    const result = await AdminService.setUserVerified({
      targetUserId: id,
      actorUserId: req.dbUserId!,
      verified: input.verified,
    });
    return res.json(successResponse(validateResponse(AdminUserSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin verify]", "Failed to update verification");
  }
}

/* ── Listings & moderation ─────────────────────────────── */

export async function adminListingsHandler(req: Request, res: Response) {
  try {
    const query = AdminListingsQuerySchema.parse(req.query);
    const result = await AdminService.listListings(query);
    const validated = validateResponse(AdminListingSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin listings]", "Failed to load listings");
  }
}

export async function moderationQueueHandler(req: Request, res: Response) {
  try {
    const query = ModerationQueueQuerySchema.parse(req.query);
    const result = await AdminService.moderationQueue(query);
    const validated = validateResponse(AdminListingSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin moderation queue]", "Failed to load queue");
  }
}

export async function moderateListingHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = ModerateListingSchema.parse(req.body);
    const result = await AdminService.moderateListing({
      listingId: id,
      adminUserId: req.dbUserId!,
      action: input.action,
      reason: input.reason,
    });
    return res.json(successResponse(validateResponse(AdminListingSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin moderate]", "Failed to moderate listing");
  }
}

/* ── Leads & ads ───────────────────────────────────────── */

export async function adminLeadsHandler(req: Request, res: Response) {
  try {
    const query = AdminLeadsQuerySchema.parse(req.query);
    const result = await AdminService.listLeads(query);
    const validated = validateResponse(AdminLeadSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin leads]", "Failed to load leads");
  }
}

export async function adminAdsHandler(req: Request, res: Response) {
  try {
    const query = AdminAdsQuerySchema.parse(req.query);
    const result = await AdminService.listAds(query);
    const validated = validateResponse(AdminAdSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin ads]", "Failed to load ads");
  }
}

/* ── Reports ───────────────────────────────────────────── */

export async function adminReportsHandler(req: Request, res: Response) {
  try {
    const query = AdminReportsQuerySchema.parse(req.query);
    const result = await listReports(query);
    const validated = validateResponse(ReportSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin reports]", "Failed to load reports");
  }
}

export async function resolveReportHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = ResolveReportSchema.parse(req.body);
    const result = await resolveReport({
      reportId: id,
      adminUserId: req.dbUserId!,
      status: input.status,
      note: input.note,
    });
    return res.json(successResponse(validateResponse(ReportSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin resolve report]", "Failed to resolve report");
  }
}

/* ── Support ───────────────────────────────────────────── */

export async function supportTicketsHandler(req: Request, res: Response) {
  try {
    const query = SupportTicketsQuerySchema.parse(req.query);
    const result = await listTickets(query);
    const validated = validateResponse(SupportTicketSchema.array(), result.items);
    return res.json(successResponse(validated, { cursor: result.cursor, has_next: result.has_next }));
  } catch (err) {
    return handleError(res, err, "[Admin tickets]", "Failed to load tickets");
  }
}

export async function supportTicketHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const result = await getTicket(id);
    return res.json(successResponse(validateResponse(SupportTicketSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin ticket]", "Failed to load ticket");
  }
}

export async function respondTicketHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = RespondSupportTicketSchema.parse(req.body);
    const result = await respondTicket({
      ticketId: id,
      adminUserId: req.dbUserId!,
      message: input.message,
    });
    return res.json(successResponse(validateResponse(SupportTicketSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin respond ticket]", "Failed to respond to ticket");
  }
}

export async function resolveTicketHandler(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const input = ResolveSupportTicketSchema.parse(req.body);
    const result = await setTicketStatus({
      ticketId: id,
      adminUserId: req.dbUserId!,
      status: input.status,
    });
    return res.json(successResponse(validateResponse(SupportTicketSchema, result)));
  } catch (err) {
    return handleError(res, err, "[Admin resolve ticket]", "Failed to update ticket");
  }
}

/* ── Revenue / analytics / fraud / alerts / monitoring ─── */

export async function adminRevenueHandler(_req: Request, res: Response) {
  try {
    const data = await AdminService.revenueSummary();
    return res.json(successResponse(validateResponse(RevenueSummarySchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin revenue]", "Failed to load revenue");
  }
}

export async function adminAnalyticsHandler(_req: Request, res: Response) {
  try {
    const data = await AdminService.analytics();
    return res.json(successResponse(validateResponse(AdminAnalyticsSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin analytics]", "Failed to load analytics");
  }
}

export async function fraudSignalsHandler(_req: Request, res: Response) {
  try {
    const data = await AdminService.fraudSignals();
    return res.json(successResponse(validateResponse(FraudSignalSchema.array(), data)));
  } catch (err) {
    return handleError(res, err, "[Admin fraud]", "Failed to load fraud signals");
  }
}

export async function adminAlertsHandler(_req: Request, res: Response) {
  try {
    const data = await AdminService.alerts();
    return res.json(successResponse(validateResponse(AlertSchema.array(), data)));
  } catch (err) {
    return handleError(res, err, "[Admin alerts]", "Failed to load alerts");
  }
}

export async function adminMonitoringHandler(_req: Request, res: Response) {
  try {
    const data = getMetricsSnapshot();
    return res.json(successResponse(validateResponse(MonitoringSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin monitoring]", "Failed to load monitoring");
  }
}

/* ── Payment provider config ───────────────────────────── */

export async function getPaymentConfigHandler(_req: Request, res: Response) {
  try {
    const data = await getAdminView();
    return res.json(successResponse(validateResponse(PaymentConfigViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin payment-config get]", "Failed to load payment config");
  }
}

export async function updatePaymentConfigHandler(req: Request, res: Response) {
  try {
    const body = PaymentConfigUpdateSchema.parse(req.body);

    // Map the snake_case wire shape to the service's camelCase update shape.
    // Keys left `undefined` mean "not provided" — the service preserves the
    // stored value (write-only secrets, keep-existing optional fields).
    const input: PaymentConfigUpdate = {
      enabled: body.enabled,
      mode: body.mode,
      publicKey: body.public_key,
      integrationIds: body.integration_ids,
      apiBase: body.api_base,
      secretKey: body.secret_key,
      hmacSecret: body.hmac_secret,
    };

    await upsertConfig(input, req.dbUserId!);

    // Audit trail — record WHICH fields changed, never the secret values.
    const changed = Object.entries(body)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "payment_config_update",
      metadata: {
        action: "payment_config_update",
        changed_fields: changed,
        enabled: body.enabled,
        mode: body.mode,
        secret_key_rotated: Boolean(body.secret_key && body.secret_key.trim()),
        hmac_secret_rotated: Boolean(body.hmac_secret && body.hmac_secret.trim()),
      },
    });

    const data = await getAdminView();
    return res.json(successResponse(validateResponse(PaymentConfigViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin payment-config update]", "Failed to update payment config");
  }
}

export async function testPaymentConfigHandler(req: Request, res: Response) {
  try {
    const data = await testProviderConnection();
    writeAudit({
      eventType: "admin_action",
      severity: "info",
      actorUserId: req.dbUserId ?? null,
      reason: "payment_config_test",
      metadata: {
        action: "payment_config_test",
        ok: data.ok,
        mode: data.mode,
        source: data.source,
      },
    });
    return res.json(
      successResponse(validateResponse(PaymentConfigTestResultSchema, data))
    );
  } catch (err) {
    return handleError(res, err, "[Admin payment-config test]", "Failed to test payment config");
  }
}

/* ── Email provider config ─────────────────────────────── */

export async function getEmailConfigHandler(_req: Request, res: Response) {
  try {
    const data = await getEmailAdminView();
    return res.json(successResponse(validateResponse(EmailConfigViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin email-config get]", "Failed to load email config");
  }
}

export async function updateEmailConfigHandler(req: Request, res: Response) {
  try {
    const body = EmailConfigUpdateSchema.parse(req.body);

    // Map the snake_case wire shape to the service's camelCase update shape.
    // Keys left `undefined` mean "not provided" — the service preserves the
    // stored value (write-only API key, keep-existing optional fields).
    const input: EmailConfigUpdate = {
      enabled: body.enabled,
      fromName: body.from_name,
      fromEmail: body.from_email,
      sendingDomain: body.sending_domain,
      replyTo: body.reply_to,
      publicAppUrl: body.public_app_url,
      apiKey: body.api_key,
    };

    await upsertEmailConfig(input, req.dbUserId!);

    // Audit trail — record WHICH fields changed, never the secret value.
    const changed = Object.entries(body)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "email_config_update",
      metadata: {
        action: "email_config_update",
        changed_fields: changed,
        enabled: body.enabled,
        api_key_rotated: Boolean(body.api_key && body.api_key.trim()),
      },
    });

    const data = await getEmailAdminView();
    return res.json(successResponse(validateResponse(EmailConfigViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin email-config update]", "Failed to update email config");
  }
}

export async function testEmailConfigHandler(req: Request, res: Response) {
  try {
    const data = await testEmailConnection();
    writeAudit({
      eventType: "admin_action",
      severity: "info",
      actorUserId: req.dbUserId ?? null,
      reason: "email_config_test",
      metadata: {
        action: "email_config_test",
        ok: data.ok,
        active_transport: data.active_transport,
        source: data.source,
      },
    });
    return res.json(
      successResponse(validateResponse(EmailConfigTestResultSchema, data))
    );
  } catch (err) {
    return handleError(res, err, "[Admin email-config test]", "Failed to test email config");
  }
}

/* ── Promo ad-credit campaign ──────────────────────────── */

// Map the snake_case wire shape to the service's camelCase update shape.
// Omitted keys mean "not provided" — the service preserves the stored value.
function toCampaignUpdate(
  body: ReturnType<typeof PromoCampaignUpdateSchema.parse>,
): CampaignConfigUpdate {
  return {
    enabled: body.enabled,
    verifiedMonthlyAmount: body.verified_monthly_amount,
    unverifiedMonthlyAmount: body.unverified_monthly_amount,
    durationMonths: body.duration_months,
  };
}

export async function getPromoCampaignHandler(_req: Request, res: Response) {
  try {
    const data = await getCampaignAdminView();
    return res.json(successResponse(validateResponse(PromoCampaignViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin promo-campaign get]", "Failed to load promo campaign");
  }
}

export async function updatePromoCampaignHandler(req: Request, res: Response) {
  try {
    const body = PromoCampaignUpdateSchema.parse(req.body);
    const data = await upsertCampaignConfig(toCampaignUpdate(body), req.dbUserId!);
    const changed = Object.entries(body)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "promo_campaign_update",
      metadata: { action: "promo_campaign_update", changed_fields: changed },
    });
    return res.json(successResponse(validateResponse(PromoCampaignViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin promo-campaign update]", "Failed to update promo campaign");
  }
}

export async function renewPromoCampaignHandler(req: Request, res: Response) {
  try {
    const body = PromoCampaignUpdateSchema.parse(req.body ?? {});
    const data = await renewCampaign(toCampaignUpdate(body), req.dbUserId!);
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "promo_campaign_renew",
      metadata: {
        action: "promo_campaign_renew",
        campaign_version: data.campaign_version,
      },
    });
    return res.json(successResponse(validateResponse(PromoCampaignViewSchema, data)));
  } catch (err) {
    return handleError(res, err, "[Admin promo-campaign renew]", "Failed to renew promo campaign");
  }
}

/* ── Plans (control keys: pricing / quotas / CPL / boost / ranking) ───── */
function toPlanWriteInput(body: z.infer<typeof PlanUpdateSchema>): PlanWriteInput {
  return {
    name: body.name,
    nameAr: body.name_ar,
    audience: body.audience,
    isBaseline: body.is_baseline,
    monthlyPrice: body.monthly_price,
    listingQuota: body.listing_quota,
    activeListingCap: body.active_listing_cap,
    boostPrice: body.boost_price,
    cplWhatsapp: body.cpl_whatsapp,
    cplCall: body.cpl_call,
    cplChat: body.cpl_chat,
    cplFinanceRequest: body.cpl_finance_request,
    rankingWeight: body.ranking_weight,
    features: body.features,
    isActive: body.is_active,
    sortOrder: body.sort_order,
  };
}

export async function adminPlansHandler(_req: Request, res: Response) {
  try {
    const data = await listPlansAdmin();
    return res.json(successResponse(validateResponse(PlanItemSchema.array(), data), { total: data.length }));
  } catch (err) {
    return handleError(res, err, "[Admin plans list]", "Failed to load plans");
  }
}

export async function updatePlanHandler(req: Request, res: Response) {
  try {
    const body = PlanUpdateSchema.parse(req.body ?? {});
    const updated = await updatePlanAdmin(req.params.id as string, toPlanWriteInput(body));
    if (!updated) {
      return res.status(404).json(errorResponse("NOT_FOUND", "Plan not found"));
    }
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "plan_update",
      metadata: { action: "plan_update", plan_id: updated.id, fields: Object.keys(body) },
    });
    return res.json(successResponse(validateResponse(PlanItemSchema, updated)));
  } catch (err) {
    return handleError(res, err, "[Admin plan update]", "Failed to update plan");
  }
}

export async function createPlanHandler(req: Request, res: Response) {
  try {
    const body = PlanCreateSchema.parse(req.body ?? {});
    const created = await createPlanAdmin({ ...toPlanWriteInput(body), slug: body.slug, name: body.name });
    writeAudit({
      eventType: "admin_action",
      severity: "warning",
      actorUserId: req.dbUserId ?? null,
      reason: "plan_create",
      metadata: { action: "plan_create", plan_id: created.id, slug: created.slug },
    });
    return res.json(successResponse(validateResponse(PlanItemSchema, created)));
  } catch (err) {
    return handleError(res, err, "[Admin plan create]", "Failed to create plan");
  }
}
