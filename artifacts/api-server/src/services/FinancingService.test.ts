import { describe, it, expect, afterAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  createIntermediary,
  listIntermediaries,
  updateIntermediary,
  updateFinancingRequest,
  createBranch,
  createSeat,
  updateInstitutionRequest,
} from "./FinancingService";
import { db, createUser, deleteUsers, uniq, randomUUID } from "../__tests__/helpers";
import {
  listings,
  leadHistory,
  financingRequests,
  financingIntermediaries,
  financingBranches,
  financingSeats,
} from "@workspace/db/schema";

/**
 * FinancingService is the untested bank-financing CRM: the intermediary directory
 * and the finance-request pipeline. Covers intermediary CRUD, the upsert +
 * intermediary assignment on a real finance_request lead, and the validation
 * guards (non-finance/unknown lead, unknown intermediary).
 */
const uids: string[] = [];
const leadIds: string[] = [];
const listingIds: string[] = [];
const imIds: string[] = [];
const branchIds: string[] = [];
const seatIds: string[] = [];

async function financeLead(): Promise<string> {
  const seller = await createUser();
  uids.push(seller);
  const listingId = randomUUID();
  await db.insert(listings).values({
    id: listingId,
    userId: seller,
    title: uniq("fin-listing"),
    category: "car",
    status: "active",
    basePriceCash: "500000",
    location: "Cairo",
  });
  listingIds.push(listingId);
  const leadId = randomUUID();
  await db.insert(leadHistory).values({
    id: leadId,
    listingId,
    sellerId: seller,
    actionType: "finance_request",
  });
  leadIds.push(leadId);
  return leadId;
}

afterAll(async () => {
  if (seatIds.length) {
    await db.delete(financingSeats).where(inArray(financingSeats.id, seatIds));
  }
  if (leadIds.length) {
    await db.delete(financingRequests).where(inArray(financingRequests.leadId, leadIds));
    // leadHistory.sellerId → users has no cascade, so remove leads before users.
    await db.delete(leadHistory).where(inArray(leadHistory.id, leadIds));
  }
  if (branchIds.length) {
    await db.delete(financingBranches).where(inArray(financingBranches.id, branchIds));
  }
  for (const id of listingIds) await db.delete(listings).where(eq(listings.id, id));
  for (const id of imIds) await db.delete(financingIntermediaries).where(eq(financingIntermediaries.id, id));
  await deleteUsers(...uids);
});

describe("FinancingService — intermediary directory", () => {
  it("creates, lists, and updates an intermediary", async () => {
    const admin = await createUser();
    uids.push(admin);

    const created = await createIntermediary({
      name: uniq("Bank Partner"),
      contactEmail: "partner@bank.test",
      adminUserId: admin,
    });
    imIds.push(created.id);
    expect(created.is_active).toBe(true);
    expect(created.contact_email).toBe("partner@bank.test");

    const list = await listIntermediaries();
    expect(list.some((i) => i.id === created.id)).toBe(true);

    const updated = await updateIntermediary({
      id: created.id,
      name: "Renamed Partner",
      isActive: false,
      adminUserId: admin,
    });
    expect(updated.name).toBe("Renamed Partner");
    expect(updated.is_active).toBe(false);
  });
});

