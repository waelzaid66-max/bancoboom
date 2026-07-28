#!/usr/bin/env node
/**
 * Smoke a freshly built banco-web Docker image (W3/W9 gate).
 * Isolated from mobile — only exercises consumer-web container health + routes.
 *
 * Usage:
 *   node scripts/website-docker-smoke.mjs
 *
 * Env:
 *   BANCO_WEB_DOCKER_IMAGE=banco-consumer-web:ci
 *   BANCO_WEB_DOCKER_PORT=3001
 *
 * Exit: 0 pass, 1 fail
 */

import { spawnSync } from "node:child_process";

const IMAGE = process.env.BANCO_WEB_DOCKER_IMAGE?.trim() || "banco-consumer-web:ci";
const PORT = process.env.BANCO_WEB_DOCKER_PORT?.trim() || "3001";
const BASE = `http://127.0.0.1:${PORT}`;
const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";

let containerId = null;

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    stdio: "inherit",
    shell: isWin,
    ...opts,
  });
}

function cleanup() {
  if (!containerId) return;
  run("docker", ["rm", "-f", containerId], { stdio: "ignore" });
  containerId = null;
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

console.log(`Docker smoke → ${IMAGE} on :${PORT}\n`);

const start = spawnSync(
  "docker",
  ["run", "-d", "-p", `${PORT}:3000`, IMAGE],
  { encoding: "utf8", shell: isWin },
);

if (start.status !== 0 || !start.stdout?.trim()) {
  console.error("[FAIL] docker run");
  process.exit(1);
}

containerId = start.stdout.trim();

const wait = spawnSync(
  npx,
  ["--yes", "wait-on@8.0.1", "-t", "120000", `${BASE}/api/health`],
  { stdio: "inherit", shell: isWin },
);

if (wait.status !== 0) {
  console.error("[FAIL] container health timeout");
  cleanup();
  process.exit(1);
}

const smoke = spawnSync("node", ["scripts/website-staging-smoke.mjs"], {
  stdio: "inherit",
  env: { ...process.env, BANCO_WEB_URL: BASE },
  shell: isWin,
});

cleanup();
process.exit(smoke.status === 0 ? 0 : 1);
