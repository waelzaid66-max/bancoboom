---
name: Empty DB looks like a broken app (facet-gated UI)
description: After a fresh/migrated environment the BANCO DB is empty and the facet-gated UI collapses to blank — looks broken but is just missing data; fix is the manual seed.
---

# An empty database makes BANCO look totally broken (but the code is fine)

BANCO has **no startup seed** — nothing populates the DB on boot. A freshly
created or freshly migrated environment connects to an EMPTY database, and the
app's "honest by design" facet gating then hides almost the entire UI:

- Search category strips (`visibleCategories`) collapse to only "All".
- Engine/type chip rows (`visibleEngines`) hide entirely (<=1 entry rule).
- "Browse by section" / brands / trending render nothing.
- The whole search screen reads as a blank white page; the feed is empty.

To a non-technical user this looks like "search is dead / every service is
broken." It is NOT a code regression — every endpoint returns HTTP 200, just
with zero rows.

**Why:** the UI deliberately never surfaces a filter that would yield zero
results, so with zero inventory the gating correctly hides everything.

**How to diagnose:** `curl localhost:8080/api/v1/search/facets` — if
`total:0` and every facet map is `{}`, the DB is empty. Confirm with the data
audit (COUNT on listings/users = 0).

**How to fix:** run the manual seed — `pnpm --filter @workspace/api-server run
seed` (also `seed:admin` for an admin user). It seeds master data
(brands/models/locations/plans), ~52-58 demo listings across all categories,
users, wallets, leads, etc. After seeding, facets show `total>0`, the strips
reappear automatically (no code change), and the search page renders fully.

**Gotcha:** all 6 artifact workflows can be NOT_STARTED at the same time
(environment idle/restart); `restart_workflow` each one. Seed data lives in the
DB and survives workflow restarts.
