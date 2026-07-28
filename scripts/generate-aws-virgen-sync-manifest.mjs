#!/usr/bin/env node
/**
 * Build release/AWS_VIRGEN_SYNC_MANIFEST.json — inventory for full aws-virgen sync.
 * Usage: node scripts/generate-aws-virgen-sync-manifest.mjs [--tag v1.0.0-rc.2]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const tagIdx = process.argv.indexOf("--tag");
const tag =
  tagIdx >= 0 && process.argv[tagIdx + 1]
    ? process.argv[tagIdx + 1]
    : process.argv.find((a) => /^v\d/.test(a)) ?? "v1.0.0-rc.2";

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return (r.stdout ?? "").trim();
}

function listFiles(dir, exts) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d, prefix = "") => {
    for (const name of fs.readdirSync(d, { withFileTypes: true })) {
      if (name.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${name.name}` : name.name;
      const full = path.join(d, name.name);
      if (name.isDirectory()) walk(full, rel);
      else if (!exts || exts.some((e) => name.name.endsWith(e))) out.push(rel);
    }
  };
  walk(dir);
  return out.sort();
}

const sha = git(["rev-parse", "HEAD"]);
const shortSha = git(["rev-parse", "--short", "HEAD"]);

const reportRoots = [
  { id: "production-readiness", path: "audit/production-readiness" },
  { id: "maintenance", path: "audit/maintenance" },
  { id: "aws-deploy-reports", path: "deploy/aws/reports" },
  { id: "repo-reports", path: "reports" },
  { id: "release", path: "release" },
  { id: "docs", path: "docs" },
];

const inventories = {};
for (const { id, path: rel } of reportRoots) {
  inventories[id] = listFiles(path.join(ROOT, rel), [".md", ".json", ".yaml", ".yml", ".sh", ".mjs"]);
}

const manifest = {
  schema: "banco-aws-virgen-sync/1",
  generatedAt: new Date().toISOString(),
  releaseTag: tag,
  primaryRepository: "waelzaid66-max/-BANCO-CA-OOM-",
  awsVirgenRepository: "waelzaid66-max/aws-virgen",
  commit: {
    full: sha,
    short: shortSha,
    subject: git(["log", "-1", "--format=%s"]),
  },
  syncPolicy: "merge primary main into aws-virgen main (full tree, history preserved)",
  ci: {
    workflow: ".github/workflows/ci.yml",
    deployWorkflow: ".github/workflows/deploy.yml",
    note: "Run CI on primary before sync; aws-virgen inherits same tree after merge.",
  },
  verificationScripts: [
    "scripts/production-confidence-check.mjs",
    "scripts/verify-gcp-docker-build-config.mjs",
    "scripts/verify-upload-claims-schema.mjs",
    "scripts/staging-p0-smoke.mjs",
  ],
  publishScript: "scripts/publish-aws-virgen-rc.sh",
  inventories,
  opsBlockers: [
    "STAGING: BANCO_API_URL + CLERK_BEARER_TOKEN for staging-p0-smoke",
    "AWS: AWS_ROLE_ARN, ECR, SSM, EC2_INSTANCE_ID",
    "EAS: signing + device QA",
  ],
};

const outPath = path.join(ROOT, "release", "AWS_VIRGEN_SYNC_MANIFEST.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(ROOT, outPath)} (${sha})`);
