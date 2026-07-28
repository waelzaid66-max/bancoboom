import { createHmac, timingSafeEqual } from "node:crypto";
import { invalidData } from "./billing";
import {
  getResolvedConfig,
  getTestConfig,
  type ResolvedPaymentConfig,
  type PaymentMode,
} from "../services/PaymentConfigService";

export type { PaymentMode };

/**
 * REAL payment-provider boundary — Paymob (Egypt).
 *
 * This is the single, clearly-isolated seam where the Egyptian PSP plugs in.
 * `createProviderCharge` calls Paymob's Unified Intention API to open a payment
 * and returns its reference plus a hosted checkout URL. Settlement arrives
 * asynchronously via Paymob's signed "transaction processed" webhook, which is
 * verified here (`verifyPaymobWebhook`) and drives the payment_intent from
 * pending → completed. A client can never self-confirm a payment.
 *
 * Nothing else in the system knows about providers — all money lands through
 * WalletService.applyTransaction regardless of how settlement is delivered.
 *
 * Paymob supports cards, Fawry, and mobile wallets (Vodafone Cash, etc.) behind
 * one unified checkout, so the buyer-selected `EgyptianRail` is recorded as a
 * preference while the actual rail is chosen on Paymob's hosted page.
 *
 * Configuration (all via the secrets manager, never the repo):
 *  - PAYMOB_SECRET_KEY      Bearer token for the Intention API.
 *  - PAYMOB_PUBLIC_KEY      Public key used to build the unified checkout URL.
 *  - PAYMOB_HMAC_SECRET     Shared secret for verifying webhook signatures.
 *  - PAYMOB_INTEGRATION_IDS Comma-separated integration ids to offer at checkout.
 *  - PAYMOB_MODE            "test" (default) | "live" — informational/diagnostic.
 *  - PAYMOB_API_BASE        Optional host override (default accept.paymob.com).
 *  - PUBLIC_API_BASE_URL    Optional override for webhook/redirect callback host.
 */

export type EgyptianRail =
  | "vodafone_cash"
  | "fawry"
  | "instapay"
  | "bank_transfer";

/**
 * The active config plus the deployment-derived callback host. Credentials are
 * resolved by PaymentConfigService (admin DB row first, env fallback); the
 * webhook/redirect host is always derived from the runtime environment.
 */
interface ActivePaymentConfig extends ResolvedPaymentConfig {
  callbackBaseUrl: string | null;
}

export interface ProviderChargeInput {
  /** Positive EGP amount as a 2-decimal string. */
  amount: string;
  /** Buyer-selected rail (recorded as a preference). */
  method: EgyptianRail;
  /** Our payment_intent id — used as the unique merchant reference. */
  intentId: string;
  purpose: "wallet_topup" | "subscription";
  userId: string;
  description?: string;
}

export interface ProviderChargeResult {
  /** Paymob intention id, stored on the intent. */
  providerRef: string;
  /** Hosted Unified Checkout URL the buyer is sent to. */
  checkoutUrl: string;
}

const HTTP_TIMEOUT_MS = 15_000;

/**
 * Resolve the active config (admin DB row first, env fallback) and attach the
 * deployment-derived callback host. Async because the DB is the source of truth.
 */
async function readConfig(): Promise<ActivePaymentConfig | null> {
  const resolved = await getResolvedConfig();
  if (!resolved) return null;
  return { ...resolved, callbackBaseUrl: resolveCallbackBaseUrl() };
}

function resolveCallbackBaseUrl(): string | null {
  const explicit = process.env.PUBLIC_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const domain =
    process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ||
    process.env.REPLIT_DEV_DOMAIN?.trim();
  return domain ? `https://${domain}` : null;
}

/** True when the PSP credentials are present and a real charge can be opened. */
export async function isPaymentConfigured(): Promise<boolean> {
  return (await readConfig()) !== null;
}

/** Active provider mode (test/live); defaults to "test" when unconfigured. */
export async function paymentMode(): Promise<PaymentMode> {
  return (await readConfig())?.mode ?? "test";
}

