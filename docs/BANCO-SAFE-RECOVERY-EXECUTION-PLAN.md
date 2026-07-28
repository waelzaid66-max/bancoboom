# BANCO MARKET — Safe Recovery & Execution Plan (SoT)

> **Owner:** Production Chief Architect (Claude) · **Target repo:** `bancoo` (source of truth) · **Deploy:** Coolify (approved) · **Date:** 2026-07-25
> Evidence-based (code wins over docs). No guessing — unproven items marked UNKNOWN. Every fix has Impact + Rollback + Confidence. **No code until owner approves this plan.**

## 0. OWNER DECISIONS — LOCKED (resolve the prior audit's open F0)
| Decision | Value | Consequence |
|----------|-------|-------------|
| **Source of truth** | **`bancoo`** (fix here) | CA-OOM `210a325` = read-only reference to backport from (has later 07-21 waves) |
| **Deploy target** | **Coolify** (only, first) | Complete ALL Coolify files in parallel with Replit; other clouds = fallback |
| **Facebook login** | **BUILD it** (owner reverses prior "tenant-forbid") | New E1 code (mirror Google/Apple) + owner enables Meta app + Clerk provider |
| **No regressions** | Never break working code; giant interconnected net | surgical patches only; no whole-tree merges; Evidence Card per file |
| **Replit names/ads** | convert any to BOOM | scan + rename (comments only today; verify no user-facing) |

## 1. MY VERIFICATION vs the prior audit (code evidence + confidence)
| Claim | My evidence on `bancoo/main` (66d2949) | Verdict | Conf |
|-------|----------------------------------------|---------|------|
| Facebook OAuth absent | `profile.tsx` has `handleOAuth("google"\|"apple")` only; `case "facebook"` = social-link ICON, no `oauth_facebook` strategy — on main AND on reconstruction branch | **CONFIRMED absent everywhere** (prior doc-10 "oauth_facebook:523" was a doc over-claim — code wins) | High |
| Countries/currencies still spread in some sections | `SectionSearchApp.tsx` still has `re-market-matrix` + `materials-market-matrix` (spread grids). Stay already uses compact `MarketCountryButton` | **CONFIRMED — RE/Materials NOT compact yet** | High |
| "Fixes don't show / profile spins" | mobile prod = `build.js`→`static-build`→`serve.js`; Replit deploy is MANUAL; Clerk web-export test key can't init → profile spins | **Root cause = Clerk Dashboard config (OPS) + manual re-Publish, NOT code** | High |
| bancoo lacks CA's 07-21 evening waves | reconstruction branch is 27 commits ahead but only **2 code files** (health route) + docs + Coolify compose — CA-vs-bancoo 47-file content delta claimed by prior audit needs per-file Evidence Cards | **PARTIAL — needs Evidence-Card verification before any backport** | Medium |
| No broken code | Cursor 5-repo scan + my checks: maps/i18n/messaging/upload/accounts present | **CONFIRMED no hard breakage** | High |
| My PRs #46/#47/#48 (old CA repo) | bancoo header already MORE-trimmed; map card + Stay currency-icon already present | **REDUNDANT — do NOT apply (would regress)** | High |

## 2. PROBLEM SPLIT (owner's two buckets)
### A) ENVIRONMENT / DEPLOY (OPS — owner provides; NOT code)
- **E3 Clerk Dashboard (prod):** real `pk_live` + Allowed Origins + enable Google/Apple/**Facebook**. ← THE unblock for "profile spins / fixes don't show".
- Storage: provider must be `s3` or `replit` (code REJECTS `gcs` — Coolify doc wrongly says gcs).
- Secrets: `PAYMENT_CONFIG_ENCRYPTION_KEY` (stable), Paymob live, `RESEND_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAILS`, `pg_trgm` on prod DB.
- Coolify: pick PR #3 (full) over #2; DB migrate step; Clerk keys at build; Traefik/Nginx.

### B) APPLICATION (code — I fix, surgically, on bancoo)
- **Facebook OAuth (E1)** — build (mirror google/apple) + button + i18n.
- **RE/Materials/Factories/create currency+country → compact `MarketCountryButton`** (remove spread matrices) + reverse guard assertions.
- Notification icons fallback (investment/global_supply/payment/subscription) — additive.
- (Owner decision) Car-import live lifecycle vs guide+RFQ.
- Evidence-Card backport of any genuine CA-only wave (demote-blocked, media-503, awaiting-link) — ONLY after per-file diff proves it's missing + safe.

## 3. SAFE-FIX WAVES (prioritized · each: evidence → impact → deps → rollback → confidence)

**Wave 0 — Ops truth (owner/me-verify, no app code):**
- W0.1 Confirm Coolify compose valid + `OBJECT_STORAGE_PROVIDER` = s3/replit (fix gcs in doc). Rollback: revert doc. Conf: High.
- W0.2 Prove mobile build emits `static-build` + `/banco-mobile/status`=200 on a known SHA. Rollback: n/a (verification). Conf: Med.
- W0.3 Owner: Clerk Dashboard prod (pk_live + origins + providers incl. Facebook).

**Wave 1 — Facebook OAuth (E1, owner priority) [CODE]:**
- Evidence: only google/apple wired (`profile.tsx:500-542`). Impact: adds a 3rd SSO; isolated to the OAuth handler + button. Deps: Meta app + Clerk provider (owner). Rollback: single-file revert (patch). Conf: High (mirrors existing).

**Wave 2 — Currency/country compact in RE/Materials/Factories/create [CODE]:**
- Evidence: `re-market-matrix`/`materials-market-matrix` still spread. Impact: reclaims screen; matches Stay; changes guard assertions in same patch. Deps: none. Rollback: revert 2 files + guard. Conf: High (already done on CA — proven pattern).

**Wave 3 — Notification icons fallback [CODE]:** additive `iconForType` cases. Rollback: 1 file. Conf: High.

**Wave 4 — Evidence-Card backport from CA (only if proven missing):** demote-blocked · media-503 · awaiting-link. Each needs a per-file diff + regression check BEFORE apply. Conf: Medium (must verify).

**Wave 5 — Coolify finalize:** PR#3 base + gcs→s3 fix + migrate + Clerk build vars + image-build proof. Deps: W0. Conf: Medium.

**Deferred (owner decision):** car-import live lifecycle · rename DB `dealer` · commerce Orders.

## 4. UNKNOWNS (no evidence yet — will NOT guess)
- Live prod secret values / whether `/api/readyz` live matches any SHA.
- Exact per-file safety of each CA→bancoo backport (needs Evidence Cards).
- Whether `profile.tsx` `touch-dead` backdrop regression persists on current bancoo (verify before any patch).

## 5. NEXT STEP
On owner GO, I start **Wave 1 (Facebook OAuth)** and **Wave 2 (RE/Materials compact)** — the two confirmed, isolated, high-confidence code fixes on `bancoo` — each as a surgical patch with verification (tsc + guard) before commit. **Nothing touched until you approve this plan.**
