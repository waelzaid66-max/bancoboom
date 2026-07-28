---
name: BANCO listing create/manage role asymmetry
description: Why individual (non-dealer) sellers can publish a listing but cannot view "my listings" — and where this must be respected in mobile navigation.
---

# BANCO listing create vs. manage role asymmetry

Creating a listing and managing existing listings sit behind **different auth gates**:

- Creating a listing requires only an authenticated user (`requireAuth`).
- Listing a user's own listings ("my listings") requires a **dealer/company/enterprise** role (`requireDealerRole`). An individual signed-in user gets a "Seller account required" restricted screen there.

**Consequence:** an individual seller CAN publish a listing but has **no first-party way to view, edit, or delete it afterward** (only direct access via the created listing's detail page).

**Why:** there is no backend "list my listings" endpoint scoped to individual (non-dealer) users — only the dealer-scoped one exists. This is a real backend gap, not a bug to paper over.

**How to apply:**
- Never route a non-dealer to the dealer-gated "my listings" screen as a default/safe destination (e.g. after creating a listing). Route everyone to the feed instead, and surface the just-created listing via its detail page.
- If/when individual-seller listing management is needed, it requires a new backend endpoint — treat as backend-blocked, report it, do not fake it.
