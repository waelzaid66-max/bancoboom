import { db } from "@workspace/db";
import { notificationPreferences } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getResolvedConfig } from "./EmailConfigService";

/**
 * EmailService — outbound transactional email for BANCO.
 *
 * Communications layer (Task #38). Two concerns are deliberately separated:
 *   1. Transport: HOW a message leaves the system. A provider abstraction keeps
 *      the rest of the app provider-agnostic. With no external provider wired,
 *      the default LogTransport renders the message and records it WITHOUT
 *      claiming delivery — honest about the fact nothing was actually sent.
 *      A ResendTransport activates automatically the moment a RESEND_API_KEY is
 *      configured, so adding a provider later needs no code change here.
 *   2. Content: bilingual (AR/EN), dark-themed templates that mirror the app's
 *      brand (#000 background, #E8002D accent). Every value passed in is REAL —
 *      this module never fabricates counts, prices or activity.
 */

export type EmailLang = "ar" | "en";

export type NotificationCategory =
  | "message"
  | "lead"
  | "system"
  | "rfq"
  | "new_match"
  | "price_drop"
  | "payment_success"
  | "payment_failed"
  | "subscription_expiring";

export type BillingEmailCategory = Extract<
  NotificationCategory,
  "payment_success" | "payment_failed" | "subscription_expiring"
>;

export type BillingReceiptKind = "wallet_topup" | "subscription_charge" | "lead_charge";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  readonly name: string;
  send(msg: EmailMessage): Promise<void>;
}

/* ── Transports ────────────────────────────────────────── */

// Default transport: renders the message and logs that it was produced. It does
// NOT claim delivery — there is no external provider until one is configured.
class LogTransport implements EmailTransport {
  readonly name = "log";
  async send(msg: EmailMessage): Promise<void> {
    logger.info(
      {
        transport: "log",
        to: msg.to,
        subject: msg.subject,
        html_bytes: msg.html.length,
      },
      "Email rendered (no external provider configured; not delivered)",
    );
  }
}

// Real delivery via Resend's REST API. Activates only when RESEND_API_KEY is
// present, so it is inert (never constructed) until the user configures it.
class ResendTransport implements EmailTransport {
  readonly name = "resend";
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}
  async send(msg: EmailMessage): Promise<void> {
    // BUG-001 (v2): Buffer.from still triggers undici's ByteString check in
    // some Node.js runtime versions. Definitive fix: escape every non-ASCII
    // character to its \uXXXX sequence — the HTTP body becomes pure ASCII while
    // the JSON remains valid (parsers treat \u escapes transparently, so Arabic
    // text is preserved in the delivered email).
    const payload = JSON.stringify({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }).replace(/[\u0080-\uFFFF]/g, (c) =>
      `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: payload,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Resend send failed: ${res.status} ${detail}`);
    }
  }
}

/**
 * Resolve the runtime for a single send from the admin-managed config (DB-first,
 * env fallback). Read fresh each time — no module cache — so a key/sender saved
 * in the Control Center takes effect on the next email without a redeploy.
 * Resend transport when an API key resolves, otherwise honest log-only.
 */
async function resolveEmailRuntime(): Promise<{
  transport: EmailTransport;
  appUrl: (path: string) => string | undefined;
}> {
  const cfg = await getResolvedConfig();
  const transport: EmailTransport = cfg.apiKey
    ? new ResendTransport(cfg.apiKey, cfg.from)
    : new LogTransport();
  const base = cfg.publicAppUrl;
  const appUrl = (path: string): string | undefined =>
    base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : undefined;
  return { transport, appUrl };
}

/* ── Preference gate ───────────────────────────────────── */

/**
 * True when the user accepts email for this category. Absence of a stored row
 * means enabled (defaults are implicit) — mirrors ProfileService resolution.
 */
export async function isEmailChannelEnabled(
  userId: string,
  type: NotificationCategory,
): Promise<boolean> {
  const [row] = await db
    .select({ email: notificationPreferences.email })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.type, type),
      ),
    )
    .limit(1);
  return row ? row.email : true;
}

/* ── Templates (bilingual, dark) ───────────────────────── */

const BRAND_RED = "#E8002D";
const BG = "#000000";
const CARD = "#0c0c0c";
const BORDER = "#1c1c1c";
const FG = "#ffffff";
const MUTED = "#9a9a9a";

interface TemplateRow {
  label: string;
  value: string;
}

