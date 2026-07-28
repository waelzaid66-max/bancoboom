---
name: BANCO mobile biometric lock + theme gating
description: Cold-start gating rule for biometric app-lock and the default-dark theme hydration pattern in banco-mobile
---

# Biometric app-lock cold-start gating

A biometric unlock that **gates app entry** must render a blocking, opaque cover during the
async hydration window (while the saved preference is read from AsyncStorage AND hardware/enrollment
is probed), not only when `locked === true`.

**Why:** on cold boot `locked` starts `false` until those awaits resolve. For a user who previously
enabled biometric unlock, that window briefly paints real app content before the lock overlay appears —
a privacy leak. The architect flagged exactly this as a P1.

**How to apply:** keep a `hydrated` flag (starts false, set true at the end of the boot effect). Render
order: `!hydrated ? <Gate/> : locked ? <LockOverlay/> : null`. The gate uses `colors.background` (dark by
default) so there is never a white flash. On web set `pointerEvents="none"` (native biometrics don't run there).

# Default-dark theme without white flash

ThemeProvider initializes to dark **synchronously** and only then loads/validates the persisted
`banco.theme` value; `useThemeMode()` falls back to dark outside the provider so `useColors()` can never
crash on an undefined mode. Worst case for a persisted-light user is a brief dark→light transition, never white.

# Password-gated account deletion (two-phase error handling)

Deletion behind a Clerk password check is **verify-only**: call `signIn.password()` and check
`signIn.status === "complete"` WITHOUT `setActive`/finalize, so the current session is never switched.
Split the two failure modes — a failure in the verify phase is "wrong password"; a failure in the
subsequent `deleteAccount()` call is a generic deletion error. Collapsing them into one catch
mislabels a real deletion failure as a wrong password.
