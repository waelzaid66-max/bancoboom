# Threat Model

## Project Overview

BANCO is a marketplace platform for cars, real estate, and industrial assets. The production codebase consists of an Express 5 API (`artifacts/api-server`), a React/Vite Dealer OS (`artifacts/dealer-os`), an admin web surface (`artifacts/admin-os`), an Expo mobile client (`artifacts/banco-mobile`), shared generated API clients/specs (`lib/api-*`), and a PostgreSQL/Drizzle data layer (`lib/db`). Clerk is the authentication provider. The mockup sandbox is development-only and out of production scope unless future scans prove it is reachable in production.

Current deployment status is publicly deployed at `https://dealer-os.replit.app`. For this scan, production reachability is assumed for the Dealer OS origin, its same-origin `/api/*` routes, and any authenticated browser session using that deployment. Because the deployment is on `replit.app`, browser trust decisions involving sibling `*.replit.app` origins are security-relevant.

## Assets

- **User accounts and sessions** — Clerk-authenticated sessions for buyers, dealers, and admins. Compromise enables impersonation and access to saved items, dealer listings, dealer lead data, admin moderation data, and self-service account actions.
- **Dealer business data** — dealer-only listings, lead history, analytics, ad purchases/boosting, imports, and subscription state. Exposure or tampering affects merchant operations and marketplace integrity.
- **Marketplace listing state** — listing descriptions, media URLs, prices, seller identity/phone, listing status, report state, and conversation reachability. Some fields are public only while a listing is active; non-public states must remain protected.
- **Buyer contact data** — lead submissions can contain buyer name and phone number. This is sensitive personal data that must only reach the intended seller and only for legitimate interactions.
- **Payment and entitlement state** — wallet balances, transactions, invoices, payment intents, plan selection, subscription status, and ranking/pricing entitlements. Unauthorized changes directly affect revenue and marketplace fairness.
- **Application secrets** — `DATABASE_URL`, Clerk secret key, and deployment env vars. Leakage would expose the full backend trust boundary.

## Trust Boundaries

- **Browser/mobile to API** — all request bodies, query params, path params, and most headers are attacker-controlled. The API must authenticate and authorize every protected route server-side.
- **BANCO origin vs other web origins** — only BANCO-controlled origins should be able to read credentialed API responses. Trusting broad `*.replit.app` or similar sibling origins is equivalent to trusting attacker-controlled sites on the same hosting platform.
- **API to PostgreSQL** — the API holds direct read/write access to marketplace, lead, wallet, subscription, and user tables. Query construction and row scoping are critical.
- **API to Clerk** — Clerk middleware and the Clerk proxy route trust upstream auth/session material and proxy headers. Host/proxy handling affects auth behavior.
- **Public to authenticated to dealer-only to admin-only surfaces** — public feed/search/listing reads, authenticated saves/recommendations/reports/conversations, dealer-only analytics/listings/leads, and admin moderation/report/support routes must remain distinct.
- **Upload serving boundary** — presigned upload generation and `/api/v1/uploads/objects/*` serving bridge object storage into the public web origin. Files from private storage must not become anonymously readable or executable without explicit authorization.
- **Production vs dev-only artifacts** — `artifacts/mockup-sandbox`, seeds, and local-only tooling should not influence production findings unless there is clear production reachability.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/v1/*`, `artifacts/dealer-os/src/App.tsx`, `artifacts/admin-os/src/App.tsx`, `artifacts/banco-mobile/app/_layout.tsx`
- Highest-risk code areas:
  - `artifacts/api-server/src/middlewares/authGuard.ts`
  - `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`
  - `artifacts/api-server/src/lib/cors.ts`
  - `artifacts/api-server/src/controllers/uploadController.ts`
  - `artifacts/api-server/src/services/PaymentIntentService.ts`
  - `artifacts/api-server/src/services/SubscriptionService.ts`
  - `artifacts/api-server/src/services/LeadService.ts`
  - `artifacts/api-server/src/services/ReportService.ts`
  - `artifacts/api-server/src/services/ConversationService.ts`
  - `artifacts/api-server/src/services/ListingService.ts`
  - `lib/db/src/schema/index.ts`
- Public or low-friction abuse surfaces: feed, search, listing detail, lead tracking, report creation, upload URL generation, upload object serving, and conversation creation.
- Money and entitlement surfaces: wallet top-up, payment intent confirmation, subscription creation/confirmation, boosts, and effective-plan lookups.
- Dev-only areas usually ignored: `artifacts/mockup-sandbox/**`, `attached_assets/**`, seed scripts, local scripts unless production reachability is demonstrated.

## Threat Categories

### Spoofing

The application relies on Clerk sessions and bearer tokens across web and mobile clients. All protected API routes must derive identity from verified Clerk auth state on the server, not from frontend role checks or client-supplied identifiers. Proxy/header handling around Clerk must not let attackers influence auth behavior, source attribution, or multi-domain host resolution.

### Tampering

Public and authenticated clients can submit listing data, lead events, reports, conversations, uploads, and billing-related actions. The backend must validate and constrain these inputs, and marketplace state changes must be scoped to authorized actors. Payment and subscription state must only change in response to trusted provider-side settlement, not client assertions.

### Information Disclosure

The project stores seller phone numbers, buyer lead contact details, message metadata, dealer analytics, admin moderation data, and uploaded content served from the BANCO origin. Public endpoints must not expose non-public listings, dealer-only data, or hidden inventory metadata. Browser-origin trust is part of this boundary: a sibling Replit deployment must not be able to read BANCO users' credentialed API responses.

### Denial of Service

The API exposes public read endpoints and low-friction authenticated mutation endpoints. Report creation, fake lead generation, upload hosting, and broad body parsing can be abused to suppress listings, spam dealers, consume storage, or create disproportionate operational load. Parser ordering and mutation side effects are security-relevant because they can turn low-cost attacker requests into high-cost backend work.

### Elevation of Privilege

Dealer routes are higher privilege than normal authenticated user routes, and admin routes are higher privilege than dealer routes. The system must prevent IDOR and status-bypass issues where low-privilege users can reach non-public listing state, alter another seller's business outcomes, or obtain entitlements reserved for paid or privileged flows.