describe("FinancingService — finance-request pipeline", () => {
  it("upserts status + assigns an intermediary, then updates idempotently", async () => {
    const admin = await createUser();
    uids.push(admin);
    const leadId = await financeLead();
    const im = await createIntermediary({ name: uniq("IM"), adminUserId: admin });
    imIds.push(im.id);

    const r = await updateFinancingRequest({
      leadId,
      status: "forwarded",
      intermediaryId: im.id,
      notes: "call the client",
      adminUserId: admin,
    });
    expect(r.lead_id).toBe(leadId);
    expect(r.status).toBe("forwarded");
    expect(r.intermediary_id).toBe(im.id);
    expect(r.assigned_at).not.toBeNull();
    expect(r.notes).toBe("call the client");

    // Second update upserts the same row (no duplicate), changing only status.
    const r2 = await updateFinancingRequest({ leadId, status: "closed", adminUserId: admin });
    expect(r2.status).toBe("closed");
    expect(r2.intermediary_id).toBe(im.id); // unchanged (not passed)

    const rows = await db.select().from(financingRequests).where(eq(financingRequests.leadId, leadId));
    expect(rows).toHaveLength(1);
  });

  it("rejects an unknown/non-finance lead and an unknown intermediary", async () => {
    const admin = await createUser();
    uids.push(admin);

    await expect(
      updateFinancingRequest({ leadId: randomUUID(), status: "new", adminUserId: admin }),
    ).rejects.toThrow(/not found/i);

    const leadId = await financeLead();
    await expect(
      updateFinancingRequest({ leadId, intermediaryId: randomUUID(), adminUserId: admin }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("FinancingService — institution AuthZ + status machine (F-SEC-01 / R2)", () => {
  async function setupInstitutionWithBranches() {
    const admin = await createUser();
    uids.push(admin);
    const agentA = await createUser();
    uids.push(agentA);
    const agentB = await createUser();
    uids.push(agentB);
    const owner = await createUser({ role: "financial_institution" });
    uids.push(owner);

    const im = await createIntermediary({ name: uniq("FI Bank"), adminUserId: admin });
    imIds.push(im.id);
    await updateIntermediary({ id: im.id, ownerUserId: owner, adminUserId: admin });

    const branchA = await createBranch({
      intermediaryId: im.id,
      name: "Branch A",
      adminUserId: admin,
    });
    branchIds.push(branchA.id);
    const branchB = await createBranch({
      intermediaryId: im.id,
      name: "Branch B",
      adminUserId: admin,
    });
    branchIds.push(branchB.id);

    const seatA = await createSeat({
      intermediaryId: im.id,
      userId: agentA,
      branchId: branchA.id,
      role: "agent",
      adminUserId: admin,
    });
    seatIds.push(seatA.id);
    const seatB = await createSeat({
      intermediaryId: im.id,
      userId: agentB,
      branchId: branchB.id,
      role: "agent",
      adminUserId: admin,
    });
    seatIds.push(seatB.id);

    return { admin, agentA, agentB, owner, im, branchA, branchB };
  }

  it("denies a branch agent PATCH on another branch's request (NOT_FOUND)", async () => {
    const { admin, agentA, im, branchB } = await setupInstitutionWithBranches();
    const leadId = await financeLead();

    await updateFinancingRequest({
      leadId,
      status: "forwarded",
      intermediaryId: im.id,
      adminUserId: admin,
    });
    // Route to branch B — agent A must not see/mutate it.
    await db
      .update(financingRequests)
      .set({ branchId: branchB.id, updatedAt: new Date() })
      .where(eq(financingRequests.leadId, leadId));

    await expect(
      updateInstitutionRequest({
        dbUserId: agentA,
        leadId,
        status: "contacted",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows a branch agent to advance status on own-branch and unrouted requests", async () => {
    const { admin, agentA, im, branchA } = await setupInstitutionWithBranches();

    const ownLead = await financeLead();
    await updateFinancingRequest({
      leadId: ownLead,
      status: "forwarded",
      intermediaryId: im.id,
      adminUserId: admin,
    });
    await db
      .update(financingRequests)
      .set({ branchId: branchA.id, updatedAt: new Date() })
      .where(eq(financingRequests.leadId, ownLead));

    const contacted = await updateInstitutionRequest({
      dbUserId: agentA,
      leadId: ownLead,
      status: "contacted",
    });
    expect(contacted.status).toBe("contacted");

    const unroutedLead = await financeLead();
    await updateFinancingRequest({
      leadId: unroutedLead,
      status: "forwarded",
      intermediaryId: im.id,
      adminUserId: admin,
    });

    const unroutedContacted = await updateInstitutionRequest({
      dbUserId: agentA,
      leadId: unroutedLead,
      status: "contacted",
    });
    expect(unroutedContacted.status).toBe("contacted");
  });

  it("enforces forwarded → contacted → closed and rejects illegal jumps", async () => {
    const { admin, owner, im } = await setupInstitutionWithBranches();
    const leadId = await financeLead();
    await updateFinancingRequest({
      leadId,
      status: "forwarded",
      intermediaryId: im.id,
      adminUserId: admin,
    });

    await expect(
      updateInstitutionRequest({ dbUserId: owner, leadId, status: "closed" }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });

    const contacted = await updateInstitutionRequest({
      dbUserId: owner,
      leadId,
      status: "contacted",
    });
    expect(contacted.status).toBe("contacted");

    const closed = await updateInstitutionRequest({
      dbUserId: owner,
      leadId,
      status: "closed",
    });
    expect(closed.status).toBe("closed");

    await expect(
      updateInstitutionRequest({ dbUserId: owner, leadId, status: "contacted" }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });

    // Idempotent same-status is allowed.
    const again = await updateInstitutionRequest({
      dbUserId: owner,
      leadId,
      status: "closed",
    });
    expect(again.status).toBe("closed");
  });

  it("rejects forward to an inactive intermediary (F-SEC-05)", async () => {
    const admin = await createUser();
    uids.push(admin);
    const im = await createIntermediary({ name: uniq("Sleepy Bank"), adminUserId: admin });
    imIds.push(im.id);
    await updateIntermediary({ id: im.id, isActive: false, adminUserId: admin });

    const leadId = await financeLead();
    await expect(
      updateFinancingRequest({
        leadId,
        status: "forwarded",
        intermediaryId: im.id,
        adminUserId: admin,
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });

  it("rejects linking an owner without financial_institution role (F-SEC-03)", async () => {
    const admin = await createUser();
    uids.push(admin);
    const individual = await createUser({ role: "individual" });
    uids.push(individual);
    const im = await createIntermediary({ name: uniq("Role Gate Bank"), adminUserId: admin });
    imIds.push(im.id);

    await expect(
      updateIntermediary({
        id: im.id,
        ownerUserId: individual,
        adminUserId: admin,
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });
});
