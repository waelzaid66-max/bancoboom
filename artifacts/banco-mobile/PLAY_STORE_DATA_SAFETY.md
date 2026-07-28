# BANCO — Google Play Data Safety (Copy-In Reference)

This document is the source of truth for completing the **Data Safety** form in
Google Play Console (Policy → App content → Data safety). Copy each answer into
the matching Console field. Keep this file updated whenever data collection
changes.

---

## 1. Summary answers

| Console question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS for all API traffic) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in-app: Profile → Delete Account, plus email to privacy@banco.today |

---

## 2. Data types collected

### Personal info
| Data type | Collected | Shared | Processing | Purpose | Optional? |
| --- | --- | --- | --- | --- | --- |
| Name | Yes | No | Required for account | Account management | Required |
| Email address | Yes | No | Required for account | Account management, authentication | Required |
| Phone number | Yes | No | Collected only when user shares it to contact a seller | App functionality (connect buyer & seller) | Optional |

### Photos
| Data type | Collected | Shared | Processing | Purpose | Optional? |
| --- | --- | --- | --- | --- | --- |
| Photos | Yes | No | Photos the user explicitly selects (profile picture, listing/chat media) and the business verification documents & identity photo they capture or choose during account verification | App functionality (profile picture, listings, business verification/KYC) | Optional |

### App activity
| Data type | Collected | Shared | Processing | Purpose | Optional? |
| --- | --- | --- | --- | --- | --- |
| App interactions | Yes | No | Listings viewed, searches, taps | Analytics, personalization (feed recommendations) | Optional |
| Other user-generated content | Yes | No | Inquiry actions (call / WhatsApp / chat) on listings | App functionality | Optional |

### App info and performance
| Data type | Collected | Shared | Processing | Purpose | Optional? |
| --- | --- | --- | --- | --- | --- |
| Crash logs / diagnostics | Yes | No | Standard diagnostics | App functionality, analytics | Optional |

> We do **not** collect precise/approximate location, financial info, contacts,
> calendar, SMS, call logs, health, or browsing history. We do **not** use any
> data for third-party advertising and we do **not** sell user data.

---

## 3. Security practices

- **Encryption in transit:** Yes — all client↔server traffic uses HTTPS/TLS.
- **Encryption at rest:** Provided by the database/storage infrastructure.
- **Account deletion:** Users can delete their account in-app (Profile → Delete
  Account). Deletion runs an atomic backend pipeline that anonymizes the account
  record (soft delete), erases saved listings and behavioral activity, strips
  personal contact details from prior inquiries, and removes the user from the
  authentication provider (Clerk).
- **Data deletion request URL:** the public Privacy Policy page (see §5) plus the in-app flow (Profile → Delete Account).
- **Committed to Play Families policy:** App is not directed at children.

---

## 4. Permissions declared

| Permission | When requested | Rationale shown first? |
| --- | --- | --- |
| Photo library (READ_MEDIA_IMAGES) | When the user taps their avatar to set a profile picture, attaches media to a listing/chat, or chooses an existing file in the business verification flow | Yes — the avatar flow shows the in-app `PermissionRationaleModal`; the other flows request the permission only after an explicit user tap on a "choose"/"attach" action |
| Camera (CAMERA) | Only in the business verification flow, after the user explicitly taps "Take photo" to capture a verification document or identity photo | Yes — the OS prompt appears only after that explicit in-app action; on permanent denial we deep-link to system Settings. The camera is never used outside verification. |

No background access to camera, photos, or location is requested.

---

## 5. Required policy links

The Privacy Policy and Terms are now **hosted publicly** in the BANCO Dealer OS
web app. These pages require **no sign-in** (they render outside the dealer
role-guard) and mirror the in-app legal screens word-for-word, including the
**Financial Transparency** disclosure. Each page has an English ⇄ العربية toggle.

| Document | Public path | Play Console field |
| --- | --- | --- |
| **Privacy Policy** | `/dealer-os/privacy` | Paste the full URL into Policy → App content → **Privacy policy** |
| **Terms of Service** | `/dealer-os/terms` | (best practice — link in store listing / app) |

**Full URL = `https://<DOMAIN>/dealer-os/privacy`**, where `<DOMAIN>` is the
deployed host:

- **Production (after Publish):** `https://<your-app>.replit.app/dealer-os/privacy`
  — or the custom domain once configured, e.g. `https://banco.today/privacy`.
- **Development / review preview (live now):**
  `https://10560eed-bc01-46c4-9db9-1c90e30d4ffa-00-3e831fkvz4woy.janeway.replit.dev/dealer-os/privacy`
  (and `.../dealer-os/terms`). Dev URLs are ephemeral — use the production URL for
  the actual Play Console submission.

- **In-app:** also available at Profile → Privacy Policy and Profile → Terms of
  Service (the source copy these pages mirror).

> Action item before submission: deploy the Dealer OS web app (Publish), then
> paste `https://<production-domain>/dealer-os/privacy` into the Play Console
> "Privacy policy" field.
