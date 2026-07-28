#!/bin/bash
set -e
pnpm install --no-frozen-lockfile

# Before pushing the schema, collapse any pre-existing duplicate saves so the new
# UNIQUE(user_id, listing_id) index on saved_listings can be created. Keeps the
# lowest id per (user, listing). Idempotent: a no-op on an already-clean table.
# Guarded so a missing DATABASE_URL/psql never breaks the merge setup.
if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DELETE FROM saved_listings a
USING saved_listings b
WHERE a.user_id = b.user_id
  AND a.listing_id = b.listing_id
  AND a.id > b.id;
SQL
fi

pnpm --filter db push-force

# After the schema (incl. saves_count) exists, reconcile the denormalized
# counter to the true number of saves so the resurface ranking signal is honest
# from day one. Idempotent: only rewrites rows whose cached count is wrong.
if [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE listings l
SET saves_count = COALESCE(c.cnt, 0)
FROM (
  -- LEFT JOIN so EVERY listing is reconciled, including ones whose real save
  -- count is now 0 but whose cached counter was left inflated by the old
  -- (pre-unique-index) toggle. Without this they would never reset to 0.
  SELECT l2.id, COUNT(s.id)::int AS cnt
  FROM listings l2
  LEFT JOIN saved_listings s ON s.listing_id = l2.id
  GROUP BY l2.id
) c
WHERE l.id = c.id
  AND l.saves_count <> COALESCE(c.cnt, 0);
SQL
fi
