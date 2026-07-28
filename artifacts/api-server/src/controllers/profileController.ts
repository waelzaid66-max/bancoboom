import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  successResponse,
  errorResponse,
  validateResponse,
  SocialLinkSchema,
  SetSocialLinksSchema,
  NotificationPreferenceSchema,
  SetNotificationPreferencesSchema,
  SavedSearchSchema,
  CreateSavedSearchSchema,
  UpdateSavedSearchSchema,
  DeleteSavedSearchResultSchema,
  CompanyStatsSchema,
  FeedItemSchema,
  DealerListingsQuerySchema,
  DealerListingItemSchema,
} from "../validators/schemas";
import { getMyListings } from "../services/CompanyService";
import { getMyManagedListings } from "../services/ListingService";
import {
  getMySocialLinks,
  setMySocialLinks,
  getMyNotificationPreferences,
  setMyNotificationPreferences,
  listMySavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  getMyMetrics,
} from "../services/ProfileService";

/**
 * Identity sub-resource controllers (Task #38). Every handler is owner-scoped
 * via req.userId (Clerk) — there is no path that reads or mutates another
 * user's social links / preferences / saved searches.
 */

function handleError(res: Response, err: unknown, ctx: string) {
  if (err instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("INVALID_DATA", err.errors[0]?.message ?? "Invalid data"));
  }
  const code = (err as { code?: string })?.code;
  if (code === "INVALID_DATA") {
    return res.status(400).json(errorResponse("INVALID_DATA", (err as Error).message));
  }
  if (code === "NOT_FOUND") {
    return res.status(404).json(errorResponse("NOT_FOUND", (err as Error).message || "Not found"));
  }
  if (code === "UNAUTHORIZED") {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Unauthorized"));
  }
  console.error(ctx, err);
  return res.status(500).json(errorResponse("INTERNAL_ERROR", "Request failed"));
}

/* ── Social links ──────────────────────────────────────── */

export async function getMySocialLinksHandler(req: Request, res: Response) {
  try {
    const links = await getMySocialLinks(req.userId!);
    return res.json(successResponse(validateResponse(z.array(SocialLinkSchema), links)));
  } catch (err) {
    return handleError(res, err, "[SocialLinks get]");
  }
}

export async function setMySocialLinksHandler(req: Request, res: Response) {
  try {
    const body = SetSocialLinksSchema.parse(req.body);
    const links = await setMySocialLinks(req.userId!, body.links);
    return res.json(successResponse(validateResponse(z.array(SocialLinkSchema), links)));
  } catch (err) {
    return handleError(res, err, "[SocialLinks set]");
  }
}

/* ── Notification preferences ──────────────────────────── */

export async function getMyNotificationPreferencesHandler(req: Request, res: Response) {
  try {
    const prefs = await getMyNotificationPreferences(req.userId!);
    return res.json(successResponse(validateResponse(z.array(NotificationPreferenceSchema), prefs)));
  } catch (err) {
    return handleError(res, err, "[NotifPrefs get]");
  }
}

export async function setMyNotificationPreferencesHandler(req: Request, res: Response) {
  try {
    const body = SetNotificationPreferencesSchema.parse(req.body);
    const prefs = await setMyNotificationPreferences(req.userId!, body.preferences);
    return res.json(successResponse(validateResponse(z.array(NotificationPreferenceSchema), prefs)));
  } catch (err) {
    return handleError(res, err, "[NotifPrefs set]");
  }
}

/* ── Saved searches ────────────────────────────────────── */

export async function listMySavedSearchesHandler(req: Request, res: Response) {
  try {
    const items = await listMySavedSearches(req.userId!);
    return res.json(successResponse(validateResponse(z.array(SavedSearchSchema), items)));
  } catch (err) {
    return handleError(res, err, "[SavedSearches list]");
  }
}

export async function createSavedSearchHandler(req: Request, res: Response) {
  try {
    const body = CreateSavedSearchSchema.parse(req.body);
    const item = await createSavedSearch(req.userId!, body);
    return res.status(201).json(successResponse(validateResponse(SavedSearchSchema, item)));
  } catch (err) {
    return handleError(res, err, "[SavedSearches create]");
  }
}

export async function updateSavedSearchHandler(req: Request, res: Response) {
  try {
    const body = UpdateSavedSearchSchema.parse(req.body);
    const item = await updateSavedSearch(req.userId!, String(req.params.id), body);
    return res.json(successResponse(validateResponse(SavedSearchSchema, item)));
  } catch (err) {
    return handleError(res, err, "[SavedSearches update]");
  }
}

export async function deleteSavedSearchHandler(req: Request, res: Response) {
  try {
    const result = await deleteSavedSearch(req.userId!, String(req.params.id));
    return res.json(successResponse(validateResponse(DeleteSavedSearchResultSchema, result)));
  } catch (err) {
    return handleError(res, err, "[SavedSearches delete]");
  }
}

/* ── Profile metrics (REAL) ────────────────────────────── */

export async function getMyMetricsHandler(req: Request, res: Response) {
  try {
    const stats = await getMyMetrics(req.userId!);
    return res.json(successResponse(validateResponse(CompanyStatsSchema, stats)));
  } catch (err) {
    return handleError(res, err, "[Metrics get]");
  }
}

const MyListingsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Owner-scoped "my listings" for the Instagram-style profile grid. Role-agnostic:
 * works for individuals and businesses alike. The service resolves the DB owner
 * from the caller's Clerk id (req.userId), mirroring every other /me handler.
 */
export async function getMyListingsHandler(req: Request, res: Response) {
  try {
    const query = MyListingsQuerySchema.parse(req.query);
    const result = await getMyListings(req.userId!, query.cursor, query.limit);
    const validated = validateResponse(FeedItemSchema.array(), result.items);
    return res.json(
      successResponse(validated, { cursor: result.cursor, has_next: result.has_next })
    );
  } catch (err) {
    return handleError(res, err, "[My listings]");
  }
}

/**
 * Owner-scoped listing MANAGEMENT for any role (individuals + businesses).
 * Returns the rich DealerListingItem shape (status/created_at/views/clicks/
 * leads/price_display) so individuals can see and manage their own catalogue
 * without the dealer-role gate. The service resolves the DB owner from the
 * caller's Clerk id (req.userId) and is strictly owner-scoped.
 */
export async function getMyManagedListingsHandler(req: Request, res: Response) {
  try {
    const query = DealerListingsQuerySchema.parse(req.query);
    const result = await getMyManagedListings(req.userId!, query);
    const validated = validateResponse(DealerListingItemSchema.array(), result.items);
    return res.json(
      successResponse(validated, { cursor: result.cursor, has_next: result.has_next })
    );
  } catch (err) {
    return handleError(res, err, "[My managed listings]");
  }
}
