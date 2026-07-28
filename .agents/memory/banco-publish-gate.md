---
name: BANCO listing publish button gate
description: Why the create-listing publish button must stay pressable and never carry a media/quota pre-gate on its disabled prop
---

# Listing create: publish button gating

Rule: in `app/listings/create.tsx` the publish button's `disabled` prop must be
`submitting` ONLY. Do NOT add media-ready / quota / validation pre-gates to the
`disabled` expression. `handleSubmit()` is the real gate — it re-runs
`validateStep(1..4)`, enforces the sell-only image thumbnail (`firstImageIdx`,
guarded on `!isRequest`), blocks any tile whose upload status !== "uploaded"
(`errMediaNotReady`), and maps server 402/403 → `errQuota`. So the button can be
freely pressable without risking a half-uploaded / invalid POST.

**Why:** A prior gate `allMediaUploaded = photos.length > 0 && photos.every(uploaded)`
made the button PERMANENTLY disabled for buyer requests (`isRequest`), because
requests have NO photo floor — photos are optional, so `photos.length > 0` is
false with zero photos. The greyed button read as "the publish button doesn't
work" and produced a false "done" report. A silently-disabled button gives the
user zero feedback about why; letting `handleSubmit` run surfaces the exact
reason instead.

**How to apply:** Any future "block publish until X" requirement belongs inside
`handleSubmit` as an early-return with a specific `setError(...)` + `setStep(...)`,
never as another term ANDed into `publishDisabled`. Keep request vs sell
asymmetry in mind: requests skip photos, price, payment plans, brand/origin and
all category spec fields (both in the rendered form AND in the serialized
`specsClean`/`logistics` body — gate seller-only serialization on `!isRequest`).
