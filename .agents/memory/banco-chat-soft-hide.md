---
name: BANCO chat soft-hide + mobile listing-detail local state
description: Per-participant conversation delete invariant, and the mobile listing-detail screen's non-react-query state trap.
---

# Conversation delete = per-participant soft-hide

Deleting a conversation is NOT a hard delete. It sets only the requester's own
timestamp (`buyerDeletedAt` / `sellerDeletedAt`) on the conversation row; the
counterparty still sees the thread and all messages.

**The invariant:** any new message (`sendMessage`) MUST clear BOTH
`buyerDeletedAt` and `sellerDeletedAt`, un-hiding the thread for everyone.
`listConversations` filters out rows where the *viewer's own* `*_deletedAt` is
set. Forget the un-hide on send and a re-opened thread stays invisible to the
person who deleted it — the conversation effectively dies even though messages
are flowing.

**Why:** OLX-style chat must resurface when activity resumes; a one-sided hide
that never reverses silently drops live conversations.

**How to apply:** any future write path that revives a conversation (new
message, system message, offer, etc.) must clear both deleted-at columns, and
any new list/inbox surface must spread the viewer-hidden filter — same shape as
the abuse `publicVisibilityConditions` rule for listings.

# Mobile listing detail holds `listing` in local useState — not react-query

`artifacts/banco-mobile/app/listing/[id].tsx` loads the listing imperatively
into a `useState` (not via a `useGetListing` query hook). Mutations made from
this screen (e.g. mark-sold via `updateListing`) must patch that local state
directly. Invalidating `getGetListingQueryKey(id)` alone will NOT refresh this
screen because nothing subscribes to that query key here.

**Why:** the screen predates the react-query hook pattern used elsewhere;
relying on cache invalidation gives a stale UI (sold listing still shows active
CTA) until a full remount.

**How to apply:** when adding any listing-detail mutation on mobile, optimistically
set the local `listing` state; don't assume query invalidation propagates.
Ownership for owner-only CTAs is `useGetMe().data?.data?.id === seller.id`.

# Chat thread (messages/[id]) has NO pagination — full history loads

`getMessages` returns the entire thread in one shot; there is no cursor/offset.
Do NOT add a "load older messages" affordance — it would be fabricated UI with
no backend to drive it. The screen renders a union row type: optimistic pending
messages (carrying the full `ImagePickerAsset`, needed for width/height during
`uploadImageAsset`) merged ahead of server messages, with sending/failed/sent
state and tap-to-retry. Image send is preview-before-send (modal), not fire-on-pick.

**Why:** the only honest UX given a no-pagination endpoint; pending state must
hold the real asset object because the uploader needs its dimensions.

**How to apply:** if backend gains pagination later, add load-older then — not
before. Keep pending/optimistic rows distinct from server rows so retry works.

- Account deletion must chase DERIVED chat copies, not just primary rows: storage blobs behind mediaUrl, message-notification preview text/title, push tokens. Tombstone content in-tx; blob deletion is best-effort AFTER commit with loud logging (never a thrown error). Reactions user-ids stay by decision — opaque ids pointing at an anonymized row, same privacy class as the retained senderId that preserves thread structure.
