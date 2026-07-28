---
name: Long builds must run as console workflows, never detached shells
description: setsid/nohup backgrounding of a heavy build disconnects the Replit container; use configureWorkflow with outputType console instead.
---

# Long builds: console workflow, not `setsid`/`nohup`

A build that exceeds the ~300s `ShellExec` ceiling (the Expo web export is the
canonical example) must be run as a Replit-managed **console workflow**:

```js
await configureWorkflow({
  name: "TEMP: <thing> build",
  command: "cd /home/runner/workspace && <build cmd> 2>&1 | tee /tmp/<thing>-build.log",
  outputType: "console",
  autoStart: true,
});
```

Then poll `/tmp/<thing>-build.log` with ordinary `ShellExec` calls, and
`removeWorkflow` when finished.

**Why:** two backgrounding strategies both fail.
- A plain `cmd &` inside `ShellExec` is reaped when the tool call returns.
- `setsid nohup cmd &` is worse — it **disconnected the container entirely**
  ("SERVER unexpectedly disconnected"), stopping *every* workflow and forcing a
  cold restart. The heavy detached process escapes the tool call's resource
  accounting and takes the supervisor down with it.

A console workflow is supervised by Replit, survives across tool calls, and its
resource usage is accounted for properly.

**How to apply:** the moment a build looks like it will pass ~4 minutes, stop
retrying with a longer `timeout_ms` and switch to a temp console workflow. Also
note that a SIGTERM'd Expo export leaves a stale numeric temp dir in
`artifacts/banco-mobile/dist/` — clean it before re-running, and remove the temp
workflow afterwards so the workflow list stays minimal.
