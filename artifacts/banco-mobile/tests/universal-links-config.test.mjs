import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_CONFIG = path.join(APP_ROOT, "app.config.ts");

test("app.config.ts wires Universal/App Links from env (not hardcoded)", () => {
  const src = fs.readFileSync(APP_CONFIG, "utf8");
  assert.match(src, /webAppLinkHost/);
  assert.match(src, /associatedDomains/);
  assert.match(src, /intentFilters/);
  assert.match(src, /EXPO_PUBLIC_ROUTER_ORIGIN/);
  assert.doesNotMatch(src, /applinks:banco\./i);
});

test("custom scheme bancooom remains in app.json", () => {
  const json = JSON.parse(fs.readFileSync(path.join(APP_ROOT, "app.json"), "utf8"));
  assert.equal(json.expo.scheme, "bancooom");
});

test("EAS production can ship a SECOND build to both stores", () => {
  const eas = JSON.parse(
    fs.readFileSync(path.join(APP_ROOT, "eas.json"), "utf8"),
  );
  const prod = eas.build?.production;
  assert.ok(prod, "an EAS production profile must exist");

  // Both stores reject an upload whose build identifier is already taken. iOS was
  // already covered; Android was not, so every production build carried
  // versionCode 1 and the FIRST release would have succeeded while the second was
  // rejected — a failure that only appears on the update, after launch, when it
  // is most expensive.
  assert.equal(
    prod.android?.autoIncrement,
    true,
    "Android versionCode must auto-increment or Play refuses the second upload",
  );
  assert.equal(
    prod.ios?.autoIncrement,
    true,
    "iOS buildNumber must auto-increment or App Store Connect refuses the second upload",
  );
  assert.equal(
    prod.android?.buildType,
    "app-bundle",
    "Play requires an .aab, not an .apk, for production releases",
  );
  // autoIncrement only has somewhere to write when versions are owned locally.
  assert.equal(
    eas.cli?.appVersionSource,
    "local",
    "appVersionSource must be local for autoIncrement to update app.json",
  );
});
