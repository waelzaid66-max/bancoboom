import { db } from "@workspace/db";
import { reports, listings, users } from "@workspace/db/schema";
import { and, desc, eq, lt, sql, type SQL } from "drizzle-orm";
import { writeAudit, validateReport } from "./AbuseService";
import { isUniqueViolation } from "../lib/billing";

type ReportRow = {
  id: string;
  listing_id: string;
  listing_title: string | null;
  reason: "fake_price" | "wrong_data" | "scam" | "duplicate" | "other";
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  reporter_name: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

function serializeReport(r: {
  id: string;
  listingId: string;
  listingTitle: string | null;
  reason: ReportRow["reason"];
  details: string | null;
  status: ReportRow["status"];
  reporterName: string | null;
  resolutionNote: string | null;
  createdAt: Date | null;
  resolvedAt: Date | null;
}): ReportRow {
  return {
    id: r.id,
    listing_id: r.listingId,
    listing_title: r.listingTitle,
    reason: r.reason,
    details: r.details,
    status: r.status,
    reporter_name: r.reporterName,
    resolution_note: r.resolutionNote,
    created_at: (r.createdAt ?? new Date()).toISOString(),
    resolved_at: r.resolvedAt ? r.resolvedAt.toISOString() : null,
  };
}

/**
 * The single OPEN report (if any) a given reporter has on a given listing,
 * shaped for serializeReport. Used both for the pre-insert de-dup check and as
 * the race backstop when the partial unique index rejects a concurrent insert.
 */
async function findOpenReport(listingId: string, reporterUserId: string) {
  const [existing] = await db
    .select({
      id: reports.id,
      listingId: reports.listingId,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      reporterName: users.name,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .leftJoin(users, eq(reports.reporterUserId, users.id))
    .where(
      and(
        eq(reports.listingId, listingId),
        eq(reports.reporterUserId, reporterUserId),
        eq(reports.status, "open")
      )
    )
    .limit(1);
  return existing;
}

/**
 * Public: a buyer/visitor reports a listing. The report is recorded with status
 * `open` and surfaced to admins via the moderation queue (listReports /
 * countOpenReports), plus an audit-trail marker. Filing a report does NOT
 * change the listing's status — a single user report must never be able to hide
 * live inventory (that was a competitor-takedown / DoS vector). Only an admin
 * moderation action (moderateListing) can hide a listing. Re-reporting the same
 * listing while a prior report is still open is de-duplicated per reporter.
 */
export async function createReport(input: {
  listingId: string;
  reporterUserId: string | null;
  reason: ReportRow["reason"];
  details?: string;
}): Promise<ReportRow> {
  const [listing] = await db
    .select({ id: listings.id, title: listings.title })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!listing) {
    throw Object.assign(new Error("Listing not found"), { code: "NOT_FOUND" });
  }

  // Report flood guard: reject excess submissions before touching the DB.
  // A single authenticated user filing more reports than the hourly cap is
  // treated as a moderation-queue poisoning attempt. This is a defence-in-
  // depth layer — the real invariant is that createReport does NOT change
  // listing status; only an explicit admin moderation action can do that.
  if (input.reporterUserId) {
    const rateCheck = await validateReport({
      reporterUserId: input.reporterUserId,
      listingId: input.listingId,
    });
    if (!rateCheck.ok) {
      throw Object.assign(new Error("Too many reports, please try again later"), {
        code: "RATE_LIMITED",
      });
    }
  }

  // Duplicate suppression: at most one OPEN report per (reporter, listing).
  // Re-reporting returns the existing open report instead of stacking
  // duplicates in the moderation queue. The route uses requireDbUser, so a
  // reporterUserId is always present for accountability and de-duplication.
  if (input.reporterUserId) {
    const existing = await findOpenReport(input.listingId, input.reporterUserId);
    if (existing) {
      return serializeReport({ ...existing, listingTitle: listing.title });
    }
  }

  let created: typeof reports.$inferSelect | undefined;
  try {
    [created] = await db
      .insert(reports)
      .values({
        listingId: input.listingId,
        reporterUserId: input.reporterUserId,
        reason: input.reason,
        details: input.details ?? null,
        status: "open",
      })
      .returning();
  } catch (err) {
    // Race backstop: the partial unique index uq_reports_open_reporter_listing
    // enforces one OPEN report per (listing, reporter) even when two requests
    // slip past the read-then-insert check above concurrently. The loser of
    // that race gets the already-open report instead of a surfaced 500.
    if (isUniqueViolation(err) && input.reporterUserId) {
      const existing = await findOpenReport(input.listingId, input.reporterUserId);
      if (existing) {
        return serializeReport({ ...existing, listingTitle: listing.title });
      }
    }
    throw err;
  }

  // Filing a report does NOT change the listing's status. Auto-routing an
  // active listing to `pending_review` on a single report was a
  // competitor-takedown / DoS vector — any one authenticated user could hide
  // live inventory. Reports surface to admins via the moderation queue; only an
  // explicit admin moderation action (moderateListing) hides a listing.

  writeAudit({
    eventType: "flagged_listing",
    severity: "info",
    actorUserId: input.reporterUserId,
    listingId: input.listingId,
    reason: `report:${input.reason}`,
    metadata: { source: "user_report", report_id: created!.id },
  });

  let reporterName: string | null = null;
  if (input.reporterUserId) {
    const [reporter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, input.reporterUserId))
      .limit(1);
    reporterName = reporter?.name ?? null;
  }

  return serializeReport({
    id: created!.id,
    listingId: created!.listingId,
    listingTitle: listing.title,
    reason: created!.reason,
    details: created!.details,
    status: created!.status,
    reporterName,
    resolutionNote: created!.resolutionNote,
    createdAt: created!.createdAt,
    resolvedAt: created!.resolvedAt,
  });
}

/** Admin: list reports, newest first, optional status filter, cursor paged. */
export async function listReports(params: {
  status?: ReportRow["status"];
  cursor?: string;
  limit: number;
}): Promise<{ items: ReportRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(reports.status, params.status));
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(lt(reports.createdAt, cursorDate));
    }
  }

  const rows = await db
    .select({
      id: reports.id,
      listingId: reports.listingId,
      listingTitle: listings.title,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      reporterName: users.name,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(users, eq(reports.reporterUserId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(reports.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  return {
    items: page.map(serializeReport),
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

/** Admin: resolve / dismiss / mark-reviewing a report. Audited. */
export async function resolveReport(params: {
  reportId: string;
  adminUserId: string;
  status: "resolved" | "dismissed" | "reviewing";
  note?: string;
}): Promise<ReportRow> {
  const [existing] = await db
    .select({ id: reports.id, listingId: reports.listingId })
    .from(reports)
    .where(eq(reports.id, params.reportId))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("Report not found"), { code: "NOT_FOUND" });
  }

  const isTerminal = params.status === "resolved" || params.status === "dismissed";
  await db
    .update(reports)
    .set({
      status: params.status,
      resolutionNote: params.note ?? null,
      resolvedByUserId: isTerminal ? params.adminUserId : null,
      resolvedAt: isTerminal ? new Date() : null,
    })
    .where(eq(reports.id, params.reportId));

  writeAudit({
    eventType: "admin_action",
    severity: "info",
    actorUserId: params.adminUserId,
    listingId: existing.listingId,
    reason: `report_${params.status}`,
    metadata: { report_id: params.reportId, note: params.note ?? null },
  });

  const [row] = await db
    .select({
      id: reports.id,
      listingId: reports.listingId,
      listingTitle: listings.title,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      reporterName: users.name,
      resolutionNote: reports.resolutionNote,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
    })
    .from(reports)
    .leftJoin(listings, eq(reports.listingId, listings.id))
    .leftJoin(users, eq(reports.reporterUserId, users.id))
    .where(eq(reports.id, params.reportId))
    .limit(1);

  return serializeReport(row!);
}

/** Count of currently open reports (overview KPI). */
export async function countOpenReports(): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.status, "open"));
  return row?.c ?? 0;
}
