#!/usr/bin/env node
/**
 * Run a command with .secrets/local.env loaded (never prints values).
 * Usage: node scripts/run-with-local-secrets.mjs <command> [args...]
 * Example: node scripts/run-with-local-secrets.mjs npx eas whoami
 */
import { spawnSync } from "node:child_process";

import { tryLoadLocalSecrets } from "./load-local-secrets.mjs";

tryLoadLocalSecrets();

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node scripts/run-with-local-secrets.mjs <command> [args...]");
  process.exit(2);
}

const r = spawnSync(cmd, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(r.status ?? 1);
