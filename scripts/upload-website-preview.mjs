#!/usr/bin/env node
/**
 * Optional PR preview upload for landing static dist (GCS).
 * No-op when WEBSITE_PREVIEW_GCS_BUCKET is unset — safe for CI without secrets.
 *
 * Usage:
 *   WEBSITE_PREVIEW_GCS_BUCKET=my-bucket \
 *   WEBSITE_PREVIEW_PR=42 \
 *   node scripts/upload-website-preview.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bucket = process.env.WEBSITE_PREVIEW_GCS_BUCKET?.trim();
const pr = process.env.WEBSITE_PREVIEW_PR?.trim();
const distDir = path.join(ROOT, "artifacts", "landing", "dist", "public");

if (!bucket) {
  console.log("WEBSITE_PREVIEW_GCS_BUCKET not set — skipping GCS preview upload.");
  process.exit(0);
}

if (!pr) {
  console.error("WEBSITE_PREVIEW_PR is required when uploading preview.");
  process.exit(2);
}

if (!fs.existsSync(distDir)) {
  console.error(`Missing landing dist: ${distDir}`);
  process.exit(1);
}

const dest = `gs://${bucket}/pr-${pr}/`;
const gsutil = spawnSync("gsutil", ["-m", "cp", "-r", distDir, dest], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (gsutil.status !== 0) {
  console.error("gsutil upload failed (is gcloud auth configured?).");
  process.exit(gsutil.status ?? 1);
}

const publicBase = process.env.WEBSITE_PREVIEW_PUBLIC_BASE?.trim();
const previewUrl = publicBase
  ? `${publicBase.replace(/\/+$/, "")}/pr-${pr}/`
  : null;

if (previewUrl) {
  console.log(`Preview URL: ${previewUrl}`);
} else {
  console.log(`Uploaded to ${dest}`);
}

const githubOutput = process.env.GITHUB_OUTPUT?.trim();
if (githubOutput && previewUrl) {
  fs.appendFileSync(githubOutput, `preview_url=${previewUrl}\n`);
}
