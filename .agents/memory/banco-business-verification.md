---
name: BANCO business verification (KYC) flow
description: How the mobile business-verification path works and its non-obvious constraints
---

- "Under review" is DERIVED, never stored: `isBusiness && !isVerified`. The backend exposes only an `is_verified` boolean (no pending field). Any verification-status UI must derive the pending state this way.
- Camera permission is scoped to the verification flow ONLY. Every other capture surface (listings, chat, profile/avatar) is library-only.
  **Why:** Google Play data-safety + iOS usage strings must match actual behavior; an over-broad camera disclosure, or a stale photo-library string that still says "avatar only", is a compliance fail (the architect flags it).
  **How to apply:** if you add a capture surface, update BOTH the OS usage strings (app.json: `photosPermission`, `NSPhotoLibraryUsageDescription`, `cameraPermission`) AND the `PLAY_STORE_DATA_SAFETY.md` rows in lockstep. Keep camera scoped to KYC; don't broaden it.
- Captured documents AND the optional identity (selfie-with-ID) photo all go into the SAME `companyDetails.documents[]` array (no per-item metadata) — admins distinguish them only by order/position.
- Admin review gap: `artifacts/admin-os/src/pages/users.tsx` toggles `is_verified` but does NOT render `companyDetails.documents`, so admins approve blind until that surface is built.
