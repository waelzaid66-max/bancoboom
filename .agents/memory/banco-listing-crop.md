---
name: BANCO listing image crop + upload contract
description: Durable correctness rules for the mobile listing crop modal and upload-on-add flow. Read before touching cropping, media upload, or the publish gate.
---

# BANCO listing crop + upload — durable rules

Cropping is a **custom** modal (Expo Go = no native crop libs): pan/pinch over a
fixed-aspect viewport mapped back to source pixels, then expo-image-manipulator.

- **Crop rect must be integer-safe.** Rounding BOTH origin and size can push the
  rectangle 1px past the source edge → image-manipulator rejects a valid crop at
  extreme pan/zoom. Floor the origin (clamp to dim-1), then clamp the *rounded*
  width/height to `dim - origin`.
- **Confirm latches on a synchronous ref, not async `processing` state.** A rapid
  double-tap fires two crops before React re-renders; the second pops the next
  queued image without cropping it, leaving a tile with no upload state that
  silently blocks Publish.
- **Crop override uploads bytes AS-IS** (skips HEIC/downscale normalization).
  Keep the modal's max-dim/quality in sync with the upload normalizer so cropped
  output still lands under the server size cap.
- **Publish gate = every image reached `uploaded` status.** Newly picked images
  queue for the cropper and only start uploading on confirm, so crop-pending
  images have no uploaded state and correctly block publish. The full-screen
  modal is open whenever the crop queue is non-empty, so there's never a visible
  tile in an ambiguous "pending, no overlay" state.
- **Queue advances in exactly one place per path.** removePhoto filters the asset
  out of the crop queue itself, so the *cancel* path must NOT also slice the
  queue head — doing both skips the next image (regression once fixed).
  **Why:** cancel = removePhoto (which advances); confirm = keep photo + slice(1).
- **Re-crop ("Edit") always reopens on the ORIGINAL picked asset**, never the
  prior crop output, so re-cropping never compounds quality loss.
