---
name: Stay black header lock (owner decision, final)
description: BOOM STAY black StaysHomeHeader is owner-approved and guard-locked; fake web 67px topPad is banned
---

- Owner decision 2026-07-19 (FINAL): the premium black `StaysHomeHeader` (Bands A–D) in `BookingStaysApp` IS the approved Stay design, built at the owner's direct request and merged on main. Any older "canonical" doc (e.g. `CANONICAL-CORRECT-VERSION-AR.md`) demanding the rose hero / "no StaysHomeHeader" is SUPERSEDED — do not "restore" the rose hero.
- The guard test `tests/section-miniapp-guard.test.mjs` ("BookingStaysApp mounts owner-approved black StaysHomeHeader") now locks this decision. 46/46 green.
- **Fake web 67px topPad is banned everywhere** (owner crush: it destroyed headers). Sanctioned pattern: `Math.max(insets.top, Platform.OS === "web" ? 12 : 0)` — same as Search/Section/billing/analytics. A guard test scans the whole app for `Platform.OS === "web" ? 67`.

**Why:** the 2 guard failures found 2026-07-19 were exactly: stale rose-hero expectation + a 67px pad inside the new header. Fixed test to match owner decision; fixed header to sanctioned pattern.

**How to apply:** never reintroduce `? 67` pads; never swap the black header back to rose; if a doc conflicts with main + owner decision, main wins.
