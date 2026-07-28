import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { SlidingWindowCounter, DedupStore } from "./slidingWindow";
import { db, uniq } from "../__tests__/helpers";
import { rateEvents, dedupKeys } from "@workspace/db/schema";

// Track the namespaces this file creates so we can delete exactly our own rows
// from the shared prod tables on teardown.
const counterNames: string[] = [];
const storeNames: string[] = [];

function newCounter(windowMs: number): SlidingWindowCounter {
  const name = uniq("swc");
  counterNames.push(name);
  return new SlidingWindowCounter(name, windowMs);
}
function newDedup(ttlMs: number): { name: string; store: DedupStore } {
  const name = uniq("dedup");
  storeNames.push(name);
  return { name, store: new DedupStore(name, ttlMs) };
}

describe("SlidingWindowCounter (durable)", () => {
  it("hit() records and counts within the window; count() observes without recording", async () => {
    const c = newCounter(60_000);
    const key = uniq("k");
    expect(await c.count(key)).toBe(0);
    expect(await c.hit(key)).toBe(1);
    expect(await c.hit(key)).toBe(2);
    expect(await c.count(key)).toBe(2);
  });

  it("excludes events older than the window", async () => {
    const name = uniq("swc");
    counterNames.push(name);
    const c = new SlidingWindowCounter(name, 1000); // 1s window
    const key = uniq("k");
    // An event an hour in the past is outside the window.
    await db.insert(rateEvents).values({ counterName: name, bucketKey: key, eventAt: new Date(Date.now() - 3_600_000) });
    expect(await c.count(key)).toBe(0);
    expect(await c.hit(key)).toBe(1);
  });

  it("is shared across instances of the same namespace (survives a restart)", async () => {
    const name = uniq("swc");
    counterNames.push(name);
    const key = uniq("k");
    await new SlidingWindowCounter(name, 60_000).hit(key);
    // A fresh instance — as after a redeploy — sees the persisted event.
    expect(await new SlidingWindowCounter(name, 60_000).count(key)).toBe(1);
  });
});

describe("DedupStore (durable)", () => {
  it("first sight is not a duplicate; an immediate repeat is", async () => {
    const { store } = newDedup(60_000);
    const key = uniq("k");
    expect(await store.isDuplicate(key)).toBe(false);
    expect(await store.isDuplicate(key)).toBe(true);
  });

  it("treats an expired key as new and refreshes its timestamp", async () => {
    const { name, store } = newDedup(1000); // 1s ttl
    const key = uniq("k");
    await db.insert(dedupKeys).values({ storeName: name, dedupKey: key, seenAt: new Date(Date.now() - 3_600_000) });
    expect(await store.isDuplicate(key)).toBe(false); // expired → treated as new
    expect(await store.isDuplicate(key)).toBe(true); // now fresh → duplicate
  });
});

afterAll(async () => {
  for (const n of counterNames) {
    await db.delete(rateEvents).where(sql`${rateEvents.counterName} = ${n}`);
  }
  for (const n of storeNames) {
    await db.delete(dedupKeys).where(sql`${dedupKeys.storeName} = ${n}`);
  }
});
