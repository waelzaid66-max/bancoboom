import { describe, it, expect, afterAll } from "vitest";
import { inArray, eq } from "drizzle-orm";
import { db, randomUUID, uniq, deleteUsers } from "../__tests__/helpers";
import { users, listings, listingAttributes, notifications } from "@workspace/db/schema";
import {
  createBooking,
  getListingAvailability,
  listBookings,
  updateBookingStatus,
} from "./BookingService";

/**
 * The hotel model, on a real Postgres. Proves role separation (only
 * furnished_daily is bookable), double‑booking prevention, own‑listing block,
 * and the nights/total math.
 */
const uids: string[] = [];
const lids: string[] = [];

async function seedUser(): Promise<{ id: string; clerk: string }> {
  const id = randomUUID();
  const clerk = uniq("clerk");
  await db.insert(users).values({ id, clerkId: clerk, name: "Guest", role: "individual" });
  uids.push(id);
  return { id, clerk };
}

async function seedListing(
  ownerId: string,
  term: string | null,
  category: "real_estate" | "car" = "real_estate",
  price = "1000",
): Promise<string> {
  const id = randomUUID();
  lids.push(id);
  await db.insert(listings).values({
    id,
    userId: ownerId,
    title: "Furnished flat",
    category,
    basePriceCash: price,
    location: "New Cairo",
    status: "active",
  });
  await db.insert(listingAttributes).values({
    listingId: id,
    specs: term ? { rental_term: term } : {},
  });
  return id;
}

afterAll(async () => {
  // listings cascade → bookings + attributes; drop host notifications, then users.
  if (lids.length) await db.delete(listings).where(inArray(listings.id, lids));
  if (uids.length) await db.delete(notifications).where(inArray(notifications.userId, uids));
  await deleteUsers(...uids);
});

/**
 * Booking notifications fire on setImmediate (best-effort, off the response
 * path), so poll briefly for the recipient's row instead of racing a single
 * tick. Optionally narrows by title (a user can hold several booking notes).
 */
async function pollBookingNotification(
  userId: string,
  bookingId: string,
  title?: string,
): Promise<{ title: string; data: unknown } | undefined> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const rows = await db
      .select({ type: notifications.type, title: notifications.title, data: notifications.data })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    const hit = rows.find(
      (r) =>
        r.type === "booking" &&
        (r.data as { booking_id?: string })?.booking_id === bookingId &&
        // Substring match: titles are bilingual ("AR · EN"), tests pin the EN half.
        (!title || r.title.includes(title)),
    );
    if (hit) return hit;
  }
  return undefined;
}

