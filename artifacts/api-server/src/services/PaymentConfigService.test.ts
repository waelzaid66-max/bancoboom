import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, createUser, deleteUsers } from "../__tests__/helpers";
import {
  paymentProviderConfig,
  type PaymentProviderConfigRow,
} from "@workspace/db/schema";
import {
  PROVIDER,
  getAdminView,
  getResolvedConfig,
  upsertConfig,
} from "./PaymentConfigService";
import { verifyPaymobWebhook } from "../lib/paymentProvider";

// This suite OWNS the singleton payment_provider_config row. Because the row is
// keyed by provider (one per provider) on a shared database, no other suite may
// mutate it concurrently — config-dependent assertions live only here. We back
// up any pre-existing row and restore it verbatim afterwards so a real
// admin-saved config is never destroyed by the test run.

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

function fieldValue(v: unknown): string {
  if (v === true) return "true";
  if (v === false) return "false";
  if (v == null) return "";
  return String(v);
}

/** Sign a webhook obj exactly as Paymob would, with a given hmac secret. */
function sign(obj: Record<string, unknown>, secret: string): string {
  const concatenated = HMAC_FIELD_ORDER.map((p) =>
    fieldValue(getPath(obj, p))
  ).join("");
  return createHmac("sha512", secret).update(concatenated).digest("hex");
}

/** A representative successful "transaction processed" payload for one intent. */
function buildWebhookObj(intentId: string): Record<string, unknown> {
  return {
    amount_cents: 75000,
    created_at: "2026-06-17T00:00:00",
    currency: "EGP",
    error_occured: false,
    has_parent_transaction: false,
    id: 987654,
    integration_id: 12345,
    is_3d_secure: true,
    is_auth: false,
    is_capture: false,
    is_refunded: false,
    is_standalone_payment: true,
    is_voided: false,
    order: { id: 555, merchant_order_id: intentId },
    owner: 42,
    pending: false,
    source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
    success: true,
    payment_key_claims: { extra: { intent_id: intentId } },
  };
}

let savedRow: PaymentProviderConfigRow | null = null;
let adminId: string;

// Snapshot env we may mutate so the test process is left exactly as found.
const ENV_KEYS = [
  "PAYMENT_CONFIG_ENCRYPTION_KEY",
  "PAYMOB_SECRET_KEY",
  "PAYMOB_PUBLIC_KEY",
  "PAYMOB_HMAC_SECRET",
  "PAYMOB_INTEGRATION_IDS",
  "PAYMOB_MODE",
] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  // Deterministic encryption key so what we encrypt here we can decrypt here.
  process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = "unit_test_master_key";

  const [existing] = await db
    .select()
    .from(paymentProviderConfig)
    .where(eq(paymentProviderConfig.provider, PROVIDER))
    .limit(1);
  savedRow = existing ?? null;

  adminId = await createUser({ role: "company" });
});

beforeEach(async () => {
  // Each test starts from a clean slate it fully controls.
  await db
    .delete(paymentProviderConfig)
    .where(eq(paymentProviderConfig.provider, PROVIDER));
  // Default: no env config unless a test opts in.
  delete process.env.PAYMOB_SECRET_KEY;
  delete process.env.PAYMOB_PUBLIC_KEY;
  delete process.env.PAYMOB_HMAC_SECRET;
  delete process.env.PAYMOB_INTEGRATION_IDS;
  delete process.env.PAYMOB_MODE;
});

