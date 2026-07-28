# FROZEN — do not extend

`artifacts/banco-web` is **frozen**.

It was the wrong place to build the website: it grew as a full picture / copy of
the mobile app instead of an independent web project.

## Where website work goes now

→ **`artifacts/banco-website`** (`@workspace/banco-website`)

## What you may still do here
- Emergency hotfixes on already-deployed `banco-web` surfaces until cutover.
- Read-only reference while migrating deploy scripts.

## What you must not do
- Add new website features / phases here.
- Treat this package as the product website.
- Pull mobile UI patterns into this tree as the “website.”

See `artifacts/banco-website/README.md`.