interface TemplateInput {
  lang: EmailLang;
  preheader: string;
  heading: string;
  intro: string;
  rows?: TemplateRow[];
  cta?: { label: string; url: string };
  footer: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderEmail(input: TemplateInput): { html: string; text: string } {
  const dir = input.lang === "ar" ? "rtl" : "ltr";
  const align = input.lang === "ar" ? "right" : "left";
  const rowsHtml = (input.rows ?? [])
    .map(
      (r) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;">${escapeHtml(r.label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${FG};font-size:15px;font-weight:600;text-align:${input.lang === "ar" ? "left" : "right"};">${escapeHtml(r.value)}</td>
        </tr>`,
    )
    .join("");

  const ctaHtml = input.cta
    ? `<tr><td style="padding-top:24px;">
         <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:${BRAND_RED};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px;">${escapeHtml(input.cta.label)}</a>
       </td></tr>`
    : "";

  const html = `<!doctype html>
<html dir="${dir}" lang="${input.lang}">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
  <body style="margin:0;background:${BG};color:${FG};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;opacity:0;color:${BG};">${escapeHtml(input.preheader)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">
          <tr><td style="padding:24px 28px;border-bottom:1px solid ${BORDER};">
            <span style="font-size:20px;font-weight:800;letter-spacing:0.5px;color:${FG};">BANCO</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${BRAND_RED};margin:0 4px;"></span>
          </td></tr>
          <tr><td style="padding:28px;text-align:${align};" dir="${dir}">
            <h1 style="margin:0 0 10px;font-size:20px;color:${FG};">${escapeHtml(input.heading)}</h1>
            <p style="margin:0 0 18px;font-size:15px;line-height:22px;color:${MUTED};">${escapeHtml(input.intro)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}${ctaHtml}</table>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;text-align:${align};" dir="${dir}">${escapeHtml(input.footer)}</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textLines = [
    input.heading,
    "",
    input.intro,
    ...(input.rows ?? []).map((r) => `- ${r.label}: ${r.value}`),
    ...(input.cta ? ["", `${input.cta.label}: ${input.cta.url}`] : []),
    "",
    input.footer,
  ];
  return { html, text: textLines.join("\n") };
}

/* ── Public send functions ─────────────────────────────── */

/**
 * Notify a seller by email that a buyer engaged one of their listings. Caller
 * is responsible for the preference gate + best-effort error handling; this
 * function renders the real lead context and hands it to the active transport.
 */
export async function sendLeadNotificationEmail(args: {
  to: string;
  lang?: EmailLang;
  sellerName: string;
  listingTitle: string;
  actionLabel: string;
  listingId?: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = args.listingId ? appUrl(`/listing/${args.listingId}`) : undefined;

  const { html, text } = renderEmail({
    lang,
    preheader: ar ? "عندك مهتم جديد على إعلانك" : "You have a new lead on your listing",
    heading: ar ? "مهتم جديد 🔔" : "New lead 🔔",
    intro: ar
      ? `يا ${args.sellerName}، فيه مشتري تفاعل مع إعلانك على BANCO.`
      : `Hi ${args.sellerName}, a buyer just engaged your listing on BANCO.`,
    rows: [
      { label: ar ? "الإعلان" : "Listing", value: args.listingTitle },
      { label: ar ? "نوع التفاعل" : "Action", value: args.actionLabel },
    ],
    cta: cta ? { label: ar ? "افتح الإعلان" : "Open listing", url: cta } : undefined,
    footer: ar
      ? "بتستلم الإيميل ده لأن إشعارات البريد مفعّلة. تقدر توقفها من الإعدادات."
      : "You're receiving this because email alerts are on. Manage them in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "BANCO — مهتم جديد على إعلانك" : "BANCO — New lead on your listing",
    html,
    text,
  });
}

/**
 * Welcome email on first account creation — the professional first touch. No
 * fabricated numbers: it only states what the platform actually does and where
 * to start. Caller fires it best-effort; a failure never blocks sign-up.
 */
export async function sendWelcomeEmail(args: {
  to: string;
  lang?: EmailLang;
  name: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl("/");

  const { html, text } = renderEmail({
    lang,
    preheader: ar
      ? "حسابك على BANCO جاهز — ابدأ البيع والشراء بأمان"
      : "Your BANCO account is ready — buy & sell with confidence",
    heading: ar ? `أهلاً بيك يا ${args.name} 👋` : `Welcome, ${args.name} 👋`,
    intro: ar
      ? "حسابك اتفعّل. BANCO سوق موثوق للعربيات والعقارات (بيع وإيجار) والأصول الصناعية — تنشر إعلانك في دقيقة، تتواصل بأمان داخل التطبيق، ومن غير وسطاء."
      : "Your account is live. BANCO is a trusted marketplace for cars, real estate (sale & rent) and industrial assets — publish in a minute, chat safely in-app, no middlemen.",
    rows: [
      {
        label: ar ? "ابدأ صح" : "Start right",
        value: ar ? "أضف أول إعلان بصورة واضحة وسعر حقيقي" : "Post your first listing with a clear photo and a real price",
      },
      {
        label: ar ? "بأمان" : "Stay safe",
        value: ar ? "خلّي التواصل والدفع داخل BANCO" : "Keep contact & payments inside BANCO",
      },
    ],
    cta: cta ? { label: ar ? "افتح BANCO" : "Open BANCO", url: cta } : undefined,
    footer: ar
      ? "وصلك الإيميل ده لأنك أنشأت حساب على BANCO. تقدر تدير إشعارات البريد من الإعدادات."
      : "You received this because you created a BANCO account. Manage email alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "أهلاً بيك في BANCO 🎉" : "Welcome to BANCO 🎉",
    html,
    text,
  });
}

/**
 * Weekly activity digest for a seller. All numbers are computed from real data
 * by the caller (the weekly-reports job) — never fabricated here.
 */
export async function sendWeeklyReportEmail(args: {
  to: string;
  lang?: EmailLang;
  name: string;
  activeListings: number;
  weeklyLeads: number;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl("/");

  const { html, text } = renderEmail({
    lang,
    preheader: ar ? "ملخص نشاطك الأسبوعي على BANCO" : "Your weekly BANCO activity",
    heading: ar ? "ملخصك الأسبوعي 📈" : "Your weekly summary 📈",
    intro: ar
      ? `يا ${args.name}، ده ملخص نشاطك على BANCO آخر ٧ أيام.`
      : `Hi ${args.name}, here's your BANCO activity over the last 7 days.`,
    rows: [
      {
        label: ar ? "إعلانات نشطة" : "Active listings",
        value: String(args.activeListings),
      },
      {
        label: ar ? "مهتمين جدد (٧ أيام)" : "New leads (7 days)",
        value: String(args.weeklyLeads),
      },
    ],
    cta: cta ? { label: ar ? "افتح BANCO" : "Open BANCO", url: cta } : undefined,
    footer: ar
      ? "ملخص أسبوعي تلقائي. تقدر توقف رسائل النظام من الإعدادات."
      : "Automated weekly summary. You can turn off system emails in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "BANCO — ملخصك الأسبوعي" : "BANCO — Your weekly summary",
    html,
    text,
  });
}

function receiptKindLabel(kind: BillingReceiptKind, ar: boolean): string {
  switch (kind) {
    case "wallet_topup":
      return ar ? "شحن المحفظة" : "Wallet top-up";
    case "subscription_charge":
      return ar ? "اشتراك" : "Subscription";
    case "lead_charge":
      return ar ? "رسوم مهتم" : "Lead charge";
  }
}

/**
 * Receipt email after a successful wallet/subscription/lead ledger entry.
 * All amounts are real values from the transactions table.
 */
export async function sendBillingReceiptEmail(args: {
  to: string;
  lang?: EmailLang;
  name: string;
  kind: BillingReceiptKind;
  amount: string;
  balanceAfter: string;
  description?: string;
  invoiceNumber?: string | null;
  planName?: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl("/billing");
  const kindLabel = receiptKindLabel(args.kind, ar);

  const rows: TemplateRow[] = [
    { label: ar ? "النوع" : "Type", value: kindLabel },
    { label: ar ? "المبلغ" : "Amount", value: `${args.amount} EGP` },
    { label: ar ? "رصيد المحفظة" : "Wallet balance", value: `${args.balanceAfter} EGP` },
  ];
  if (args.planName) {
    rows.splice(1, 0, { label: ar ? "الخطة" : "Plan", value: args.planName });
  }
  if (args.invoiceNumber) {
    rows.push({ label: ar ? "رقم الفاتورة" : "Invoice #", value: args.invoiceNumber });
  }
  if (args.description) {
    rows.push({ label: ar ? "التفاصيل" : "Details", value: args.description });
  }

  const { html, text } = renderEmail({
    lang,
    preheader: ar ? "إيصال دفع من BANCO" : "Your BANCO payment receipt",
    heading: ar ? "إيصال الدفع" : "Payment receipt",
    intro: ar
      ? `يا ${args.name}، تم تسجيل عملية ${kindLabel} على حسابك.`
      : `Hi ${args.name}, your ${kindLabel.toLowerCase()} was recorded on your account.`,
    rows,
    cta: cta ? { label: ar ? "افتح المركز المالي" : "Open finance hub", url: cta } : undefined,
    footer: ar
      ? "إشعار فوترة تلقائي. تقدر تدير إشعارات الدفع من الإعدادات."
      : "Automated billing notice. Manage payment alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "BANCO — إيصال دفع" : "BANCO — Payment receipt",
    html,
    text,
  });
}

/** Email when a hosted checkout payment fails at the PSP. */
export async function sendBillingFailedEmail(args: {
  to: string;
  lang?: EmailLang;
  name: string;
  amount: string;
  method: string;
  purpose: "wallet_topup" | "subscription";
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl("/billing");
  const purposeLabel =
    args.purpose === "subscription"
      ? ar
        ? "اشتراك"
        : "subscription"
      : ar
        ? "شحن المحفظة"
        : "wallet top-up";

  const { html, text } = renderEmail({
    lang,
    preheader: ar ? "فشل الدفع — جرّب تاني" : "Payment failed — try again",
    heading: ar ? "لم يكتمل الدفع" : "Payment not completed",
    intro: ar
      ? `يا ${args.name}، عملية ${purposeLabel} (${args.amount} ج.م) لم تكتمل عبر ${args.method}.`
      : `Hi ${args.name}, your ${purposeLabel} (${args.amount} EGP via ${args.method}) did not complete.`,
    rows: [
      { label: ar ? "المبلغ" : "Amount", value: `${args.amount} EGP` },
      { label: ar ? "طريقة الدفع" : "Method", value: args.method },
    ],
    cta: cta ? { label: ar ? "جرّب مرة أخرى" : "Try again", url: cta } : undefined,
    footer: ar
      ? "لم يتم خصم أي مبلغ. تقدر تدير إشعارات الدفع من الإعدادات."
      : "No charge was made. Manage payment alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "BANCO — فشل الدفع" : "BANCO — Payment failed",
    html,
    text,
  });
}

/** Reminder before a paid subscription period ends. */
export async function sendSubscriptionExpiringEmail(args: {
  to: string;
  lang?: EmailLang;
  name: string;
  planName: string;
  expiresAt: string;
  daysLeft: number;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl("/plans");

  const expiresLabel = new Date(args.expiresAt).toLocaleDateString(ar ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
  });

  const { html, text } = renderEmail({
    lang,
    preheader: ar ? "اشتراكك ينتهي قريباً" : "Your subscription is ending soon",
    heading: ar ? "اشتراكك ينتهي قريباً" : "Subscription ending soon",
    intro: ar
      ? `يا ${args.name}، اشتراك ${args.planName} ينتهي خلال ${args.daysLeft} يوم.`
      : `Hi ${args.name}, your ${args.planName} plan ends in ${args.daysLeft} day(s).`,
    rows: [
      { label: ar ? "الخطة" : "Plan", value: args.planName },
      { label: ar ? "تاريخ الانتهاء" : "Expires", value: expiresLabel },
    ],
    cta: cta ? { label: ar ? "جدّد الاشتراك" : "Renew plan", url: cta } : undefined,
    footer: ar
      ? "تذكير تلقائي قبل انتهاء الاشتراك. تقدر تدير الإشعارات من الإعدادات."
      : "Automated renewal reminder. Manage alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar ? "BANCO — اشتراكك ينتهي قريباً" : "BANCO — Subscription ending soon",
    html,
    text,
  });
}

/** Notify a conversation participant of a new incoming message. */
export async function sendNewMessageEmail(args: {
  to: string;
  lang?: EmailLang;
  senderName: string;
  preview: string;
  conversationId: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl(`/messages/${args.conversationId}`);

  const preview =
    args.preview.length > 100
      ? `${args.preview.slice(0, 99)}…`
      : args.preview;

  const { html, text } = renderEmail({
    lang,
    preheader: ar
      ? `رسالة جديدة من ${args.senderName}`
      : `New message from ${args.senderName}`,
    heading: ar ? "رسالة جديدة" : "New message",
    intro: ar
      ? `أرسل لك ${args.senderName} رسالة جديدة على BANCO.`
      : `${args.senderName} sent you a new message on BANCO.`,
    rows: [{ label: ar ? "المعاينة" : "Preview", value: preview }],
    cta: cta ? { label: ar ? "افتح المحادثة" : "Open conversation", url: cta } : undefined,
    footer: ar
      ? "تلقّيت هذا الإيميل لأنك طرف في هذه المحادثة. تقدر تدير إشعارات الرسائل من الإعدادات."
      : "You received this because you are a party to this conversation. Manage message alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar
      ? `BANCO — رسالة جديدة من ${args.senderName}`
      : `BANCO — New message from ${args.senderName}`,
    html,
    text,
  });
}

/** Notify a user that a new listing matches one of their alerts-enabled saved searches. */
export async function sendNewMatchEmail(args: {
  to: string;
  lang?: EmailLang;
  userName: string;
  searchName: string;
  listingTitle: string;
  listingId: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl(`/listing/${args.listingId}`);

  const { html, text } = renderEmail({
    lang,
    preheader: ar
      ? `إعلان جديد يطابق بحثك «${args.searchName}»`
      : `New listing matches your saved search "${args.searchName}"`,
    heading: ar ? "نتيجة جديدة لبحثك المحفوظ" : "New match for your saved search",
    intro: ar
      ? `يا ${args.userName}، ظهر إعلان جديد يطابق بحثك المحفوظ «${args.searchName}».`
      : `Hi ${args.userName}, a new listing matches your saved search "${args.searchName}".`,
    rows: [
      { label: ar ? "الإعلان" : "Listing", value: args.listingTitle },
      { label: ar ? "البحث المحفوظ" : "Saved search", value: args.searchName },
    ],
    cta: cta ? { label: ar ? "عرض الإعلان" : "View listing", url: cta } : undefined,
    footer: ar
      ? "تلقّيت هذا لأن لديك بحثاً محفوظاً بالتنبيهات مفعّلة. تقدر تدير التنبيهات من الإعدادات."
      : "You received this because you have a saved search with alerts enabled. Manage alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar
      ? "BANCO — نتيجة جديدة لبحثك المحفوظ"
      : "BANCO — New match for your saved search",
    html,
    text,
  });
}

/** Notify a user that the cash price dropped on a listing they saved. */
export async function sendPriceDropEmail(args: {
  to: string;
  lang?: EmailLang;
  userName: string;
  listingTitle: string;
  oldPrice: number;
  newPrice: number;
  listingId: string;
}): Promise<void> {
  const lang: EmailLang = args.lang ?? "ar";
  const ar = lang === "ar";
  const { transport, appUrl } = await resolveEmailRuntime();
  const cta = appUrl(`/listing/${args.listingId}`);

  const fmt = (n: number) =>
    new Intl.NumberFormat(ar ? "ar-EG" : "en-EG", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(n);

  const { html, text } = renderEmail({
    lang,
    preheader: ar
      ? `انخفض سعر «${args.listingTitle}»`
      : `Price dropped on "${args.listingTitle}"`,
    heading: ar ? "انخفض سعر إعلان محفوظ" : "Price drop on a saved listing",
    intro: ar
      ? `يا ${args.userName}، انخفض سعر إعلان حفظته من قبل.`
      : `Hi ${args.userName}, the price dropped on a listing you saved.`,
    rows: [
      { label: ar ? "الإعلان" : "Listing", value: args.listingTitle },
      { label: ar ? "السعر القديم" : "Old price", value: `${fmt(args.oldPrice)} EGP` },
      { label: ar ? "السعر الجديد" : "New price", value: `${fmt(args.newPrice)} EGP` },
    ],
    cta: cta ? { label: ar ? "عرض الإعلان" : "View listing", url: cta } : undefined,
    footer: ar
      ? "تلقّيت هذا لأنك حفظت هذا الإعلان. تقدر تدير تنبيهات انخفاض السعر من الإعدادات."
      : "You received this because you saved this listing. Manage price-drop alerts in Settings.",
  });

  await transport.send({
    to: args.to,
    subject: ar
      ? "BANCO — انخفض سعر إعلان محفوظ"
      : "BANCO — Price drop on a saved listing",
    html,
    text,
  });
}
