import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { createReport } from "./ReportService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { auditLog, listings, reports } from "@workspace/db/schema";

const uids: string[] = [];
const listingIds: string[] = [];

/** A listing owner + their fresh active listing. */
async function ownerWithListing(): Promise<{ ownerId: string; listingId: string }> {
  const ownerId = await createUser({ role: "dealer" });
  uids.push(ownerId);
  const listingId = randomUUID();
  listingIds.push(listingId);
  await db.insert(listings).values({
    id: listingId,
    userId: ownerId,
    title: uniq("report"),
    category: "car",
    basePriceCash: "500000",
    location: "Cairo",
  });
  return { ownerId, listingId };
}

/** A separate user who files reports. */
async function reporter(): Promise<string> {
  const id = await createUser({ role: "individual" });
  uids.push(id);
  return id;
}

describe("createReport (abuse hardening)", () => {
  it("does NOT change the listing's status — only an admin can hide a listing", async () => {
    const { listingId } = await ownerWithListing();
    const reporterId = await reporter();

    const report = await createReport({ listingId, reporterUserId: reporterId, reason: "scam" });
    expect(report.status).toBe("open");

    const [row] = await db
      .select({ status: listings.status })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    expect(row.status).toBe("active"); // still live despite the report
  });

  it("de-duplicates: re-reporting while a report is open returns the existing one, no second row", async () => {
    const { listingId } = await ownerWithListing();
    const reporterId = await reporter();

    const first = await createReport({ listingId, reporterUserId: reporterId, reason: "fake_price" });
    const second = await createReport({ listingId, reporterUserId: reporterId, reason: "scam" });

    expect(second.id).toBe(first.id); // same report, not a new one
    expect(second.reason).toBe("fake_price"); // returns the original, unchanged

    const rows = await db.select().from(reports).where(eq(reports.listingId, listingId));
    expect(rows).toHaveLength(1);
  });

  it("enforces one OPEN report per (reporter, listing) at the DB level", async () => {
    const { listingId } = await ownerWithListing();
    const reporterId = await reporter();

    await db.insert(reports).values({ listingId, reporterUserId: reporterId, reason: "scam", status: "open" });
    // A second OPEN report for the same pair must be rejected by the partial
    // unique index (backstop against the read-then-insert race in createReport).
    await expect(
      db.insert(reports).values({ listingId, reporterUserId: reporterId, reason: "duplicate", status: "open" }),
    ).rejects.toThrow();
  });
});

afterAll(async () => {
  // createReport fires writeAudit (fire-and-forget via setImmediate) → audit_log
  // rows whose listing_id is set-null on listing delete. Drain the writer first
  // (one setImmediate tick lets every queued callback start; the timeout covers
  // its async insert round-trip) so no late insert lands AFTER we clean up. The
  // test bodies finished long before this runs, so nothing schedules new audit
  // writes past this point — the queue is empty once drained.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 200));
  if (listingIds.length) {
    // Clean audit rows BEFORE the listings so none are left orphaned (set-null)
    // in the shared prod DB.
    await db.delete(auditLog).where(inArray(auditLog.listingId, listingIds));
  }
  if (uids.length) {
    // reports cascade on listing delete; listings.userId is NOT cascade, so
    // delete listings (→ their reports) before the owning/reporting users.
    await db.delete(listings).where(inArray(listings.userId, uids));
    await deleteUsers(...uids);
  }
});
