/**
 * Drift guard for the DUPLICATED staff-permission policy.
 *
 * The matrix lives twice by design: the server (`./permissions.ts`) enforces it,
 * and admin-os (`artifacts/admin-os/src/lib/permissions.ts`) mirrors it to decide
 * what the Control Center UI shows. Both files carry a "keep the two in sync"
 * comment, but nothing enforced it — so a one-sided edit could silently drift,
 * leaving admins with buttons the server 403s (or hidden actions they do hold).
 *
 * This test parses BOTH files and asserts the policy is identical. It reads the
 * client file as TEXT rather than importing it, because admin-os is a separate
 * package with its own tsconfig/bundler and must not become a runtime dependency
 * of the API.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_FILE = path.join(HERE, "permissions.ts");
const CLIENT_FILE = path.join(
  HERE,
  "..",
  "..",
  "..",
  "admin-os",
  "src",
  "lib",
  "permissions.ts",
);

/** Extract the string literals of a `export const NAME = [ ... ] as const;` block. */
function extractList(src: string, name: string): string[] {
  const block = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(src);
  if (!block) throw new Error(`${name} array not found`);
  return [...block[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

/**
 * Extract the role → permissions map from the `MATRIX` object literal.
 * `owner: [...PERMISSIONS]` is resolved to the full permission list.
 */
function extractMatrix(
  src: string,
  allPermissions: string[],
): Record<string, string[]> {
  const block = /MATRIX\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (!block) throw new Error("MATRIX object not found");
  const out: Record<string, string[]> = {};
  for (const m of block[1].matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]/g)) {
    const role = m[1];
    const body = m[2];
    out[role] = body.includes("...PERMISSIONS")
      ? [...allPermissions]
      : [...body.matchAll(/"([a-z_]+)"/g)].map((p) => p[1]);
  }
  return out;
}

function parsePolicy(file: string) {
  const src = fs.readFileSync(file, "utf8");
  const roles = extractList(src, "STAFF_ROLES");
  const permissions = extractList(src, "PERMISSIONS");
  return { roles, permissions, matrix: extractMatrix(src, permissions) };
}

describe("admin permission policy stays mirrored (server ↔ admin-os)", () => {
  const server = parsePolicy(SERVER_FILE);
  const client = parsePolicy(CLIENT_FILE);

  it("both files were parsed with real content", () => {
    expect(server.permissions.length).toBeGreaterThan(0);
    expect(server.roles.length).toBeGreaterThan(0);
    expect(Object.keys(server.matrix).length).toBe(server.roles.length);
    expect(Object.keys(client.matrix).length).toBe(client.roles.length);
  });

  it("staff roles are identical", () => {
    expect(client.roles).toEqual(server.roles);
  });

  it("permission list is identical", () => {
    expect(client.permissions).toEqual(server.permissions);
  });

  it("every role grants exactly the same permissions on both sides", () => {
    for (const role of server.roles) {
      expect(
        [...(client.matrix[role] ?? [])].sort(),
        `admin-os drifted from the server for role "${role}"`,
      ).toEqual([...(server.matrix[role] ?? [])].sort());
    }
  });

  it("owner holds every permission (no permission is unreachable)", () => {
    expect([...server.matrix.owner].sort()).toEqual(
      [...server.permissions].sort(),
    );
  });
});
