---
name: post-merge drizzle push must be non-interactive
description: Why task-agent merges that add DB columns can silently fail to apply on the shared main DB, and the fix.
---

# Post-merge drizzle push must be non-interactive

When a task agent merges a schema change that adds/alters a column, the shared
main DB is only reconciled by the post-merge script (`scripts/post-merge.sh`).
If that script runs plain `drizzle-kit push` (`pnpm --filter db push`), push can
hit an **interactive** prompt (e.g. the "truncate table / data-loss" confirmation
for generated or NOT NULL columns). The post-merge runner has **no TTY**, so the
prompt never resolves → the migration aborts → the column is never applied to the
main DB. Every query touching that table then crashes at runtime with
`column "<x>" does not exist`, taking down api-server and the test suite, even
though the schema/code looks correct in git.

**Rule:** post-merge schema reconciliation must use the non-interactive variant
`pnpm --filter db push-force` (drizzle `push --force`), never bare `push`.

**Why:** the failure is invisible — git diff looks merged and correct, code
references the column, but the shared DB silently lacks it because an interactive
prompt was swallowed. Symptom is a table-wide runtime crash, not a build error.

## Timeout vs. hang: two different failure modes
A post-merge timeout does NOT always mean an interactive-prompt hang. If the
script is ALREADY on `push-force` (non-interactive) and still times out, it's a
slow-migration cost, not a bug: `drizzle-kit push` first does a full
"Pulling schema from database" introspection (~30-45s here on its own) and then
applies the diff. A large merge (new enum + column backfill on `users` + new FK
table + dropped tables) on top of introspection can exceed the default 180s.

**Diagnose before "fixing":** reproduce with `pnpm --filter db push-force </dev/null`
(stdin closed = same as the runner). If it completes EXIT 0 with no prompt, the
script is fine — the failure was purely time. Fix = raise the post-merge timeout
via `setPostMergeConfig({ timeoutMs })` (set to 600000), NOT a script change.
Once applied, a re-run is a fast no-op (~4-5s) because the diff is already live.

**How to apply:**
- Keep `scripts/post-merge.sh` on `push-force` (see `post_merge_setup` skill).
- If a merge's post-merge TIMES OUT but the script is non-interactive, raise the
  timeout (don't touch the script) and re-run `runPostMergeSetup()` to confirm.
- If you see `column ... does not exist` on main right after a merge, the column
  exists in schema/code but not the DB. Apply it directly with `executeSql`
  (`ALTER TABLE ... ADD COLUMN ...` + any UNIQUE constraint) to recover fast, then
  confirm the post-merge script is on `push-force` so it can't recur.
- Generated columns must be added with their full `GENERATED ALWAYS AS (...) STORED`
  expression so existing rows backfill automatically.
