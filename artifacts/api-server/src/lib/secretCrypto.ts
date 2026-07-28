import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Symmetric encryption for PSP secret material stored in the database.
 *
 * Payment provider credentials (the PSP secret key + webhook HMAC secret) are
 * admin-editable, so they live in the `payment_provider_config` table — but they
 * MUST NOT sit in plaintext where a DB dump or checkpoint would expose them.
 * Every secret column holds an AES-256-GCM ciphertext produced here.
 *
 * The master key comes from `PAYMENT_CONFIG_ENCRYPTION_KEY` when set, otherwise
 * it is derived from `SESSION_SECRET` (always present). A dedicated key is
 * preferred because rotating SESSION_SECRET would otherwise make existing
 * ciphertext undecryptable — if you ever rotate, re-save the config first.
 *
 * Format: `v1:<base64(iv | authTag | ciphertext)>`. The 12-byte IV is random per
 * encryption; GCM's auth tag makes tampering detectable (decrypt throws).
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
// A fixed salt keeps key derivation deterministic so the same master secret
// always yields the same AES key (required to decrypt what we encrypted).
const KEY_SALT = "banco.payment-config.v1";

function masterSecret(): string {
  const explicit = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY?.trim();
  if (explicit) return explicit;
  const session = process.env.SESSION_SECRET?.trim();
  if (session) return session;
  throw new Error(
    "Cannot encrypt payment config: neither PAYMENT_CONFIG_ENCRYPTION_KEY nor SESSION_SECRET is set."
  );
}

function deriveKey(): Buffer {
  return scryptSync(masterSecret(), KEY_SALT, 32);
}

/** Encrypt a UTF-8 plaintext into a versioned, self-describing token. */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ciphertext]).toString("base64");
  return `${VERSION}:${payload}`;
}

/** Decrypt a token produced by `encryptSecret`. Throws on tampering or wrong key. */
export function decryptSecret(token: string): string {
  const [version, payload] = token.split(":", 2);
  if (version !== VERSION || !payload) {
    throw new Error("Unrecognized secret token format");
  }
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** True when a stored value looks like one of our encryption tokens. */
export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}:`);
}
