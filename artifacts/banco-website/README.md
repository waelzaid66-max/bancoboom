# BANCO Website — independent project

**This is the website project.** It is **not** the mobile app and must never be
treated as a visual/structural copy of `artifacts/banco-mobile`.

## Charter (non-negotiable)

| Surface | Path | Role |
|---------|------|------|
| **Mobile** | `artifacts/banco-mobile` | Expo app — section mini-apps, native UX |
| **Website** | `artifacts/banco-website` | Next.js consumer web — **this package** |
| ~~banco-web~~ | `artifacts/banco-web` | **FROZEN** — historical mobile-mirror artifact; do not extend |

### Rules
1. **New website features land here only** (`banco-website`).
2. **Never edit mobile** to “make the website look like the app shell.”
3. **Never import** from `banco-mobile`, `dealer-os`, or `admin-os`.
4. Shared contracts only via `lib/*` (`api-client-react`, `search-contract`, `taxonomy`, `design-tokens`).
5. Mobile section separation (`/section/*` mini-apps) is a mobile concern — not mirrored as a fake mobile UI on web.

## Origin of this package
Seeded as a full copy of the previous website work that incorrectly lived under
`artifacts/banco-web` (built as if it were a full picture of the mobile app).
That approach is rejected. This package is the **remote / independent** website
home going forward.

## Dev

```bash
pnpm --filter @workspace/banco-website run dev
pnpm --filter @workspace/banco-website run typecheck
pnpm --filter @workspace/banco-website run build
```

## Deploy note
Existing Docker / compose paths may still reference `banco-web` until cutover.
Cutover plan: point `Dockerfile.banco-web` / compose at `banco-website`, then
delete or archive the frozen package.
