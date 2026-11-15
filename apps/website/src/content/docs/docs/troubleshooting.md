---
title: Troubleshooting
description: Fix setup, agent runs, connection errors and unavailable comparisons.
---

## I see Queue for agent instead of Run agent

Managed mode is not enabled for this project. In an installed app, stop dev and run:

```sh
bunx --bun usenudge agents --agent codex --managed
```

Choose `claude` or `opencode` instead if preferred, then restart `bunx --bun usenudge dev`. In the Nudge source repository use
`bun packages/cli/src/index.ts` in place of `bunx --bun usenudge`.

If you intended to use an existing agent terminal/IDE, **Queue for agent** is
correct. Follow [external MCP setup](/docs/mcp-setup/) and ask that agent to
fetch the saved request.

## Adapter installation failed

Codex and Claude setup download maintained ACP adapters into ignored
`.nudge/agents/`. Check registry connectivity and rerun the same setup command.
Installation failure does not change your app's dependencies or select a new
provider. Do not add the Claude SDK to your app as a workaround.

OpenCode needs an installed CLI that supports `opencode acp`. Its authentication
and models are configured through OpenCode.

The preview has not yet been live-validated with the real adapters. Fixture tests
do not establish compatibility with every installed provider version.

## Runner offline, or a run failed

Confirm setup succeeded and restart dev. The dev server starts the runner only
when managed mode is enabled. Check the native agent's login and configuration,
and that it can access its own local state directory under your current OS user.

For example, native `codex login status` or `claude auth status` can help check
authentication. Do not copy credential files into the app or paste raw tokens
into an issue. See [agent setup](/docs/agents/) for billing and subscription details.

After fixing the cause, inspect existing edits and use **Retry agent**.
Failures, Stop and restart do not undo file changes. Unsupported ACP permission
or form requests fail rather than receiving automatic approval.

## A request waits, or a session cannot be reused

Up to three agent runs work at the same time in a project (set
`NUDGE_MAX_PARALLEL_RUNS`, 1–10, before starting dev). Further requests wait as
**Waiting for runner** and start when a run finishes. A request can only have
one run at a time. Parallel runs share your working copy, so give them separate
parts of the UI; two agents editing the same file can overwrite each other.

Existing sessions must belong to this project and the selected provider and
have a resumable provider session. A missing, busy or incompatible session is
rejected. Choose **New session** explicitly if that is what you want; Nudge does
not silently redirect a request into another conversation.

## Work was interrupted

Restart or loss of the runner heartbeat marks unfinished runs interrupted.
Nudge does not replay them automatically. Inspect the app and code before retrying.
A brief recovery delay allows the previous runner to shut down.

For an abandoned **external MCP claim**, ask your external agent to fetch the
latest annotation version and call `release_annotation`. That returns the
annotation to queued. MCP cannot release a revision owned by an active managed run.

## Bridge unreachable

Start `bunx --bun usenudge dev`, then run this in another app terminal:

```sh
bunx --bun usenudge doctor
```

Nudge dev chooses a free bridge port automatically. Root `bun run dev` in the Nudge repository starts only its website, not your app or bridge.

Keep a failed composer open while retrying; its text remains available.
The doctor checks the bridge and database, not model availability.

## Unauthorized or origin denied

Open the trusted local dev URL. Ensure the browser, runner and optional MCP
process use the same project/state directory. Their credentials have separate
scopes and cannot substitute for one another.

Installed Vite setup supplies its dev origins and bridge URL automatically.
Manual bridge configuration uses exact local `NUDGE_ALLOWED_ORIGINS` and `NUDGE_PORT`; the installed integration supplies its actual origins automatically. Do not expose the bridge to the network or use wildcard CORS.

## A write is stale

Another operation updated the annotation. Refresh and retry with the current
version. Image attachments also increment versions. Invalid transitions and
active-run conflicts can return 409; accepted annotations are terminal.

## No overlay appears

Use the supported local Vite dev command after setup. Start `bunx --bun usenudge dev` for local runtime injection. Only explicit `init --integrate` changes the normal dev script to use `vite.nudge.config.ts`. Production builds intentionally
omit Nudge. Manual SDK integrations must explicitly enable it during development.

## Comparison unavailable

The selected node may be missing, duplicated, private or unsupported. See
[snapshot recovery](/docs/snapshots/). Retry, explicitly reselect, or review the
running app and code. A missing screenshot never establishes correctness.

## Browser tests cannot install Chromium

This is a contributor setup issue. Browser downloads require network access.
Use `bun --bun playwright install --with-deps chromium` where system dependency
installation is allowed. Installed Windows Chrome is a fallback;
`NUDGE_BROWSER_CHANNEL=chrome` explicitly selects it.
