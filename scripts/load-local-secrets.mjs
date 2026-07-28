#!/usr/bin/env node
/**
 * Load .secrets/local.env into process.env (posix KEY=VAL lines only).
 * Does not print secret values.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".secrets", "local.env");

/** Load gitignored local.env when present; no-op when missing (CI / fresh clone). */
export function tryLoadLocalSecrets() {
  if (!fs.existsSync(envPath)) {
    return { envPath, loaded: 0, present: false };
  }
  const r = loadLocalSecrets();
  return { ...r, present: true };
}

export function loadLocalSecrets() {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing ${envPath}`);
  }
  const text = fs.readFileSync(envPath, "utf8");
  let loaded = 0;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1);
    if (!/^[A-Z0-9_]+$/.test(key)) continue;
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
      loaded += 1;
    }
  }
  return { envPath, loaded };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("load-local-secrets.mjs")) {
  const r = loadLocalSecrets();
  const keys = Object.keys(process.env).filter((k) =>
    /^(CLERK_|SESSION_|RESEND_|OPENAI_|OBJECT_|PRIVATE_|PUBLIC_|ADMIN_|PAYMOB_|EXPO_|GH_|GITHUB_|AI_|DEFAULT_|VITE_)/.test(k),
  );
  console.log(`loaded_new=${r.loaded} present=${keys.length}`);
  console.log(
    "flags",
    JSON.stringify({
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      BANCO_API_URL: Boolean(process.env.BANCO_API_URL || process.env.API_URL),
      CLERK_BEARER_TOKEN: Boolean(process.env.CLERK_BEARER_TOKEN || process.env.BEARER_TOKEN),
      CLERK_SECRET_KEY: Boolean(process.env.CLERK_SECRET_KEY),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      RESEND_API_KEY_SECONDARY: Boolean(process.env.RESEND_API_KEY_SECONDARY),
      OPENAI_IS_DUMMY: (process.env.OPENAI_API_KEY || "").includes("DUMMY"),
      GH_TOKEN: Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN),
      EXPO_TOKEN: Boolean(process.env.EXPO_TOKEN),
      OBJECT_STORAGE_PROVIDER: process.env.OBJECT_STORAGE_PROVIDER || "replit",
    }),
  );
}