afterAll(async () => {
  // Restore the row exactly as we found it (non-destructive on shared DB).
  await db
    .delete(paymentProviderConfig)
    .where(eq(paymentProviderConfig.provider, PROVIDER));
  if (savedRow) {
    await db.insert(paymentProviderConfig).values(savedRow);
  }
  await deleteUsers(adminId);
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("PaymentConfigService", () => {
  it("masks secrets in the admin view and never returns raw values", async () => {
    await upsertConfig(
      {
        enabled: true,
        mode: "live",
        publicKey: "egy_pk_live_PUBLIC",
        integrationIds: "111,222",
        secretKey: "egy_sk_live_SECRET",
        hmacSecret: "egy_hmac_live_SECRET",
      },
      adminId
    );

    const view = await getAdminView();
    expect(view.configured).toBe(true);
    expect(view.enabled).toBe(true);
    expect(view.source).toBe("db");
    expect(view.mode).toBe("live");
    expect(view.public_key).toBe("egy_pk_live_PUBLIC");
    expect(view.integration_ids).toBe("111,222");
    expect(view.has_secret_key).toBe(true);
    expect(view.has_hmac_secret).toBe(true);
    expect(view.updated_by).toBe(adminId);

    // No raw secret material may appear anywhere in the serialized view.
    const serialized = JSON.stringify(view);
    expect(serialized).not.toContain("egy_sk_live_SECRET");
    expect(serialized).not.toContain("egy_hmac_live_SECRET");
  });

  it("resolves DB config first (DB-first over env)", async () => {
    // Env is fully configured but the enabled DB row must win.
    process.env.PAYMOB_SECRET_KEY = "env_secret";
    process.env.PAYMOB_PUBLIC_KEY = "env_public";
    process.env.PAYMOB_HMAC_SECRET = "env_hmac";

    await upsertConfig(
      {
        enabled: true,
        mode: "test",
        publicKey: "db_public",
        integrationIds: "900, 901",
        apiBase: "https://accept.paymob.com/",
        secretKey: "db_secret",
        hmacSecret: "db_hmac",
      },
      adminId
    );

    const cfg = await getResolvedConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.source).toBe("db");
    expect(cfg!.secretKey).toBe("db_secret");
    expect(cfg!.hmacSecret).toBe("db_hmac");
    expect(cfg!.publicKey).toBe("db_public");
    expect(cfg!.integrationIds).toEqual([900, 901]);
    // apiBase trailing slash normalized away.
    expect(cfg!.apiBase).toBe("https://accept.paymob.com");
  });

  it("falls back to env when the DB row is disabled", async () => {
    process.env.PAYMOB_SECRET_KEY = "env_secret";
    process.env.PAYMOB_PUBLIC_KEY = "env_public";
    process.env.PAYMOB_HMAC_SECRET = "env_hmac";

    await upsertConfig(
      {
        enabled: false,
        publicKey: "db_public",
        secretKey: "db_secret",
        hmacSecret: "db_hmac",
      },
      adminId
    );

    const cfg = await getResolvedConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.source).toBe("env");
    expect(cfg!.secretKey).toBe("env_secret");
  });

  it("returns null when nothing is configured", async () => {
    expect(await getResolvedConfig()).toBeNull();
    const view = await getAdminView();
    expect(view.configured).toBe(false);
    expect(view.source).toBe("none");
  });

  it("treats secret fields as write-only (empty keeps existing)", async () => {
    await upsertConfig(
      {
        enabled: true,
        publicKey: "pub1",
        secretKey: "first_secret",
        hmacSecret: "first_hmac",
      },
      adminId
    );

    // Update non-secret fields only; omit secrets entirely.
    await upsertConfig({ publicKey: "pub2", integrationIds: "5" }, adminId);

    const cfg = await getResolvedConfig();
    expect(cfg!.publicKey).toBe("pub2");
    expect(cfg!.integrationIds).toEqual([5]);
    // Secrets preserved across the secret-less update.
    expect(cfg!.secretKey).toBe("first_secret");
    expect(cfg!.hmacSecret).toBe("first_hmac");
  });
});

describe("verifyPaymobWebhook reads fresh DB config", () => {
  it("accepts a payload signed with the currently-stored HMAC secret", async () => {
    const intentId = "11111111-1111-4111-8111-111111111111";
    await upsertConfig(
      {
        enabled: true,
        publicKey: "pub",
        secretKey: "sk",
        hmacSecret: "hmac_v1",
      },
      adminId
    );

    const obj = buildWebhookObj(intentId);
    const v1 = await verifyPaymobWebhook({
      obj,
      providedHmac: sign(obj, "hmac_v1"),
    });
    expect(v1.valid).toBe(true);
    expect(v1.intentId).toBe(intentId);
    expect(v1.success).toBe(true);
    expect(v1.amountCents).toBe(75000);
  });

  it("rejects a signature made with the OLD secret after rotation", async () => {
    const intentId = "22222222-2222-4222-8222-222222222222";
    await upsertConfig(
      {
        enabled: true,
        publicKey: "pub",
        secretKey: "sk",
        hmacSecret: "hmac_old",
      },
      adminId
    );
    const obj = buildWebhookObj(intentId);
    const oldSig = sign(obj, "hmac_old");

    // Rotate the HMAC secret via the admin path (write-only).
    await upsertConfig({ hmacSecret: "hmac_new" }, adminId);

    // The signature made with the old secret must now be rejected...
    const stale = await verifyPaymobWebhook({ obj, providedHmac: oldSig });
    expect(stale.valid).toBe(false);

    // ...and a signature with the new secret accepted — proving fresh reads.
    const fresh = await verifyPaymobWebhook({
      obj,
      providedHmac: sign(obj, "hmac_new"),
    });
    expect(fresh.valid).toBe(true);
  });

  it("rejects a missing or malformed signature", async () => {
    const intentId = "33333333-3333-4333-8333-333333333333";
    await upsertConfig(
      {
        enabled: true,
        publicKey: "pub",
        secretKey: "sk",
        hmacSecret: "hmac",
      },
      adminId
    );
    const obj = buildWebhookObj(intentId);
    expect((await verifyPaymobWebhook({ obj, providedHmac: undefined })).valid).toBe(
      false
    );
    expect((await verifyPaymobWebhook({ obj, providedHmac: "deadbeef" })).valid).toBe(
      false
    );
  });
});
