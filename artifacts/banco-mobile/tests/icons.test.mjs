// Regression guard for the Android app-wide ".notdef"/tofu (□ / X) icon bug.
//
// Zero-dependency (node:test). Run with:
//   pnpm --filter @workspace/banco-mobile run test:icons
//
// The PERMANENT fix was to drop icon FONTS entirely and render icons as SVG
// (lucide-react-native) — there is no font to register and therefore no glyph
// map / TTF mismatch that produced the box glyphs. These tests lock that in:
//   1. The app-owned registry renders SVGs (lucide), never createIconSet/fonts.
//   2. The three set exports (Feather/Ionicons/MaterialCommunityIcons) still
//      exist, so call sites are unchanged.
//   3. No source file imports icon components from "@expo/vector-icons", and the
//      registry itself only references it as a TYPE (no runtime import).
//   4. The root layout no longer preloads icon fonts.
//   5. Every icon name used in the app is actually mapped in the registry
//      (catches typo'd / unmapped names that would render the fallback glyph).
//
// @expo/vector-icons is kept ONLY as a dev dependency: its glyph maps are the
// authoritative list of REAL icon names, used here to tell an icon-name string
// literal apart from an unrelated discriminator string (e.g. "islamic", "chat").

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.dirname(__dirname); // artifacts/banco-mobile
const ICONS_MODULE = path.join(APP_ROOT, "components", "icons.tsx");
const ROOT_LAYOUT = path.join(APP_ROOT, "app", "_layout.tsx");

// ---- authoritative list of REAL @expo/vector-icons names ---------------------
function loadGlyphMaps() {
  const pkgDir = path.dirname(
    require.resolve("@expo/vector-icons/package.json"),
  );
  const glyphDir = path.join(
    pkgDir,
    "build/vendor/react-native-vector-icons/glyphmaps",
  );
  const file = {
    Feather: "Feather.json",
    Ionicons: "Ionicons.json",
    MaterialCommunityIcons: "MaterialCommunityIcons.json",
  };
  const names = new Set();
  for (const name of Object.values(file)) {
    const map = JSON.parse(fs.readFileSync(path.join(glyphDir, name), "utf8"));
    for (const key of Object.keys(map)) names.add(key);
  }
  return names;
}

// ---- collect source files ----------------------------------------------------
function sourceFiles() {
  const out = [];
  for (const sub of ["app", "components", "context", "hooks", "lib"]) {
    const dir = path.join(APP_ROOT, sub);
    if (!fs.existsSync(dir)) continue;
    for (const rel of fs.readdirSync(dir, { recursive: true })) {
      const relStr = String(rel);
      if (!/\.(ts|tsx)$/.test(relStr)) continue;
      if (relStr.includes("node_modules")) continue;
      out.push(path.join(dir, relStr));
    }
  }
  return out;
}

const validGlyphNames = loadGlyphMaps();
const files = sourceFiles();
const iconsSrc = fs.readFileSync(ICONS_MODULE, "utf8");

