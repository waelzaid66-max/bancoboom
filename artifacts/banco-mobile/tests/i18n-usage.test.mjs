// Guard: every i18n key referenced anywhere in the app resolves in the `en`
// tree (ar mirrors en by the `ar: typeof en` compile constraint). A missing key
// renders its raw path in the UI — this exact class of regression shipped when
// an external sync rewrote screens but dropped their translations (banks hub,
// section toggles, stay cards). Runs the same way as icons.test.mjs:
//   node --test tests/i18n-usage.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(APP_ROOT, "node_modules", ".cache", "i18n-usage-test");

function compileI18n() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  const res = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "tsc",
      join("constants", "i18n.ts"),
      "--outDir",
      OUT_DIR,
      "--module",
      "commonjs",
      "--target",
      "es2020",
      "--skipLibCheck",
    ],
    { cwd: APP_ROOT, encoding: "utf8", shell: process.platform === "win32" },
  );
  assert.equal(res.status, 0, `i18n.ts failed to compile:\n${res.stdout}\n${res.stderr}`);
  const require_ = createRequire(pathToFileURL(join(APP_ROOT, "package.json")));
  const mod = require_(join(OUT_DIR, "i18n.js"));
  const en = mod.translations?.en ?? mod.en;
  assert.ok(en, "compiled i18n exposes no en tree");
  return en;
}

function resolveKey(tree, key) {
  let node = tree;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object" || !(part in node)) return false;
    node = node[part];
  }
  return typeof node === "string";
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".expo",
  "dist",
  "static-build",
  "android",
  "ios",
  ".git",
  "tests",
]);

function sourceFiles() {
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(p);
      } else if (/\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
        files.push(p);
      }
    }
  })(APP_ROOT);
  return files;
}

// t("a.b"), plus the deferred-key props resolved through t() later.
const KEY_RE =
  /(?:\bt\(|\bi18nKey:\s*|\blabelKey:\s*|\bplaceholderKey:\s*|\btitleKey:\s*|\bsubtitleKey:\s*|\bhintKey:\s*|\bdescriptionKey:\s*)["']([a-zA-Z0-9_.]+)["']/g;

test("every i18n key used in the app resolves in the en tree", () => {
  const en = compileI18n();
  const missing = [];
  for (const f of sourceFiles()) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(KEY_RE)) {
      const k = m[1];
      if (!k.includes(".")) continue;
      if (!resolveKey(en, k)) missing.push(`${k}  (${f.replace(APP_ROOT, "")})`);
    }
  }
  assert.deepEqual(
    [...new Set(missing)],
    [],
    `missing i18n keys:\n${[...new Set(missing)].join("\n")}`,
  );
});
