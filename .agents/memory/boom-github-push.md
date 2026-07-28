---
name: B-OOM import GitHub branch protection
description: When importing B-OOM via hard-reset, force push to origin/main is rejected; use feature branch instead.
---

## Rule
Hard-resetting to boom/main diverges history from origin/main. GitHub branch protection rejects force pushes to main.

**Why:** The `-BANCO-CA-OOM-` repo has branch protection rules on `main` that block force pushes.

**How to apply:**
- Push to a feature branch: `git push origin main:import/boom-vX.Y.Z`
- Then create a PR or ask the user to merge/disable protection
- Replit production deploy does NOT need GitHub push — deploy from local code via Replit's deploy system
- `gitPush({ branch: "main", force: true, provider: "github" })` returns PUSH_REJECTED in this scenario