test("registry renders SVGs (lucide-react-native), not icon fonts", () => {
  assert.match(
    iconsSrc,
    /from\s+["']lucide-react-native["']/,
    "components/icons.tsx must import from lucide-react-native (SVG icons)",
  );
  assert.ok(
    !/createIconSet/.test(iconsSrc),
    "components/icons.tsx must NOT use createIconSet — that reintroduces icon fonts (the root cause of the Android tofu bug)",
  );
  assert.ok(
    !/banco-(feather|ionicons|mci)/.test(iconsSrc),
    "components/icons.tsx must NOT register banco-* icon-font families (fonts are gone)",
  );
});

test("registry has no RUNTIME dependency on @expo/vector-icons", () => {
  // The only allowed reference is a TYPE-ONLY `typeof import("@expo/vector-icons")`
  // (erased at build) so call-site name typing keeps working.
  assert.ok(
    !/from\s+["']@expo\/vector-icons["']/.test(iconsSrc),
    "components/icons.tsx must not runtime-import from @expo/vector-icons",
  );
  assert.ok(
    !/require\(\s*["']@expo\/vector-icons["']\s*\)/.test(iconsSrc),
    "components/icons.tsx must not require('@expo/vector-icons')",
  );
});

test("the three set exports still exist (call sites unchanged)", () => {
  for (const name of ["Feather", "Ionicons", "MaterialCommunityIcons"]) {
    assert.match(
      iconsSrc,
      new RegExp(`export const ${name}\\b`),
      `components/icons.tsx must export ${name}`,
    );
  }
});

test("no source file imports icon components from @expo/vector-icons", () => {
  const offenders = [];
  for (const file of files) {
    if (path.resolve(file) === path.resolve(ICONS_MODULE)) continue;
    if (
      /from\s+["']@expo\/vector-icons["']/.test(fs.readFileSync(file, "utf8"))
    ) {
      offenders.push(path.relative(APP_ROOT, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `These files must import from "@/components/icons", not "@expo/vector-icons": ${offenders.join(", ")}`,
  );
});

test("root layout no longer preloads icon fonts", () => {
  const layout = fs.readFileSync(ROOT_LAYOUT, "utf8");
  assert.ok(
    !/bancoIconFonts/.test(layout),
    "_layout.tsx must not reference bancoIconFonts — icons are SVG, no font preload needed",
  );
});

test("every icon name used in the app is mapped in the registry", () => {
  // Capture string literals that sit in a genuine icon-NAME position only. We
  // deliberately scan tight positions (icon-component JSX, the tab-bar helper,
  // `icon:` config, CategoryIcon's `{lib,name}` config, and the bodies of
  // helpers whose RETURN TYPE is an icon name) rather than every `name=`/
  // `name:`/return — so route names ("notifications"), keyboard/date values
  // ("numeric") and media-type ternaries ("video") are never captured.
  // `validGlyphNames` is a final safety net that drops any residual non-icon
  // string, leaving only real icon names that were forgotten in the registry.
  const candidates = new Set();
  const add = (v) => {
    if (v) candidates.add(v);
  };
  // Given an index just AFTER an opening `{`, return the function body up to the
  // matching `}` (brace-depth walk). Used to scope return-literal scanning to a
  // single helper function.
  const bodyAfterBrace = (src, start) => {
    let depth = 1;
    let i = start;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
    }
    return src.slice(start, i);
  };
  // For a `name={ ... }` expression, add ONLY the icon literals: a bare single
  // literal, or the branches of a ternary (the strings after `?` / `:`). This
  // deliberately skips condition literals like `type === "business" ? ... : ...`
  // so the discriminator ("business") is not mistaken for an icon name.
  const iconLiteralsIn = (expr) => {
    const single = expr.match(/^\s*["']([^"']+)["']\s*$/);
    if (single) {
      add(single[1]);
      return;
    }
    for (const m of expr.matchAll(/[?:]\s*["']([^"']+)["']/g)) add(m[1]);
  };

  for (const file of files) {
    if (path.resolve(file) === path.resolve(ICONS_MODULE)) continue;
    const src = fs.readFileSync(file, "utf8");

    // 1. Direct icon-component JSX. The name value is a string ("x" / 'x') or a
    //    `{ expr }` (e.g. a ternary `saved ? "heart" : "heart-outline"`); for
    //    the brace form we pull every string literal out of the expression.
    for (const m of src.matchAll(
      /<(?:Feather|Ionicons|MaterialCommunityIcons)\b[^>]*?\bname=(?:"([^"]+)"|'([^']+)'|\{([^}]*)\})/g,
    )) {
      add(m[1]);
      add(m[2]);
      if (m[3]) iconLiteralsIn(m[3]);
    }

    // 2. Bottom tab bar helper:  renderTabIcon("home")
    for (const m of src.matchAll(/renderTabIcon\(\s*["']([^"']+)["']/g))
      add(m[1]);

    // 3. Data-driven config objects:  { icon: "x" }
    for (const m of src.matchAll(/\bicon:\s*["']([^"']+)["']/g)) add(m[1]);

    // 4. CategoryIcon config:  { lib: "mci", name: "cog" }  (either field order)
    for (const m of src.matchAll(
      /\blib:\s*["'][^"']+["']\s*,\s*name:\s*["']([^"']+)["']/g,
    ))
      add(m[1]);
    for (const m of src.matchAll(
      /\bname:\s*["']([^"']+)["']\s*,\s*lib:\s*["']/g,
    ))
      add(m[1]);

    // 5b. Icon-CONFIG object literals whose icon name sits in a `name:` field,
    //    e.g. notifications' `type IconConfig = { name: keyof typeof
    //    Feather.glyphMap; color; bg }` returned by iconForType(). Rule 5 cannot
    //    see these because the function's return type is the ALIAS, not the
    //    glyphMap expression. Proven gap: an unmapped name added here used to
    //    pass the guard and would then render blank in the native Android/iOS
    //    build. The adjacent `color:` (either order) keeps this scoped to real
    //    icon configs, and validGlyphNames still filters the result.
    for (const m of src.matchAll(/\bname:\s*["']([^"']+)["']\s*,\s*color\s*:/g))
      add(m[1]);
    for (const m of src.matchAll(
      /\bcolor\s*:[^,{}]{1,60},\s*name:\s*["']([^"']+)["']/g,
    ))
      add(m[1]);

    // 5. Helpers whose RETURN TYPE is an icon name (e.g. socialIcon/planIcon:
    //    `): ComponentProps<typeof Ionicons>["name"]` or `): keyof typeof
    //    MaterialCommunityIcons.glyphMap`). Scope the return-literal scan to
    //    that one function body so unrelated returns are never captured. The
    //    `):` prefix + trailing `{` keep this from matching interface fields.
    const sigRe =
      /\):\s*(?:React\.)?ComponentProps<typeof (?:Feather|Ionicons|MaterialCommunityIcons)>\["name"\]\s*(?:=>\s*)?\{|\):\s*keyof typeof (?:Feather|Ionicons|MaterialCommunityIcons)\.glyphMap\s*(?:=>\s*)?\{/g;
    for (const m of src.matchAll(sigRe)) {
      const body = bodyAfterBrace(src, m.index + m[0].length);
      for (const r of body.matchAll(/\breturn\s+["']([^"']+)["']/g)) add(r[1]);
    }
  }

  const used = [...candidates].filter((n) => validGlyphNames.has(n));
  const missing = used.filter((n) => !iconsSrc.includes(`"${n}"`)).sort();

  assert.deepEqual(
    missing,
    [],
    `These icon names are used in the app but NOT mapped in components/icons.tsx ` +
      `(they would render the fallback glyph):\n${missing.join("\n")}`,
  );
});
