# BANCO — Production State, Clean-Version Attestation & Next-Wave Plan

> Chief Architect · branch `claude/facebook-oauth-e1` off clean `main` (66d2949) · 2026-07-25
> Owner approvals in effect: install + run + **push the best stable version** (after completion + PAT rotation).

## 1. Verified stable state (committed, clean, additive — safe to push)
| commit | layer | verification |
|--------|-------|--------------|
| `6778e65` | Facebook OAuth (E1) mobile | guard 46/46 · mirrors google/apple · glyph in registry · i18n en+ar |
| `3c307c2` | Coolify storage deploy-breaker fix (gcs→s3) | matched to code (objectStorageProvider rejects gcs) |
| `78606be` | car-import Layer 1 (DB: import_orders + import_order_stage) | mirrors financingRequests · stages match the real in-app guide |

**Staged, pending toolchain verify (NOT committed until codegen+tsc green):** L2 OpenAPI (import-orders schemas+paths) · L4b `car_import` notification triple-sync (db enum + TS union + ensureSchema boot-patch).

## 2. Clean-version attestation (no Cursor/Replit/Claude/Copilot pollution)
- **Root of prior "pollution":** the `bancotoday-reconstruction` branch is ~95% docs that claim work "done" citing **commits that don't exist** (Facebook, import L1) — see [[banco-recon-docs-fiction]]. That branch is NOT merged; `main` is clean.
- **This branch:** every commit is off clean `main`, **additive**, and mirrors an existing in-repo pattern (financingRequests, bookings, google/apple OAuth). No whole-file rewrites, no deletions, no doc-only "fixes". Each layer is independently revertible.
- **No secrets committed.** No Replit ad/name strings introduced.

## 3. Import feature — completion gate (current focus, finish before expansion)
Toolchain install (orval + tsc) is the ONLY blocker. On green, the runbook (`scratchpad/import-feature-runbook.md`) executes: codegen → verify L2+L4b → commit → L4 `ImportOrderService` (mirror RfqService) → L5 routes/controller (mirror rfq) → L6 mobile Import hub (upgrade import-tracking.tsx, reuse mapped stage icons) → L7 notif routing+icon. Green gate + commit per layer.

## 4. NEXT WAVE (planned now, executed AFTER import completes — no distraction)
Owner-named, grounded in evidence. Each is its own layered mini-plan:
1. **Maps — layered completion (the unique Search-page map).** Current `components/search/mapHtml.ts` = pins + locate only; **missing radius circle draw-select, clustering polish, RE-specific overlays**. Benchmark: Nawy-style RE map (draw-area search, compound pins, price overlays). Plan: additive Leaflet layers behind the existing WebView contract; guard-tested; per-section.
2. **Profiles review + profile list maintenance** — the list rendering (ScrollView `.map` perf risk noted earlier) + unwired controls audit.
3. **4 account types full audit** — individual / dealer("Banco Business") / company(+suppliers) / financial_institution: maintenances, journeys, gating.
4. **Ease of account creation** — the signup→account-type→onboarding funnel friction (ties to the Clerk E3 config + Facebook just added).
5. **Tool-offices (مكاتب الأدوات) + all behaviors/links audit** — maps/GPS tools, address search, geocoding, connections.

## 5. Push plan (owner-approved) — prerequisites
- **Push target:** this stable branch to `bancoo` (NOT main directly; via branch → review/PR).
- **⚠️ Security prerequisite:** the PAT exposed in chat MUST be rotated before any push — pushing with a compromised credential is unsafe. After rotation, push the branch.
- **What to push:** the verified stable set. Push the import feature only once L2–L7 are complete + green (a half-feature is not "the best stable version"); L1 alone is harmless/additive if pushed earlier as a checkpoint.

## 6. Immediate next action
Install completes → codegen verifies staged L2+L4b → resume layered execution → then push per §5. Expansion (§4) starts only after §3 is done.
