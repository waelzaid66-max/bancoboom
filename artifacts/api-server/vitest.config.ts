import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Production and CI run in UTC. Pin the test process to UTC too so the
    // recency keyset (a `timestamp without time zone` column round-tripped
    // through node-postgres) compares identically on any developer machine —
    // a non-UTC local timezone otherwise breaks tie-boundary equality and
    // makes newest-sort pagination assertions fail locally only.
    env: { TZ: "UTC" },
    // DB-integration suites share the same Postgres tables and module-level
    // durable counters; never interleave them across files.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Workspace packages export raw .ts (see lib/db/package.json "exports").
    // Inline them so vitest transforms the TypeScript instead of trying to
    // require the source through Node.
    server: { deps: { inline: [/@workspace\//] } },
  },
});
