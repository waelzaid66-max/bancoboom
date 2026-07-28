---
name: Replit managed-AI (modelfarm) provisioning
description: How to (re)provision the Replit OpenAI AI integration and the sidecar "not configured" gotcha that env vars alone don't fix
---

# Replit managed-AI (OpenAI) provisioning

The `javascript_openai_ai_integrations` blueprint uses Replit's **managed** AI
(no user OpenAI key). At runtime the client baseURL resolves to a **local dev-only
sidecar**: `http://localhost:1106/modelfarm/openai`. The client wrapper
(`lib/integrations-openai-ai-server`) prefers `AI_INTEGRATIONS_OPENAI_BASE_URL` +
`AI_INTEGRATIONS_OPENAI_API_KEY`, else falls back to `OPENAI_API_KEY` against
api.openai.com.

## Provisioning the env vars
- The provisioning step is **`setupReplitAIIntegrations`** — it is NOT one of the
  agent's direct tools; it is a **code_execution callback**. Calling
  `setup_replit_ai_integrations` as a tool fails ("tool doesn't exist").
- Params are **camelCase**: `{ providerSlug: "openai",
  providerUrlEnvVarName: "AI_INTEGRATIONS_OPENAI_BASE_URL",
  providerApiKeyEnvVarName: "AI_INTEGRATIONS_OPENAI_API_KEY" }`. Passing snake_case
  keys throws a pydantic validation error.
- It requires the user's account phone verification to be complete; before that it
  silently no-ops (env vars stay absent). Retry it after verification.
- On success it returns `{ success:true, envVarsSet:[...] }`. Env vars are injected
  into **workflow processes on restart** — restart the api-server workflow, then
  the server sees `AI_INTEGRATIONS_*`.

## Gotcha: env present but sidecar still 404s
**Why:** After provisioning + restart the server had both env vars, yet
`chat.completions.create` returned `404 "Replit AI Integrations is not configured"`
(and `models.list` → 405, which is normal — modelfarm doesn't expose /models).
This is a **platform-side sidecar activation gap**, not a code bug: the modelfarm
sidecar reports the provider as not configured even though the credentials are
correct and injected. It does not clear with propagation time in-session and is
not fixable from application code.

**How to apply:** If AI still 404s "not configured" after `setupReplitAIIntegrations`
success + workflow restart + verified env vars + correct client wiring, stop
re-hammering the endpoint. Either the managed sidecar needs a platform-side
(re)activation outside agent control, or wire the user's own `OPENAI_API_KEY`
(the client already falls back to it) for a definitive unblock.

## Diagnostic tip
A dev-only, NODE_ENV-gated `/__diag_ai` route that reports `{hasIntegrationBase,
hasIntegrationKey, hasOwnKey, baseShape}` + a chat + models.list attempt is the
fastest way to distinguish "no env" vs "env present, sidecar not configured" vs
"model error". Remove it once done — don't leave temp no-auth routes in source.
