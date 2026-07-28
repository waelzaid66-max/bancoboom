---
name: BANCO codegen & API contract
description: Gotchas for the OpenAPI→client codegen pipeline and the locked API response contract (binary request bodies, DB-vs-contract status-enum drift)
---

# BANCO codegen & API contract

## orval JSON.stringify's binary (Blob) request bodies — postprocess restores raw
**Rule:** orval 8.9.x emits `body: JSON.stringify(xBody)` for EVERY non-form request body in the fetch client, including ones declared `format: binary`. For a Blob upload (e.g. the dealer CSV bulk import, `Content-Type: text/csv`) this serializes the Blob to the literal `"{}"`, so the server rejects every upload. A post-codegen pass (`lib/api-spec/postprocess.mjs`, wired into the `codegen` script) rewrites `JSON.stringify(<Blob>Body)` back to raw `<Blob>Body`.
**Why:** Re-running codegen (e.g. to add a new endpoint) silently regressed the working CSV import. Typecheck can't catch it — the types are identical — and no curl test exercised it. The fix must live in the codegen pipeline, not as a hand-edit, because orval's `clean: true` wipes the generated folder on every run.
**How to apply:** New binary/Blob request bodies are auto-handled — postprocess keys off the `: Blob` param type, not a hardcoded name. After any codegen, confirm the `[postprocess] restored raw Blob body for: …` log lists the expected params; never hand-patch generated files. Don't "fix" this by switching the spec to `application/octet-stream`: the server requires `text/csv` via `express.text({ type: "text/csv" })`.

## api-server validates against a hand-maintained zod layer, NOT the generated codegen types
**Rule:** Adding a field to `openapi.yaml` + running codegen updates the generated client types (`lib/api-client-react`, `lib/api-zod`) but does NOT touch the api-server's own `artifacts/api-server/src/validators/schemas.ts` — that file is a separate, hand-written zod source (`.strict()` objects) that the server imports for `CompanyProfile`, `FeedItem`, etc. To add a contract field end-to-end you must edit BOTH: the openapi schema AND the matching zod schema in validators/schemas.ts.
**Why:** Exposing a real `is_verified` on `CompanyStats` passed codegen + libs typecheck but failed api-server typecheck with `TS2353: 'is_verified' does not exist in type {…}` — because `getSellerStats` returns `CompanyProfile["stats"]` resolved from the strict hand-written `CompanyStatsSchema`, not the generated type. The `.strict()` makes the omission a hard error, not a silent pass.
**How to apply:** Any additive contract field touches three places in lockstep: (1) `lib/api-spec/openapi.yaml`, (2) `artifacts/api-server/src/validators/schemas.ts` zod schema, (3) re-run codegen. Then typecheck api-server AND the consuming artifact (banco-mobile) separately — libs typecheck alone won't surface the server gap.

## DB status enum may exceed the API contract enum — keep response validation in mind
**Rule:** `listingStatusEnum` in the DB includes `draft` and `pending_approval`, but the API contract (`ListingDetailSchema` + openapi) intentionally allows only `active|sold|archived`. Safe ONLY while no listing actually holds a draft/pending status.
**Why:** Response validation enforces the contract enum; if a listing ever enters draft/pending_approval and is returned through a validated endpoint, `validateResponse` would 500. The DB enum was widened additively ahead of the feature that will consume it, deliberately leaving the contract frozen.
**How to apply:** Before shipping any flow that sets a listing to draft/pending_approval, widen the contract status enum (openapi + ListingDetailSchema) in lockstep and re-run codegen.
