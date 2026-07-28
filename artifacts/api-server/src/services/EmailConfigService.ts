import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { emailProviderConfig } from "@workspace/db/schema";
import { encryptSecret, decryptSecret } from "../lib/secretCrypto";

/**
 * Admin-managed transactional-email provider configuration.
 *
 * Single source of truth for resolving the active email-delivery credentials.
 * It reads the admin-editable `email_provider_config` row first (DB-first) and
 * falls back to environment variables, so a fresh deployment keeps working off
 * the secrets manager until an admin saves config in the Control Center.
 *
 * It owns NO SMTP/HTTP — that lives in `EmailService.ts`, which calls
 * `getResolvedConfig()` here. Keeping the dependency one-directional
 * (EmailService → EmailConfigService → db/crypto) avoids an import cycle.
 *
 * Secret material (the provider API key) is stored ONLY as AES-256-GCM
 * ciphertext (see lib/secretCrypto) and is never returned to any client.
 */

export const PROVIDER = "resend";

const DEFAULT_FROM = "BANCO <noreply@banco.today>";

/** Fully-resolved config the email transport needs to operate. */
export interface ResolvedEmailConfig {
  source: "db" | "env";
  /** Provider API key, or null when none is configured (→ log-only transport). */
  apiKey: string | null;
  /** Fully-formed From header, e.g. `BANCO <noreply@banco.today>`. */
  from: string;
  /** Public base URL for email CTA links, or null when unset. */
  publicAppUrl: string | null;
}

/** Redacted view returned to the admin client — never includes the raw key. */
export interface EmailConfigAdminView {
  provider: string;
  /** Where the effective config comes from right now. */
  source: "db" | "env" | "none";
  /** True when an API key resolves (real delivery is active). */
  configured: boolean;
  /** DB row's enabled flag (false when no DB row exists). */
  enabled: boolean;
  /** Which transport will actually run on the next send. */
  active_transport: "resend" | "log";
  from_name: string | null;
  from_email: string | null;
  sending_domain: string | null;
  reply_to: string | null;
  public_app_url: string | null;
  /** Whether an API key is stored (in DB or env) — never the value. */
  has_api_key: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

/** Editable fields. The API key is write-only: omit/empty = keep existing. */
export interface EmailConfigUpdate {
  enabled?: boolean;
  fromName?: string | null;
  fromEmail?: string | null;
  sendingDomain?: string | null;
  replyTo?: string | null;
  publicAppUrl?: string | null;
  apiKey?: string;
}

function trimOrNull(v: string | null | undefined): string | null {
  const t = v?.trim() ?? "";
  return t === "" ? null : t;
}

function normalizeUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.replace(/\/+$/, "");
}

/** Build the From header from saved parts, falling back to env / default. */
function composeFrom(
  fromName: string | null,
  fromEmail: string | null,
): string | null {
  const email = fromEmail?.trim();
  if (!email) return null;
  const name = fromName?.trim();
  return name ? `${name} <${email}>` : email;
}

async function getRow() {
  const [row] = await db
    .select()
    .from(emailProviderConfig)
    .where(eq(emailProviderConfig.provider, PROVIDER))
    .limit(1);
  return row ?? null;
}

type ConfigRow = Awaited<ReturnType<typeof getRow>>;

function resolveFromEnv(): ResolvedEmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  return {
    source: "env",
    apiKey,
    from,
    publicAppUrl: normalizeUrl(process.env.PUBLIC_APP_URL),
  };
}

/** Build a resolved config from a DB row. Decryption failure → null (fallback). */
function buildFromRow(row: ConfigRow): ResolvedEmailConfig | null {
  if (!row) return null;
  try {
    const apiKey = row.encApiKey ? decryptSecret(row.encApiKey) : null;
    const env = resolveFromEnv();
    return {
      source: "db",
      apiKey,
      from: composeFrom(row.fromName, row.fromEmail) ?? env.from,
      publicAppUrl: normalizeUrl(row.publicAppUrl) ?? env.publicAppUrl,
    };
  } catch (err) {
    // Decryption failed (e.g. the encryption key was rotated). Don't hard-fail
    // email — surface it and fall back to env config.
    console.error("[EmailConfig] Failed to decrypt stored API key.", err);
    return null;
  }
}

