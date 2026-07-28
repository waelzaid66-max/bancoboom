---
name: Orval text/csv codegen quirk
description: Why bulkImportListings CSV uploads break after api-client regeneration and how it's mitigated
---

Orval generates `body: JSON.stringify(bulkImportListingsBody)` for the
`text/csv` (format: binary) request body on `bulkImportListings`. JSON-stringifying
a Blob corrupts the CSV payload, breaking dealer bulk import.

**Why:** Orval treats the `type: string` schema as JSON-serializable regardless of
the `text/csv` content type. There is no per-operation "raw body" override in the
orval config, and `clean: true` wipes any manual patch on every regeneration.

**How to apply:** Do NOT hand-edit `lib/api-client-react/src/generated/api.ts` to
fix this — it gets clobbered. The fix lives in `lib/api-spec/postprocess.mjs`, run
automatically by the `@workspace/api-spec` `codegen` script after orval. It detects
every `<name>Body: Blob` parameter and strips the `JSON.stringify` wrap generically,
so new binary upload endpoints are handled automatically.
