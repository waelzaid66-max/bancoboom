/**
 * Static guard: demo seed must refuse production without escape hatch.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedSrc = readFileSync(join(root, "src/seed.ts"), "utf8");

describe("demo seed production guard", () => {
  it("defines assertDemoSeedAllowed and calls it from seed()", () => {
    assert.match(seedSrc, /function assertDemoSeedAllowed\s*\(/);
    assert.match(seedSrc, /assertDemoSeedAllowed\s*\(\s*\)/);
    assert.match(seedSrc, /BANCO_ALLOW_DEMO_SEED/);
    assert.match(seedSrc, /Refusing demo seed in production/);
  });

  it("blocks NODE_ENV=production and BANCO_ENV/APP_ENV production|prod", () => {
    assert.match(seedSrc, /nodeEnv === "production"/);
    assert.match(seedSrc, /bancoEnv === "production"/);
    assert.match(seedSrc, /bancoEnv === "prod"/);
  });
});
