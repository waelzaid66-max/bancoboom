---
name: BANCO email completeness
description: All 9 NotificationCategory email types now implemented; wire-up points in services
---

`NotificationCategory` has 9 types. Previously only 6 had email send functions. The 3 missing ones are now implemented in `EmailService.ts`:

| Category | Function | Trigger point |
|---|---|---|
| `message` | `sendNewMessageEmail` | `ConversationService.ts` after `createNotification` |
| `new_match` | `sendNewMatchEmail` | `AlertService.ts` `notifyNewMatch()` per-search loop |
| `price_drop` | `sendPriceDropEmail` | `AlertService.ts` `notifyPriceDrop()` per-saver loop |

Note: `rfq` is intentionally left without email (RFQ flow is B2B, uses in-app only).

**Pattern for all email wire-ups:**
```typescript
void (async () => {
  try {
    if (!(await isEmailChannelEnabled(userId, "category"))) return;
    const [u] = await db.select({ email: users.email, name: users.name })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!u?.email) return;
    await sendXxxEmail({ to: u.email, ... });
  } catch (err) { console.error("[Xxx email]", err); }
})();
```

**Why:** Fire-and-forget async — email failure must never block the originating action. `isEmailChannelEnabled` gates per user preference (absence of row = enabled).