/**
 * Resolve the active email config: an enabled DB row wins; otherwise we fall
 * back to environment variables. Always reads fresh from the DB (no cache) so a
 * rotated key or swapped sender takes effect on the next send.
 */
export async function getResolvedConfig(): Promise<ResolvedEmailConfig> {
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
export async function getTestConfig(): Promise<ResolvedEmailConfig> {
  return buildFromRow(await getRow()) ?? resolveFromEnv();
}

/** Redacted admin view: DB row's display fields + the effective source/status. */
export async function getAdminView(): Promise<EmailConfigAdminView> {
  const row = await getRow();
  const resolved = await getResolvedConfig();
  const env = resolveFromEnv();

  const hasApiKey = Boolean(row?.encApiKey) || Boolean(env.apiKey);
  return {
    provider: PROVIDER,
    source: resolved.apiKey || row ? resolved.source : "none",
    configured: Boolean(resolved.apiKey),
    enabled: row?.enabled ?? false,
    active_transport: resolved.apiKey ? "resend" : "log",
    from_name: row?.fromName ?? null,
    from_email: row?.fromEmail ?? null,
    sending_domain: row?.sendingDomain ?? null,
    reply_to: row?.replyTo ?? null,
    public_app_url: row?.publicAppUrl ?? env.publicAppUrl,
    has_api_key: hasApiKey,
    updated_at: row?.updatedAt ? row.updatedAt.toISOString() : null,
    updated_by: row?.updatedBy ?? null,
  };
}

/**
 * Create or update the email provider config. The API key is write-only: when
 * it is omitted or empty the stored ciphertext is preserved. Non-secret fields
 * are applied when present (empty string clears an optional field).
 */
export async function upsertConfig(
  input: EmailConfigUpdate,
  adminUserId: string,
): Promise<void> {
  const existing = await getRow();

  const encApiKey =
    input.apiKey && input.apiKey.trim()
      ? encryptSecret(input.apiKey.trim())
      : (existing?.encApiKey ?? null);

  const values = {
    provider: PROVIDER,
    enabled: input.enabled ?? existing?.enabled ?? false,
    fromName:
      input.fromName !== undefined
        ? trimOrNull(input.fromName)
        : (existing?.fromName ?? null),
    fromEmail:
      input.fromEmail !== undefined
        ? trimOrNull(input.fromEmail)
        : (existing?.fromEmail ?? null),
    sendingDomain:
      input.sendingDomain !== undefined
        ? trimOrNull(input.sendingDomain)
        : (existing?.sendingDomain ?? null),
    replyTo:
      input.replyTo !== undefined
        ? trimOrNull(input.replyTo)
        : (existing?.replyTo ?? null),
    publicAppUrl:
      input.publicAppUrl !== undefined
        ? trimOrNull(input.publicAppUrl)
        : (existing?.publicAppUrl ?? null),
    encApiKey,
    updatedBy: adminUserId,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(emailProviderConfig)
      .set(values)
      .where(eq(emailProviderConfig.provider, PROVIDER));
  } else {
    await db.insert(emailProviderConfig).values(values);
  }
}

export interface EmailConfigTestResult {
  ok: boolean;
  message: string;
  active_transport: "resend" | "log";
  source: "db" | "env" | "none";
}

/**
 * Validate the resolved config against Resend. Uses the stored key even while
 * the config is disabled (mirrors the payment "Test connection" affordance).
 * With no key configured we report the honest log-only state rather than fail.
 */
export async function testConnection(): Promise<EmailConfigTestResult> {
  const cfg = await getTestConfig();
  const row = await getRow();
  const source: "db" | "env" | "none" = cfg.apiKey
    ? cfg.source
    : row
      ? cfg.source
      : "none";

  if (!cfg.apiKey) {
    return {
      ok: true,
      message:
        "No API key configured — emails are rendered and logged (not delivered). Add a Resend API key to enable real delivery.",
      active_transport: "log",
      source,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });
    if (res.ok) {
      return {
        ok: true,
        message: `Resend key is valid. Sending as ${cfg.from}.`,
        active_transport: "resend",
        source,
      };
    }
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      message: `Resend rejected the key (HTTP ${res.status}). ${detail}`.trim(),
      active_transport: "resend",
      source,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Could not reach Resend: ${
        err instanceof Error ? err.message : String(err)
      }`,
      active_transport: "resend",
      source,
    };
  }
}