describe("BookingService — furnished/daily hotel model", () => {
  it("books a furnished_daily listing (nights + total) and blocks those dates", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily", "real_estate", "500");

    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-01-10",
      check_out: "2030-01-13",
    });
    expect(b.nights).toBe(3);
    expect(b.total_price).toBe(1500); // 500 × 3
    expect(b.status).toBe("requested");

    const avail = await getListingAvailability(lid);
    expect(avail).toContainEqual({ check_in: "2030-01-10", check_out: "2030-01-13" });
  });

  it("rejects a non-daily listing (long-term rent / sale)", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const longTerm = await seedListing(owner.id, "new_law");
    await expect(
      createBooking(guest.clerk, longTerm, { check_in: "2030-02-01", check_out: "2030-02-05" }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("prevents double-booking, but allows adjacent (checkout = next checkin)", async () => {
    const owner = await seedUser();
    const g1 = await seedUser();
    const g2 = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");

    await createBooking(g1.clerk, lid, { check_in: "2030-03-10", check_out: "2030-03-15" });
    await expect(
      createBooking(g2.clerk, lid, { check_in: "2030-03-12", check_out: "2030-03-18" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const ok = await createBooking(g2.clerk, lid, { check_in: "2030-03-15", check_out: "2030-03-18" });
    expect(ok.nights).toBe(3);
  });

  it("rejects booking your own listing", async () => {
    const owner = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");
    await expect(
      createBooking(owner.clerk, lid, { check_in: "2030-04-01", check_out: "2030-04-03" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists bookings from both sides (guest + host) with enrichment", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily", "real_estate", "500");
    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-05-10",
      check_out: "2030-05-12",
    });

    const asGuest = await listBookings(guest.clerk, "guest");
    expect(asGuest.some((x) => x.id === b.id && x.listing_title === "Furnished flat")).toBe(true);

    const asHost = await listBookings(owner.clerk, "host");
    const hostRow = asHost.find((x) => x.id === b.id);
    expect(hostRow?.counterparty_name).toBe("Guest"); // the guest's name
    // The guest does not see it in the host view (no listings owned).
    expect(await listBookings(guest.clerk, "host")).toEqual([]);
  });

  it("host confirms, then rejecting is no longer allowed; reject frees the dates", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");

    const b1 = await createBooking(guest.clerk, lid, {
      check_in: "2030-06-01",
      check_out: "2030-06-04",
    });
    const confirmed = await updateBookingStatus(owner.clerk, b1.id, "confirm");
    expect(confirmed.status).toBe("confirmed");
    // Can't reject an already-confirmed booking (illegal transition).
    await expect(updateBookingStatus(owner.clerk, b1.id, "reject")).rejects.toMatchObject({
      code: "INVALID_DATA",
    });

    // A second guest's request that overlaps is blocked while confirmed…
    const g2 = await seedUser();
    await expect(
      createBooking(g2.clerk, lid, { check_in: "2030-06-02", check_out: "2030-06-03" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    // …but once the guest cancels, the dates free up.
    const cancelled = await updateBookingStatus(guest.clerk, b1.id, "cancel");
    expect(cancelled.status).toBe("cancelled");
    const ok = await createBooking(g2.clerk, lid, {
      check_in: "2030-06-02",
      check_out: "2030-06-03",
    });
    expect(ok.nights).toBe(1);
  });

  it("notifies the host when a stay is requested (booking notification)", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily", "real_estate", "500");
    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-08-10",
      check_out: "2030-08-12",
    });

    // The notification fires on setImmediate (best-effort, off the response path),
    // so poll briefly for the host's row rather than racing a single tick.
    const note = await pollBookingNotification(owner.id, b.id);
    expect(note).toBeTruthy();
    // Contract with mobile routeForNotification: create → host inbox side.
    expect((note!.data as { role?: string }).role).toBe("host");
  });

  it("lifecycle notifications: confirm notifies the guest; cancel notifies the host", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");
    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-09-01",
      check_out: "2030-09-03",
    });

    await updateBookingStatus(owner.clerk, b.id, "confirm");
    const guestNote = await pollBookingNotification(guest.id, b.id);
    expect(guestNote).toBeTruthy();
    expect(guestNote!.title).toContain("Booking confirmed");
    // Host confirm → guest trips side (not host inbox).
    expect((guestNote!.data as { role?: string }).role).toBe("guest");

    await updateBookingStatus(guest.clerk, b.id, "cancel");
    const hostNote = await pollBookingNotification(owner.id, b.id, "Booking cancelled");
    expect(hostNote).toBeTruthy();
    // Guest cancel → host inbox side.
    expect((hostNote!.data as { role?: string }).role).toBe("host");
  });

  it("reject notifies the guest with role=guest (opens trips, not host inbox)", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");
    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-10-01",
      check_out: "2030-10-03",
    });

    await updateBookingStatus(owner.clerk, b.id, "reject");
    const guestNote = await pollBookingNotification(guest.id, b.id, "Booking declined");
    expect(guestNote).toBeTruthy();
    expect((guestNote!.data as { role?: string }).role).toBe("guest");
  });

  it("enforces role separation on transitions (guest can't confirm, host can't cancel)", async () => {
    const owner = await seedUser();
    const guest = await seedUser();
    const lid = await seedListing(owner.id, "furnished_daily");
    const b = await createBooking(guest.clerk, lid, {
      check_in: "2030-07-01",
      check_out: "2030-07-03",
    });
    await expect(updateBookingStatus(guest.clerk, b.id, "confirm")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(updateBookingStatus(owner.clerk, b.id, "cancel")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
