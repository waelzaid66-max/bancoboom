---
name: BANCO media upload content-type & size truth
description: What actually controls stored media type/size in the upload flow — and what is silently ignored.
---

# BANCO media upload: what actually matters

The upload request handler (`requestUploadUrl`) **ignores the client-sent
`filename`, `content_type`, and `size`**. It mints an **extensionless UUID
object key** (`.../uploads/<uuid>`) and a presigned PUT not bound to a
content-type.

**Therefore:**
- The **PUT `Content-Type` header** (client, lib/upload.ts) is the ONLY thing
  that sets the stored object's content-type, which `serveObjectHandler` reads
  back and validates against its allowlist. Get it wrong and the object serves
  as the wrong type (HEIC/PNG/WebP shown as jpeg → display glitch).
- The filename/extension is cosmetic for storage (key has no extension); derive
  it correctly anyway for correctness, but don't expect it to change storage.
- **`size` AND the client-declared media kind are untrusted** — the presigned
  PUT cannot cap upload size, and a client can mislabel an oversized video as an
  image. The only authoritative gate reads the **stored object metadata**
  (content-type + size, via `file.getMetadata()`) server-side at listing-create
  time, derives the media kind from the stored content-type (NOT the client's
  declared type), and rejects oversize videos before promoting media to public.

**Why:** these three facts span three files (mobile upload, api upload
controller, object storage) and are not obvious from any single one; assuming
the server honors the sent metadata leads to mislabeled media and a uselessly
client-only size check.

**How to apply:** for any new upload surface, set the right PUT Content-Type
(map mimeType → source extension → media kind, never blind-default to jpeg);
enforce size/limits server-side from stored metadata, never from client-sent
size.
