---
name: BANCO root landing artifact
description: What the landing page is, what changed, and what must stay
---

There is a standalone react-vite artifact `landing` (pkg `@workspace/landing`, dir `artifacts/landing`) mounted at the root path `/`.

**What it does now:** Professional dark entry page with:
- BANCO logo, glowing hero, gradient title
- Nav bar (التطبيق / ماركت / إدارة) with scroll-blur
- Two hero CTAs: "ادخل التطبيق" → /banco-mobile/ (red) and "بانكو ماركت" → /dealer-os/ (outline)
- "لوحة التحكم" subtle admin link → /admin-os/
- 6-tile sections grid (features)
- Three entry cards (app/market/admin) with direct path links
- Footer with domain names

**Why direct paths, not env vars:** The VITE_MARKET_URL/VITE_ADMIN_URL env vars are not set in any environment — always show قريباً. Paths (/banco-mobile/, /dealer-os/, /admin-os/) are stable across all envs (production routing maps them in artifact.toml equivalent).

**Production routing (from deployment logs):**
- `/` → artifacts/landing/dist/public (static)
- `/dealer-os/` → artifacts/dealer-os/dist/public (static)
- `/admin-os/` → artifacts/admin-os/dist/public (static)
- `/banco-mobile/` → mobile app (runnable, port 23351)
- `/api/` → api-server (runnable, port 8080)

**How to apply:** Any change to landing must also rebuild `dist/public` with `BASE_PATH=/ pnpm run build` inside the landing artifact before committing, so the static build matches the source.

**Why it exists:** root path `/` was previously a 404 in production. Landing claims `/` to fix that.
