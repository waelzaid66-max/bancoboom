import { describe, it, expect, afterAll } from "vitest";
import { sql, eq } from "drizzle-orm";
import { validateLead, validateImpression, writeAudit } from "./AbuseService";
import { getOrCreateSession } from "./AdaptiveFeedEngine";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import { auditLog, rateEvents, dedupKeys } from "@workspace/db/schema";

// Single run token embedded in every counter/dedup key this file produces so we
// can scrub exactly our own rows from the shared durable tables on teardown.
const run = randomUUID();
const uids: string[] = [];

describe("validateLead (money-path click fraud)", () => {
  it("accepts a first, legitimate lead", async () => {
    const d = await validateLead({
      listingId: randomUUID(),
      sellerId: randomUUID(),
      buyerId: `buyer_${run}_accept`,
      ip: `ip_${run}_accept`,
    });
    expect(d.ok).toBe(true);
  });

  it("blocks an identical duplicate lead within 60s", async () => {
    const buyerId = `buyer_${run}_dup`;
    const sellerId = randomUUID();
    const listingId = randomUUID();
    const first = await validateLead({ listingId, sellerId, buyerId });
    const second = await validateLead({ listingId, sellerId, buyerId });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("duplicate_within_60s");
  });

  it("blocks once the per-user lead rate is exceeded", async () => {
    const buyerId = `buyer_${run}_rate`;
    const sellerId = randomUUID();
    let last: Awaited<ReturnType<typeof validateLead>> | undefined;
    for (let i = 0; i < 12; i++) {
      last = await validateLead({ listingId: randomUUID(), sellerId, buyerId });
    }
    expect(last?.ok).toBe(false);
    expect(last?.reason).toBe("lead_rate_exceeded");
  });

  it("blocks bot-like per-IP click bursts", async () => {
    const ip = `ip_${run}_burst`;
    // Pre-seed exactly MAX_IP_CLICK_BURST (15) in-window clicks for this IP via
    // the same durable counter ("ip_clicks") the detector reads, in ONE batched
    // insert. Driving all 16 clicks through validateLead made this flaky on a
    // slow/loaded shared DB: each call does ~9 round-trips, so 16 serial calls
    // can take longer than the 10s burst window — the earliest clicks then age
    // out and the count never crosses the threshold (the 16th call comes back
    // ok=true). Pre-seeding keeps all 15 inside the window, so the single real
    // lead below is the 16th in-window click and must trip the burst detector
    // deterministically, regardless of DB latency.
    await db.insert(rateEvents).values(
      Array.from({ length: 15 }, () => ({ counterName: "ip_clicks", bucketKey: ip })),
    );
    const last = await validateLead({
      listingId: randomUUID(),
      sellerId: randomUUID(),
      buyerId: `buyer_${run}_burst`,
      ip,
    });
    expect(last.ok).toBe(false);
    expect(last.reason).toBe("bot_click_burst");
  });
});

describe("validateImpression (ad-budget protection)", () => {
  it("drops impressions with no session or an unverified session", async () => {
    const noSession = await validateImpression({ adId: randomUUID() });
    expect(noSession).toEqual({ ok: false, reason: "missing_session" });

    const fake = await validateImpression({ adId: randomUUID(), sessionId: uniq("sess") });
    expect(fake).toEqual({ ok: false, reason: "unverified_session" });
  });

  it("accepts a verified-session impression then dedups a rapid repeat", async () => {
    const sessionId = `sess_${run}_ok`;
    getOrCreateSession(sessionId); // registers the session so hasSession() passes
    const adId = randomUUID();
    const first = await validateImpression({ adId, sessionId, ip: `ip_${run}_imp` });
    const second = await validateImpression({ adId, sessionId, ip: `ip_${run}_imp` });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("duplicate_impression");
  });
});

describe("writeAudit (durable abuse trail)", () => {
  it("persists the entry to audit_log (fire-and-forget)", async () => {
    const subjectUserId = await createUser();
    uids.push(subjectUserId);
    const reason = `reason_${run}`;
    writeAudit({ eventType: "blocked_lead", subjectUserId, reason });
    // setImmediate fire-and-forget — poll until the durable insert lands rather
    // than a fixed sleep (deterministic on a slow DB, and ensures the row exists
    // before teardown so cleanup can never race the async write).
    let rows = await db.select().from(auditLog).where(eq(auditLog.reason, reason));
    for (let i = 0; i < 50 && rows.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 100));
      rows = await db.select().from(auditLog).where(eq(auditLog.reason, reason));
    }
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe("blocked_lead");
    expect(rows[0].subjectUserId).toBe(subjectUserId);
  });
});

afterAll(async () => {
  const like = `%${run}%`;
  await db.delete(auditLog).where(sql`${auditLog.reason} LIKE ${like}`);
  await db.delete(rateEvents).where(sql`${rateEvents.bucketKey} LIKE ${like}`);
  await db.delete(dedupKeys).where(sql`${dedupKeys.dedupKey} LIKE ${like}`);
  if (uids.length) await deleteUsers(...uids);
});
