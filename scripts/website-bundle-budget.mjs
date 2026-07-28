#!/usr/bin/env node
/**
 * Post-build JS bundle budget for banco-web (W1 performance gate).
 * Fails if any webpack chunk exceeds MAX_CHUNK_BYTES.
 *
 * Usage: node scripts/website-bundle-budget.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = process.env.BANCO_WEB_ROOT
  ? path.resolve(ROOT, process.env.BANCO_WEB_ROOT)
  : path.join(ROOT, "artifacts", "banco-web");
const CHUNKS_DIR = path.join(WEB_ROOT, ".next", "static", "chunks");

/** ~280 KB per chunk — headroom for search/map client routes */
const MAX_CHUNK_BYTES = Number(process.env.WEBSITE_MAX_CHUNK_KB ?? 280) * 1024;

let failed = 0;
let largest = { name: "", bytes: 0 };

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (name.endsWith(".js")) files.push(full);
  }
  return files;
}

if (!fs.existsSync(CHUNKS_DIR)) {
  console.error(`Missing chunks dir: ${CHUNKS_DIR} — run next build first`);
  process.exit(1);
}

const chunks = walk(CHUNKS_DIR);
if (chunks.length === 0) {
  console.error("No JS chunks found under .next/static/chunks");
  process.exit(1);
}

for (const file of chunks) {
  const bytes = fs.statSync(file).size;
  const rel = path.relative(WEB_ROOT, file);
  if (bytes > largest.bytes) {
    largest = { name: rel, bytes };
  }
  if (bytes > MAX_CHUNK_BYTES) {
    console.error(
      `[FAIL] ${rel}: ${(bytes / 1024).toFixed(1)} KB > ${(MAX_CHUNK_BYTES / 1024).toFixed(0)} KB budget`,
    );
    failed += 1;
  }
}

console.log(
  `[INFO] ${chunks.length} chunks scanned; largest ${largest.name} (${(largest.bytes / 1024).toFixed(1)} KB)`,
);

if (failed > 0) {
  console.error(`\n${failed} chunk(s) over budget.`);
  process.exit(1);
}

console.log("Bundle budget passed.");
