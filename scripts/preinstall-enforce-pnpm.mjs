#!/usr/bin/env node
/**
 * Cross-platform preinstall: enforce pnpm and remove alien lockfiles.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ua = process.env.npm_config_user_agent || "";

if (!ua.includes("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

for (const name of ["package-lock.json", "yarn.lock"]) {
  const file = path.join(root, name);
  try {
    fs.unlinkSync(file);
  } catch {
    /* absent */
  }
}
