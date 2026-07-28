---
name: Shallow clone phantom-object push failures
description: "did not receive expected object" on every push = the local repo is SHALLOW and the phantom SHA is the boundary commit's missing parent; fix by severing the boundary via commit-tree rewrite.
---

# Shallow clone → phantom object on push

Symptom: every `git push` fails with `remote: fatal: did not receive expected object <sha>`,
same SHA every time, even to a brand-new empty repo, even with `--no-thin`, `pack.window=0`,
fresh `repack -a -d -f -F`, and clean `git fsck`.

**Diagnosis (one command):** `git rev-parse --is-shallow-repository` → `true`. The phantom
SHA is the `parent` of the commit listed in `.git/shallow` — the real history below the
boundary was never fetched, and Replit's `gitsafe-backup` daemon cannot deepen it
(`fetch --unshallow` / `--deepen=N` exit 0 but change nothing).

Red herrings to skip: PAT validity, repo deletion/recreation, postBuffer, thin packs,
delta corruption, proxy truncation (tiny pushes succeed — that tests auth+transport only).

**Fix (keeps all visible commits, metadata, trees; only SHAs change):**
1. Recreate each commit oldest→newest with `git commit-tree`, dropping the boundary
   commit's phantom parent (script preserves author/committer/date/message bytes exactly;
   note: GitHub API create-commit strips trailing newlines → never recreate exact SHAs via API).
2. `update-ref refs/heads/main <new-tip>`, delete `.git/shallow`, `repack -a -d -f -F`, push.

**Why:** the user demanded a complete stable copy on GitHub; the hidden pre-boundary
history is unrecoverable from any reachable remote, so severing is the only path.

**How to apply:** on ANY unexplained push rejection, check `is-shallow-repository` FIRST.
Also: a working PAT can sit in the encrypted secret store while a same-named shared
env-var placeholder shadows it in the shell — check `viewEnvVars({type:"all"})` for both
entries and `deleteEnvVars` the shadow (same pattern as the OPENAI_API_KEY fix).
Push with the PAT via `git -c credential.helper='!f() { echo username=x-access-token; echo "password=$VAR"; }; f'`
— never embed the token in the remote URL.
