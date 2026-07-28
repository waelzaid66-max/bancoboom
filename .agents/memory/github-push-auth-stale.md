---
name: GitHub push auth & clean handoff
description: Diagnosing gitPush PUSH_REJECTED, stale Replit↔GitHub tokens, and pushing a clean snapshot when history contains old secrets.
---

# GitHub push failures — diagnosis order & clean handoff pattern

**`gitPush` callback's `PUSH_REJECTED` hides the real GitHub error.** Diagnose with a
direct push to capture GitHub's actual message (safe, prompts disabled):
`GIT_TERMINAL_PROMPT=0 git push origin <branch>:refs/heads/main --verbose`

Observed causes, in likelihood order for this project:
1. **"Invalid username or token"** → the Replit↔GitHub connection token is stale/revoked,
   or the GitHub App install is per-repo and a NEWLY created repo isn't covered.
   Fix is USER-side only: reconnect GitHub in Replit, and/or
   github.com/settings/installations → Replit → Repository access → add the repo.
   No agent-side workaround; do NOT paste connector tokens into shell URLs (leaks to logs).
2. **Secret-scanning push protection** — BANCO history (204 commits) contains old
   rotated-but-real keys (sk_live_/sk_test_/re_ in commits 263ddac, da1e9eb, 6fce7a3,
   ce67dab, ce2d7a7 touching .replit). GitHub blocks ANY push containing those commits.

**Clean handoff pattern (no history rewrite, local main untouched):**
```
TREE=$(git rev-parse HEAD^{tree})
SNAP=$(git commit-tree "$TREE" -m "snapshot msg")
git branch -f bancoo-handoff "$SNAP"
git checkout bancoo-handoff   # instant, identical tree
# gitPush({branch:"main"})    # pushes CURRENT branch → remote main
git checkout main
```
`bancoo-handoff` branch = ready snapshot (2026-07-21) incl. release/banco_dev_dump_2026-07-21.sql.gz.

**Why:** user mandated the full project (incl. DB dump) land in the new public repo
waelzaid66-max/bancoo.git; rewriting main's history would break checkpoints and is
forbidden-risk; pushing old secrets (even rotated) to a public repo is a leak.

**How to apply:** any future push to a fresh external repo → verify remote reachable
(`git ls-remote`), push the snapshot branch, never force-push local main's history.
Warn the user before pushing DB dumps/PII to a PUBLIC repo.
