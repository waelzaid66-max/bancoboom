---
name: BANCO AI assistant env fix
description: Root cause and fix for AI assistant failures in production — env var/secret collision and wrong base URL
---

The AI assistant was broken in production because of two env var collisions in the shared environment:

1. `OPENAI_API_KEY = "_DUMMY_API_KEY_"` set as a plain env var overrode the real Replit secret. Env vars beat secrets when the same key exists in both.
2. `AI_INTEGRATIONS_OPENAI_BASE_URL = "http://localhost:1106/modelfarm/openai"` routed all OpenAI calls to a local sidecar that doesn't exist in production → every AI call failed with a network error.

**Fix:** Delete both from shared env vars. The real `OPENAI_API_KEY` secret then takes effect automatically. With no base URL override, the OpenAI client uses its default `https://api.openai.com/v1`.

**Dev setup:** Both values are kept as development-only overrides so the modelfarm sidecar is still tried in dev (falls back to real key when unavailable).

**Why:** Replit secrets are injected as env vars. A conflicting plain env var (set via `setEnvVars`) takes precedence and silently shadows the secret.

**How to apply:** Before debugging AI failures, always check `viewEnvVars({ type: "all" })` to confirm no dummy/localhost value is overriding the real secret.
