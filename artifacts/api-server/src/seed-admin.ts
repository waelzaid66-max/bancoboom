import { db } from "@workspace/db";
import {
  users,
  listings,
  reports,
  supportTickets,
  supportTicketMessages,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

/**
 * Idempotent seed for the Admin Control Center: a handful of reports and
 * support tickets so the moderation queue / support inbox are non-empty on a
 * fresh environment. Safe to re-run — it no-ops once data exists.
 */
async function seedAdmin() {
  console.log("🌱 Seeding admin data (reports + support tickets)...");

  const existingReports = await db.select({ id: reports.id }).from(reports).limit(1);
  const existingTickets = await db.select({ id: supportTickets.id }).from(supportTickets).limit(1);

  if (existingReports.length > 0 && existingTickets.length > 0) {
    console.log("✅ Admin data already seeded — skipping.");
    return;
  }

  const someListings = await db.select({ id: listings.id }).from(listings).limit(6);
  const someUsers = await db.select({ id: users.id }).from(users).limit(4);

  if (someListings.length === 0 || someUsers.length === 0) {
    console.log("⚠️  No listings/users found — run the main seed first.");
    return;
  }

  // ── Reports ─────────────────────────────────────────────
  if (existingReports.length === 0) {
    const reportRows: Array<typeof reports.$inferInsert> = [
      {
        listingId: someListings[0].id,
        reporterUserId: someUsers[0].id,
        reason: "fake_price",
        details: "السعر غير حقيقي، أقل من السوق بكثير ويبدو احتيالاً.",
        status: "open",
      },
      {
        listingId: someListings[1 % someListings.length].id,
        reporterUserId: someUsers[1 % someUsers.length].id,
        reason: "scam",
        details: "البائع يطلب تحويل عربون قبل المعاينة.",
        status: "open",
      },
      {
        listingId: someListings[2 % someListings.length].id,
        reporterUserId: someUsers[2 % someUsers.length].id,
        reason: "wrong_data",
        details: "الموديل والسنة غير مطابقين للصور.",
        status: "open",
      },
      {
        listingId: someListings[3 % someListings.length].id,
        reporterUserId: someUsers[0].id,
        reason: "duplicate",
        details: "نفس الإعلان منشور أكثر من مرة.",
        status: "reviewing",
      },
      {
        listingId: someListings[4 % someListings.length].id,
        reporterUserId: someUsers[3 % someUsers.length].id,
        reason: "other",
        details: "صور غير لائقة.",
        status: "open",
      },
    ];
    await db.insert(reports).values(reportRows);
    console.log(`✅ Seeded ${reportRows.length} reports`);
  }

  // ── Support tickets (+ opening message) ─────────────────
  if (existingTickets.length === 0) {
    const ticketSeeds: Array<{
      userId: string;
      subject: string;
      category: string;
      status: "open" | "closed";
      message: string;
    }> = [
      {
        userId: someUsers[0].id,
        subject: "لم أستطع رفع صور الإعلان",
        category: "listings",
        status: "open",
        message: "كل ما أحاول رفع الصور تظهر رسالة خطأ. ممكن المساعدة؟",
      },
      {
        userId: someUsers[1 % someUsers.length].id,
        subject: "مشكلة في الدفع عند تفعيل الإعلان الممول",
        category: "billing",
        status: "open",
        message: "خصمت المبلغ ولم يتم تفعيل الإعلان الممول.",
      },
      {
        userId: someUsers[2 % someUsers.length].id,
        subject: "كيف أوثّق حسابي كتاجر؟",
        category: "account",
        status: "open",
        message: "أريد شارة التوثيق، ما هي المستندات المطلوبة؟",
      },
      {
        userId: someUsers[3 % someUsers.length].id,
        subject: "Spam leads on my listing",
        category: "other",
        status: "closed",
        message: "I keep receiving fake WhatsApp leads.",
      },
    ];

    for (const t of ticketSeeds) {
      const [ticket] = await db
        .insert(supportTickets)
        .values({
          userId: t.userId,
          subject: t.subject,
          category: t.category,
          status: t.status,
        })
        .returning({ id: supportTickets.id });

      await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        authorUserId: t.userId,
        isAdmin: false,
        body: t.message,
      });

      if (t.status === "closed") {
        await db.insert(supportTicketMessages).values({
          ticketId: ticket.id,
          authorUserId: null,
          isAdmin: true,
          body: "تم حظر الحسابات المسيئة. شكراً لإبلاغنا.",
        });
        await db
          .update(supportTickets)
          .set({ lastReplyAt: sql`now()`, updatedAt: sql`now()` })
          .where(sql`${supportTickets.id} = ${ticket.id}`);
      }
    }
    console.log(`✅ Seeded ${ticketSeeds.length} support tickets`);
  }

  console.log("🎉 Admin seed complete.");
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Admin seed failed:", err);
    process.exit(1);
  });
