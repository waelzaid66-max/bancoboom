---
name: Replit thread exhaustion via pnpm self-update loop
description: fork/EAGAIN everywhere = 1024-thread cgroup cap; pnpm manage-package-manager-versions recursion is the usual culprit; bash-builtin rescue procedure
---

## Symptom
Every ShellExec and workflow fails with `bash: fork: Resource temporarily unavailable`; node crashes on `uv_thread_create`. Container has a ~1024 **thread** cap (ulimit -u is huge and irrelevant).

## Root cause (this repo)
`packageManager: pnpm@11.9.0` in package.json + installed pnpm 10.x → pnpm's self-managed version feature spawns `pnpm add pnpm@11.9.0` **recursively and infinitely** (each child re-triggers it). ~90 stuck node processes × 11 threads = cap exhausted.

## Fix (permanent)
`.npmrc` root: `manage-package-manager-versions=false`. Never remove it — removing re-triggers the fork bomb on any pnpm invocation.

## Rescue procedure when forks are dead
Bash builtins don't fork. In one ShellExec:
- count procs: `procs=(/proc/[0-9]*); echo ${#procs[@]}`
- identify: `read -r c < /proc/PID/comm`, cmdline via `while IFS= read -r -d '' a; do ...; done < /proc/PID/cmdline`
- kill whole process group with builtin kill: `kill -9 -PGID` (all leaked children shared pgrp of the original workflow pid).
Avoid `$(...)` and pipes — they fork.
