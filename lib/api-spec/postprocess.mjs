import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// orval 8.9.x wraps every non-form request body in `JSON.stringify(...)` in the
// fetch client — including bodies declared as `format: binary`. For the CSV bulk
// import (Content-Type: text/csv, body is a raw Blob) this turns the upload into
// the literal string "{}", so the server's csv-parser rejects every import.
// This post-codegen pass restores the raw passthrough for binary Blob bodies.
// Keep this in lockstep with codegen: any new binary (Blob) request body must be
// matched here, or its upload will be silently corrupted.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiFile = path.resolve(
  __dirname,
  "..",
  "api-client-react",
  "src",
  "generated",
  "api.ts",
);

let src = fs.readFileSync(apiFile, "utf8");
const before = src;

// Match `body: JSON.stringify( <name>Body ,? )` for any operation whose body
// parameter is a Blob, and replace it with the raw `body: <name>Body`.
// We anchor on the `Blob` parameter type so JSON bodies are never touched.
const blobBodyParams = new Set();
for (const m of src.matchAll(/(\w+Body):\s*Blob\b/g)) {
  blobBodyParams.add(m[1]);
}

for (const param of blobBodyParams) {
  const re = new RegExp(
    `body:\\s*JSON\\.stringify\\(\\s*${param}\\s*,?\\s*\\)`,
    "g",
  );
  src = src.replace(re, `body: ${param}`);
}

if (src !== before) {
  fs.writeFileSync(apiFile, src);
  console.log(
    `[postprocess] restored raw Blob body for: ${[...blobBodyParams].join(", ")}`,
  );
} else if (blobBodyParams.size > 0) {
  console.log(
    "[postprocess] binary Blob bodies already raw (no JSON.stringify wrap found)",
  );
}
