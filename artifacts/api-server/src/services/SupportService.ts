import { db } from "@workspace/db";
import { supportTickets, supportTicketMessages, users } from "@workspace/db/schema";
import { and, asc, desc, eq, lt, sql, type SQL } from "drizzle-orm";
import { writeAudit } from "./AbuseService";

type TicketStatus = "open" | "closed";

interface SupportMessageRow {
  id: string;
  body: string;
  is_admin: boolean;
  author_name: string | null;
  created_at: string;
}

interface SupportTicketRow {
  id: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  user_id: string | null;
  user_name: string | null;
  message_count: number;
  last_reply_at: string | null;
  created_at: string;
  messages: SupportMessageRow[];
}

async function loadMessages(ticketId: string): Promise<SupportMessageRow[]> {
  const rows = await db
    .select({
      id: supportTicketMessages.id,
      body: supportTicketMessages.body,
      isAdmin: supportTicketMessages.isAdmin,
      authorName: users.name,
      createdAt: supportTicketMessages.createdAt,
    })
    .from(supportTicketMessages)
    .leftJoin(users, eq(supportTicketMessages.authorUserId, users.id))
    .where(eq(supportTicketMessages.ticketId, ticketId))
    .orderBy(asc(supportTicketMessages.createdAt));

  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    is_admin: m.isAdmin,
    author_name: m.authorName,
    created_at: (m.createdAt ?? new Date()).toISOString(),
  }));
}

async function serializeTicket(
  t: {
    id: string;
    subject: string;
    category: string | null;
    status: TicketStatus;
    userId: string | null;
    userName: string | null;
    lastReplyAt: Date | null;
    createdAt: Date | null;
  },
  includeMessages: boolean,
): Promise<SupportTicketRow> {
  const messages = includeMessages ? await loadMessages(t.id) : [];
  let messageCount = messages.length;
  if (!includeMessages) {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, t.id));
    messageCount = row?.c ?? 0;
  }
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    user_id: t.userId,
    user_name: t.userName,
    message_count: messageCount,
    last_reply_at: t.lastReplyAt ? t.lastReplyAt.toISOString() : null,
    created_at: (t.createdAt ?? new Date()).toISOString(),
    messages,
  };
}

/** Public: a user opens a ticket; the opening message becomes message #1. */
export async function createTicket(input: {
  userId: string | null;
  subject: string;
  message: string;
  category?: string;
}): Promise<SupportTicketRow> {
  const now = new Date();
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: input.userId,
      subject: input.subject,
      category: input.category ?? null,
      status: "open",
      lastReplyAt: now,
    })
    .returning();

  await db.insert(supportTicketMessages).values({
    ticketId: ticket!.id,
    authorUserId: input.userId,
    isAdmin: false,
    body: input.message,
  });

  let userName: string | null = null;
  if (input.userId) {
    const [u] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    userName = u?.name ?? null;
  }

  return serializeTicket(
    {
      id: ticket!.id,
      subject: ticket!.subject,
      category: ticket!.category,
      status: ticket!.status,
      userId: ticket!.userId,
      userName,
      lastReplyAt: ticket!.lastReplyAt,
      createdAt: ticket!.createdAt,
    },
    true,
  );
}

/** Admin: list tickets, newest activity first, optional status filter. */
export async function listTickets(params: {
  status?: TicketStatus;
  cursor?: string;
  limit: number;
}): Promise<{ items: SupportTicketRow[]; cursor?: string; has_next: boolean }> {
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(supportTickets.status, params.status));
  if (params.cursor) {
    const cursorDate = new Date(params.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      conditions.push(lt(supportTickets.createdAt, cursorDate));
    }
  }

  const rows = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      category: supportTickets.category,
      status: supportTickets.status,
      userId: supportTickets.userId,
      userName: users.name,
      lastReplyAt: supportTickets.lastReplyAt,
      createdAt: supportTickets.createdAt,
      messageCount: sql<number>`(select count(*)::int from support_ticket_messages m where m.ticket_id = ${supportTickets.id})`,
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(supportTickets.createdAt))
    .limit(params.limit + 1);

  const has_next = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const last = page[page.length - 1];

  const items: SupportTicketRow[] = page.map((t) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    status: t.status,
    user_id: t.userId,
    user_name: t.userName,
    message_count: t.messageCount ?? 0,
    last_reply_at: t.lastReplyAt ? t.lastReplyAt.toISOString() : null,
    created_at: (t.createdAt ?? new Date()).toISOString(),
    messages: [],
  }));

  return {
    items,
    cursor: has_next && last?.createdAt ? last.createdAt.toISOString() : undefined,
    has_next,
  };
}

/** Admin: a single ticket with its full message thread. */
export async function getTicket(ticketId: string): Promise<SupportTicketRow> {
  const [t] = await db
    .select({
      id: supportTickets.id,
      subject: supportTickets.subject,
      category: supportTickets.category,
      status: supportTickets.status,
      userId: supportTickets.userId,
      userName: users.name,
      lastReplyAt: supportTickets.lastReplyAt,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .leftJoin(users, eq(supportTickets.userId, users.id))
    .where(eq(supportTickets.id, ticketId))
    .limit(1);

  if (!t) {
    throw Object.assign(new Error("Ticket not found"), { code: "NOT_FOUND" });
  }

  return serializeTicket(t, true);
}

/** Admin: post a support reply. Bumps lastReplyAt + reopens if needed. Audited. */
export async function respondTicket(params: {
  ticketId: string;
  adminUserId: string;
  message: string;
}): Promise<SupportTicketRow> {
  const [existing] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(eq(supportTickets.id, params.ticketId))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("Ticket not found"), { code: "NOT_FOUND" });
  }

  const now = new Date();
  await db.insert(supportTicketMessages).values({
    ticketId: params.ticketId,
    authorUserId: params.adminUserId,
    isAdmin: true,
    body: params.message,
  });

  await db
    .update(supportTickets)
    .set({ lastReplyAt: now, updatedAt: now })
    .where(eq(supportTickets.id, params.ticketId));

  writeAudit({
    eventType: "admin_action",
    severity: "info",
    actorUserId: params.adminUserId,
    reason: "support_reply",
    metadata: { ticket_id: params.ticketId },
  });

  return getTicket(params.ticketId);
}

/** Admin: open or close a ticket. Audited. */
export async function setTicketStatus(params: {
  ticketId: string;
  adminUserId: string;
  status: TicketStatus;
}): Promise<SupportTicketRow> {
  const [existing] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(eq(supportTickets.id, params.ticketId))
    .limit(1);

  if (!existing) {
    throw Object.assign(new Error("Ticket not found"), { code: "NOT_FOUND" });
  }

  await db
    .update(supportTickets)
    .set({ status: params.status, updatedAt: new Date() })
    .where(eq(supportTickets.id, params.ticketId));

  writeAudit({
    eventType: "admin_action",
    severity: "info",
    actorUserId: params.adminUserId,
    reason: `support_${params.status}`,
    metadata: { ticket_id: params.ticketId },
  });

  return getTicket(params.ticketId);
}

/** Count of open tickets (overview KPI). */
export async function countOpenTickets(): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(eq(supportTickets.status, "open"));
  return row?.c ?? 0;
}
