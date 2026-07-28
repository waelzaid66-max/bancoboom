#!/usr/bin/env node
/**
 * Post-build route smoke — starts banco-web locally, hits static routes, exits.
 * Does NOT require CDN or mobile. Optional listing share check needs live API.
 *
 * Prereq: `pnpm --filter @workspace/banco-web run build` already ran.
 *
 * Usage:
 *   node scripts/website-post-build-smoke.mjs
 *   BANCO_LISTING_SMOKE_ID=<uuid> node scripts/website-post-build-smoke.mjs
 *
 * Exit: 0 pass, 1 fail
 */

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BANCO_WEB_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const isWin = process.platform === "win32";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";
const npx = isWin ? "npx.cmd" : "npx";

let server = null;

function shutdownServer() {
  if (!server || server.killed) return;
  try {
    if (isWin) {
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      process.kill(-server.pid, "SIGTERM");
    }
  } catch {
    try {
      server.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

function startServer() {
  server = spawn(pnpm, ["--filter", "@workspace/banco-web", "start"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: isWin,
    detached: !isWin,
    env: { ...process.env, PORT: "3000", HOSTNAME: "0.0.0.0" },
  });
}

function waitForHealth() {
  const result = spawnSync(
    npx,
    ["--yes", "wait-on@8.0.1", "-t", "120000", `${BASE}/api/health`],
    { cwd: ROOT, stdio: "inherit", shell: isWin },
  );
  return result.status === 0;
}

function runStagingSmoke() {
  return spawnSync("node", ["scripts/website-staging-smoke.mjs"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, BANCO_WEB_URL: BASE },
    shell: isWin,
  });
}

process.on("exit", shutdownServer);
process.on("SIGINT", () => {
  shutdownServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdownServer();
  process.exit(143);
});

console.log("Post-build smoke — isolated from mobile/API deploy\n");
startServer();

if (!waitForHealth()) {
  console.error("[FAIL] banco-web did not become healthy in time");
  shutdownServer();
  process.exit(1);
}

const smoke = runStagingSmoke();
shutdownServer();
process.exit(smoke.status === 0 ? 0 : 1);
