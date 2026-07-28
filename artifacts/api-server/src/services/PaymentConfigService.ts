import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { paymentProviderConfig } from "@workspace/db/schema";
import { encryptSecret, decryptSecret } from "../lib/secretCrypto";

/**
 * Admin-managed payment provider configuration.
 *
 * This service is the single source of truth for resolving the active PSP
 * credentials. It reads the admin-editable `payment_provider_config` row first
 * (DB-first) and falls back to environment variables, so a fresh deployment
 * keeps working off the secrets manager until an admin saves config in the UI.
 *
 * It owns NO provider HTTP — that lives in `paymentProvider.ts`, which calls
 * `getResolvedConfig()` here. Keeping the dependency one-directional
 * (paymentProvider → PaymentConfigService → db/crypto) avoids an import cycle.
 */

export const PROVIDER = "paymob";

export type PaymentMode = "test" | "live";

/** Fully-resolved, decrypted config the payment seam needs to operate. */
export interface ResolvedPaymentConfig {
  source: "db" | "env";
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  integrationIds: number[];
  apiBase: string;
  mode: PaymentMode;
}

/** Redacted view returned to the admin client — never includes raw secrets. */
export interface PaymentConfigAdminView {
  provider: string;
  /** Where the effective config comes from right now. */
  source: "db" | "env" | "none";
  /** True when a complete config currently resolves (charges can be opened). */
  configured: boolean;
  /** DB row's enabled flag (false when no DB row exists). */
  enabled: boolean;
  mode: PaymentMode;
  /** Public (non-secret) key — safe to display. */
  public_key: string | null;
  integration_ids: string;
  api_base: string | null;
  /** Whether secret material is stored (in DB or env) — never the value. */
  has_secret_key: boolean;
  has_hmac_secret: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

/** Editable fields. Secret fields are write-only: omit/empty = keep existing. */
export interface PaymentConfigUpdate {
  enabled?: boolean;
  mode?: PaymentMode;
  publicKey?: string | null;
  integrationIds?: string | null;
  apiBase?: string | null;
  secretKey?: string;
  hmacSecret?: string;
}

const DEFAULT_API_BASE = "https://accept.paymob.com";

function parseIntegrationIds(raw: string | null | undefined): number[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function normalizeApiBase(raw: string | null | undefined): string {
  return (raw?.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
}

function normalizeMode(raw: string | null | undefined): PaymentMode {
  return raw?.trim() === "live" ? "live" : "test";
}

async function getRow() {
  const [row] = await db
    .select()
    .from(paymentProviderConfig)
    .where(eq(paymentProviderConfig.provider, PROVIDER))
    .limit(1);
  return row ?? null;
}

function resolveFromEnv(): ResolvedPaymentConfig | null {
  const secretKey = process.env.PAYMOB_SECRET_KEY?.trim();
  const publicKey = process.env.PAYMOB_PUBLIC_KEY?.trim();
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET?.trim();
  if (!secretKey || !publicKey || !hmacSecret) return null;
  return {
    source: "env",
    secretKey,
    publicKey,
    hmacSecret,
    integrationIds: parseIntegrationIds(process.env.PAYMOB_INTEGRATION_IDS),
    apiBase: normalizeApiBase(process.env.PAYMOB_API_BASE),
    mode: normalizeMode(process.env.PAYMOB_MODE),
  };
}

type ConfigRow = Awaited<ReturnType<typeof getRow>>;

/** Build a resolved config from a DB row, or null if incomplete/undecryptable. */
function buildFromRow(row: ConfigRow): ResolvedPaymentConfig | null {
  if (!row || !row.encSecretKey || !row.encHmacSecret || !row.publicKey) {
    return null;
  }
  try {
    return {
      source: "db",
      secretKey: decryptSecret(row.encSecretKey),
      publicKey: row.publicKey,
      hmacSecret: decryptSecret(row.encHmacSecret),
      integrationIds: parseIntegrationIds(row.integrationIds),
      apiBase: normalizeApiBase(row.apiBase),
      mode: normalizeMode(row.mode),
    };
  } catch (err) {
    // Decryption failed (e.g. the encryption key was rotated). Don't hard-fail
    // the whole payment system — surface it and let callers fall back to env.
    console.error(
      "[PaymentConfig] Failed to decrypt stored credentials.",
      err
    );
    return null;
  }
}

/**
 * Resolve the active credentials: an enabled, complete DB row wins; otherwise we
 * fall back to environment variables. Returns null when nothing is configured.
 *
 * Always reads fresh from the DB (no long-lived cache) so a rotated HMAC secret
 * or swapped credentials take effect immediately — critical for webhook
 * verification, which must never trust a stale secret.
 */
export async function getResolvedConfig(): Promise<ResolvedPaymentConfig | null> {
  const row = await getRow();
  if (row?.enabled) {
    const fromRow = buildFromRow(row);
    if (fromRow) return fromRow;
  }
  return resolveFromEnv();
}

/**
 * Like getResolvedConfig but ignores the `enabled` flag — used by the admin
 * "Test connection" action so a freshly-saved (still disabled) config can be
 * validated before it is switched on.
 */
export async function getTestConfig(): Promise<ResolvedPaymentConfig | null> {
  return buildFromRow(await getRow()) ?? resolveFromEnv();
}

/** Redacted admin view: DB row's display fields + the effective source/status. */
export async function getAdminView(): Promise<PaymentConfigAdminView> {
  const row = await getRow();
  const resolved = await getResolvedConfig();

  // Display fields prefer the DB row (what the admin saved) and fall back to env
  // so an env-only deployment still shows its live values.
  const env = resolveFromEnv();
  return {
    provider: PROVIDER,
    source: resolved?.source ?? "none",
    configured: resolved !== null,
    enabled: row?.enabled ?? false,
    mode: normalizeMode(row?.mode ?? env?.mode),
    public_key: row?.publicKey ?? env?.publicKey ?? null,
    integration_ids:
      row?.integrationIds ??
      (env ? env.integrationIds.join(",") : "") ??
      "",
    api_base: row?.apiBase ?? (env ? env.apiBase : null),
    has_secret_key: Boolean(row?.encSecretKey) || Boolean(env?.secretKey),
    has_hmac_secret: Boolean(row?.encHmacSecret) || Boolean(env?.hmacSecret),
    updated_at: row?.updatedAt ? row.updatedAt.toISOString() : null,
    updated_by: row?.updatedBy ?? null,
  };
}

/**
 * Create or update the provider config. Secret fields are write-only: when a
 * secret is omitted or empty the stored ciphertext is preserved. Non-secret
 * fields are applied when present (empty string clears an optional field).
 */
export async function upsertConfig(
  input: PaymentConfigUpdate,
  adminUserId: string
): Promise<void> {
  const existing = await getRow();

  // Only called for fields explicitly present in the input; an empty value
  // clears the (optional) column.
  const trimOrNull = (v: string | null): string | null => {
    const t = v?.trim() ?? "";
    return t === "" ? null : t;
  };

  const encSecretKey =
    input.secretKey && input.secretKey.trim()
      ? encryptSecret(input.secretKey.trim())
      : (existing?.encSecretKey ?? null);
  const encHmacSecret =
    input.hmacSecret && input.hmacSecret.trim()
      ? encryptSecret(input.hmacSecret.trim())
      : (existing?.encHmacSecret ?? null);

  const values = {
    provider: PROVIDER,
    enabled: input.enabled ?? existing?.enabled ?? false,
    mode: normalizeMode(input.mode ?? existing?.mode),
    publicKey:
      input.publicKey !== undefined
        ? trimOrNull(input.publicKey)
        : (existing?.publicKey ?? null),
    integrationIds:
      input.integrationIds !== undefined
        ? trimOrNull(input.integrationIds)
        : (existing?.integrationIds ?? null),
    apiBase:
      input.apiBase !== undefined
        ? trimOrNull(input.apiBase)
        : (existing?.apiBase ?? null),
    encSecretKey,
    encHmacSecret,
    updatedBy: adminUserId,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(paymentProviderConfig)
      .set(values)
      .where(eq(paymentProviderConfig.provider, PROVIDER));
  } else {
    await db.insert(paymentProviderConfig).values(values);
  }
}
