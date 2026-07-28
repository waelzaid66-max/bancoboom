---
name: BANCO mobile contact / apply / notifications loop
description: How mobile surfaces buyer↔dealer contact, installment apply, and "notifications" given there is NO chat/notifications backend
---

# Mobile contact / apply / business-requests loop

There is **no realtime-chat table and no notifications table** on the server. The mobile product surfaces all of contact, "apply for installment", and business "notifications" through the EXISTING lead pipeline.

- Buyer → dealer contact, the installment "Request Offer"/apply action, and the chat CTA all call `trackLead` with `action_type ∈ {whatsapp, call, chat, finance_request}`. `finance_request` is the apply-for-installment path.
- The business "receive requests" / notifications surface is `getDealerLeads` + `updateLeadStatus` (status `new→contacted→closed`), shown in `app/business/requests.tsx`.
- Multi-phone has no backend column → stored in `specs.contact_phones` (string[]); industrial sub-type (factory/warehouse/machine/production_line/land) → `specs.industrial_type`. `specs` is free-form `z.record(z.unknown())` server-side.
- The apply modal's selected plan/duration is **UX-only** — `trackLead` has no plan field. That is the honest limit of the existing contract.

**Why:** A user pivot demanded a complete end-to-end mobile product wiring ONLY existing APIs (no new backend). Faking a stored two-way chat or a buyer-side notification feed would be dishonest and unbacked.

**How to apply:** Never add a fake persisted chat or buyer notification store to mobile. Any new contact/apply/notify surface must go through `trackLead` / `getDealerLeads`. If true chat or notifications are wanted, that is a real backend task, not a mobile-only wiring change.