async function requireConfig(): Promise<ActivePaymentConfig> {
  const cfg = await readConfig();
  if (!cfg) {
    throw invalidData(
      "Payment gateway is not configured. Please try again later."
    );
  }
  if (cfg.integrationIds.length === 0) {
    throw invalidData(
      "Payment gateway has no configured payment methods. Please try again later."
    );
  }
  return cfg;
}

/**
 * Open a payment with Paymob and return its reference + hosted checkout URL.
 * The caller persists the reference on the payment_intent; settlement comes
 * later via the verified webhook.
 */
export async function createProviderCharge(
  input: ProviderChargeInput
): Promise<ProviderChargeResult> {
  const cfg = await requireConfig();

  const amountCents = Math.round(Number(input.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw invalidData("Invalid charge amount");
  }

  const body: Record<string, unknown> = {
    amount: amountCents,
    currency: "EGP",
    payment_methods: cfg.integrationIds,
    items: [
      {
        name:
          input.purpose === "subscription"
            ? "BANCO Subscription"
            : "BANCO Wallet Top-up",
        amount: amountCents,
        description: input.description ?? "BANCO payment",
        quantity: 1,
      },
    ],
    billing_data: {
      apartment: "NA",
      first_name: "NA",
      last_name: "NA",
      street: "NA",
      building: "NA",
      phone_number: "NA",
      city: "NA",
      country: "NA",
      email: "na@banco.today",
      floor: "NA",
      state: "NA",
    },
    extras: {
      intent_id: input.intentId,
      purpose: input.purpose,
      user_id: input.userId,
      preferred_method: input.method,
    },
    special_reference: input.intentId,
  };

  if (cfg.callbackBaseUrl) {
    body.notification_url = `${cfg.callbackBaseUrl}/api/v1/payments/webhook`;
    body.redirection_url = `${cfg.callbackBaseUrl}/api/v1/payments/return`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${cfg.apiBase}/v1/intention/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${cfg.secretKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("[Paymob] intention request failed", err);
    throw invalidData(
      "Could not reach the payment gateway. Please try again."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[Paymob] intention rejected", resp.status, text.slice(0, 500));
    throw invalidData("The payment gateway rejected this request.");
  }

  const data = (await resp.json().catch(() => null)) as {
    client_secret?: string;
    id?: string | number;
  } | null;

  if (!data?.client_secret || data.id == null) {
    console.error(
      "[Paymob] intention missing fields",
      JSON.stringify(data ?? {}).slice(0, 500)
    );
    throw invalidData("The payment gateway returned an unexpected response.");
  }

  const checkoutUrl =
    `${cfg.apiBase}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey)}` +
    `&clientSecret=${encodeURIComponent(data.client_secret)}`;

  return { providerRef: String(data.id), checkoutUrl };
}

/* ── webhook signature verification ─────────────────────── */

// Paymob computes the HMAC over these `obj` fields, in this exact order, then
// HMAC-SHA512 with the merchant's HMAC secret. Booleans render as "true"/"false".
const HMAC_FIELD_ORDER = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function hmacFieldValue(v: unknown): string {
  if (v === true) return "true";
  if (v === false) return "false";
  if (v == null) return "";
  return String(v);
}

export interface WebhookVerification {
  /** True only when the HMAC signature matched. */
  valid: boolean;
  /** Our payment_intent id, recovered from the order/extras. */
  intentId: string | null;
  /** Settlement outcome — true only for a fully successful transaction. */
  success: boolean;
  /** Paymob transaction id (for audit/metadata). */
  providerTxnId: string | null;
  /** Amount in piasters reported by the provider (tamper check). */
  amountCents: number | null;
}

/**
 * Verify a Paymob transaction-processed webhook. Returns `valid: false` unless
 * the HMAC signature matches the configured secret (constant-time comparison).
 * Only after a valid signature are the embedded fields trusted.
 */
export async function verifyPaymobWebhook(params: {
  obj: Record<string, unknown>;
  providedHmac: string | undefined | null;
}): Promise<WebhookVerification> {
  const result: WebhookVerification = {
    valid: false,
    intentId: null,
    success: false,
    providerTxnId: null,
    amountCents: null,
  };

  // Always resolve fresh config so a rotated/swapped HMAC secret takes effect
  // immediately — a stale secret would silently reject (or accept) webhooks.
  const cfg = await readConfig();
  if (!cfg || !params.providedHmac) return result;

  const obj = params.obj;
  const concatenated = HMAC_FIELD_ORDER.map((p) =>
    hmacFieldValue(getPath(obj, p))
  ).join("");
  const expected = createHmac("sha512", cfg.hmacSecret)
    .update(concatenated)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(params.providedHmac, "utf8");
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return result;
  }

  const merchantOrderId = getPath(obj, "order.merchant_order_id");
  const extraIntent =
    getPath(obj, "payment_key_claims.extra.intent_id") ??
    getPath(obj, "extras.intent_id");
  const intentId =
    typeof merchantOrderId === "string" && merchantOrderId
      ? merchantOrderId
      : typeof extraIntent === "string" && extraIntent
        ? extraIntent
        : null;

  const success =
    obj.success === true &&
    obj.error_occured === false &&
    obj.pending !== true;

  const rawAmount = obj.amount_cents;
  const amountCents =
    typeof rawAmount === "number"
      ? rawAmount
      : Number.isFinite(Number(rawAmount))
        ? Number(rawAmount)
        : null;

  return {
    valid: true,
    intentId,
    success,
    providerTxnId: obj.id != null ? String(obj.id) : null,
    amountCents,
  };
}

/* ── connection test (admin diagnostics) ────────────────── */

export interface ProviderTestResult {
  ok: boolean;
  message: string;
  mode: PaymentMode;
  source: "db" | "env" | "none";
}

/**
 * Validate the saved credentials by opening a tiny throwaway intention at Paymob
 * (no money moves until a buyer actually pays). Ignores the `enabled` flag so an
 * admin can verify a freshly-saved config before switching it on.
 */
export async function testProviderConnection(): Promise<ProviderTestResult> {
  const cfg = await getTestConfig();
  if (!cfg) {
    return {
      ok: false,
      message: "No payment credentials are configured to test.",
      mode: "test",
      source: "none",
    };
  }
  if (cfg.integrationIds.length === 0) {
    return {
      ok: false,
      message: "No payment method (integration) ids are configured.",
      mode: cfg.mode,
      source: cfg.source,
    };
  }

  const amountCents = 100;
  const body = {
    amount: amountCents,
    currency: "EGP",
    payment_methods: cfg.integrationIds,
    items: [
      {
        name: "BANCO connection test",
        amount: amountCents,
        description: "Connection test",
        quantity: 1,
      },
    ],
    billing_data: {
      apartment: "NA",
      first_name: "NA",
      last_name: "NA",
      street: "NA",
      building: "NA",
      phone_number: "NA",
      city: "NA",
      country: "NA",
      email: "na@banco.today",
      floor: "NA",
      state: "NA",
    },
    extras: { test: true },
    special_reference: `test_${Date.now()}`,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const resp = await fetch(`${cfg.apiBase}/v1/intention/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${cfg.secretKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return {
        ok: false,
        message: `Gateway rejected the test (HTTP ${resp.status}). ${text.slice(0, 200)}`.trim(),
        mode: cfg.mode,
        source: cfg.source,
      };
    }
    const data = (await resp.json().catch(() => null)) as {
      client_secret?: string;
    } | null;
    if (!data?.client_secret) {
      return {
        ok: false,
        message: "Gateway responded but returned no checkout token.",
        mode: cfg.mode,
        source: cfg.source,
      };
    }
    return {
      ok: true,
      message: `Connection OK — gateway accepted a ${cfg.mode} intention using ${cfg.integrationIds.length} payment method(s).`,
      mode: cfg.mode,
      source: cfg.source,
    };
  } catch {
    return {
      ok: false,
      message: "Could not reach the payment gateway. Check the API base / network.",
      mode: cfg.mode,
      source: cfg.source,
    };
  } finally {
    clearTimeout(timer);
  }
}
