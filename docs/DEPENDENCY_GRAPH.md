# DEPENDENCY_GRAPH — BANCO / B-OOM

> Phase 4.5 · repo `bancoo` @ `66d2949` · derived from each `package.json`'s `@workspace/*` deps.

## 1. Graph (apps → shared libs)
```
                          ┌─────────────── lib/db ───────────────┐
                          │                                       │
lib/api-spec (openapi) ──▶ lib/api-zod ──▶ api-server ◀── lib/integrations-openai-ai-server
        │                                     ▲
        └──▶ orval ──▶ lib/api-client-react ──┘ (HTTP contract, generated)
                          ▲   ▲   ▲   ▲   ▲
        ┌─────────────────┘   │   │   │   └─────────────────┐
   banco-mobile         banco-web  banco-website        dealer-os / admin-os / landing
        │                    │          │                    │
   search-contract      search-contract search-contract   taxonomy
   taxonomy             taxonomy+design taxonomy+design
```

## 2. Per-app dependency table
| App | @workspace deps |
|-----|------------------|
| api-server | `api-zod`, `db`, `integrations-openai-ai-server` |
| banco-mobile | `api-client-react`, `search-contract`, `taxonomy` |
| banco-web | `api-client-react`, `design-tokens`, `search-contract`, `taxonomy` |
| banco-website | `api-client-react`, `design-tokens`, `search-contract`, `taxonomy` |
| dealer-os | `api-client-react`, `taxonomy` |
| admin-os | `api-client-react` |
| landing | `api-client-react` |
| mockup-sandbox | (none — standalone) |

## 3. Critical chains (order-sensitive)
1. **Contract chain:** `api-spec` → (orval) → `api-client-react` + `api-zod`. Regenerate on ANY endpoint/schema change; then typecheck all consumers.
2. **Data chain:** `db` (Drizzle schema) → `api-server` services. Schema change ⇒ migration + service update.
3. **Search chain:** `search-contract` shared by mobile + both web surfaces — a change ripples to 3 apps.
4. **Taxonomy chain:** `taxonomy` shared by mobile + web + dealer — markets/currencies/categories live here (single source; do NOT hardcode elsewhere).

## 4. Build order (topological)
```
lib/db, lib/api-spec, lib/taxonomy, lib/design-tokens
   → lib/api-zod, lib/api-client-react, lib/search-contract, lib/integrations-openai-ai-server
      → api-server, banco-mobile, banco-web, banco-website, dealer-os, admin-os, landing
```
Root `typecheck` already enforces libs-first (`typecheck:libs`) then artifacts.

## 5. Fan-out risk (change-impact)
| Change in… | Impacts |
|------------|---------|
| `api-spec` / codegen | **ALL 7 frontends + api-server** (highest blast radius) |
| `taxonomy` | mobile, web, website, dealer |
| `search-contract` | mobile, web, website |
| `db` | api-server only (but migrations touch prod DB) |
| `design-tokens` | web, website |

**Rule:** after any codegen/spec change, typecheck the WEB surfaces too (admin-os/dealer-os/banco-web/banco-website) — they silently break otherwise (documented recurring failure in legacy repos).
