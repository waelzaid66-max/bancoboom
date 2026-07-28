---
name: Shared env var shadows encrypted secret
description: A same-named plaintext shared env var overrides the encrypted secret in the shell — the secret looks "wrong" until the shadow is deleted.
---

# Env var shadows secret

Symptom: user insists a credential is registered in Secrets, but the shell sees a
short/placeholder value instead.

**Rule:** a plaintext env var in `shared` with the same key as an encrypted Replit Secret
wins in the process environment. Diagnose with `viewEnvVars({ type: "all", keys: [...] })`
— it shows env-var values AND secret existence side by side. Fix: `deleteEnvVars` the
shared (and any dev/prod) entry; the real secret then appears in new shells immediately.

**Why:** hit twice — OPENAI_API_KEY (dummy value blocked the AI assistant) and
GITHUB_PERSONAL_ACCESS_TOKEN (Arabic placeholder "registered in secrets" blocked git auth
while the real PAT sat unused in the secret store).

**How to apply:** whenever a secret "isn't working" or looks like a placeholder in the
shell, check for a shadowing env var before asking the user for a new value.
