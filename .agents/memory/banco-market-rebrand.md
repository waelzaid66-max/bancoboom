---
name: BANCO Market rebrand (visible-only)
description: dealer-os web app's user-visible brand is "BANCO Market", but its package/dir/slug/URL identifiers stay "dealer-os" by deliberate decision.
---

Decision: the dealer-os web artifact's **user-visible** brand is "BANCO Market", while every **internal identifier** (package name, directory, slug, previewPath, `/dealer-os/` routes) deliberately stays "dealer-os".

**Why:** the rebrand was requested without breaking existing/shared links — old `/dealer-os/` URLs (incl. privacy/terms) must keep resolving. Brand name and stable slug were intentionally decoupled.

**How to apply:** never unify the two by renaming the slug/dir/URLs to match the brand — that breaks links. Visible copy = brand; identifiers = slug. Leftover "dealer" tokens in code are role/domain language (user role, dealer-role guard) or name fallbacks, not the product brand — leave them.
