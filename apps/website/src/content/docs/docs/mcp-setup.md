---
title: External MCP integration
description: Let an existing coding-agent terminal or IDE fetch queued Nudge requests and report implementations.
---

Use this optional mode when you want to dispatch work from your existing coding
agent's terminal or IDE. To launch agents from Nudge's browser UI instead, use
[managed ACP setup](/docs/agents/).

Start `bunx --bun usenudge dev` before connecting your coding-agent host.
The host launches the MCP stdio process separately. MCP retrieves requests from the
same bridge; it does not start or control your agent.

## Register the MCP server

For an installed app, start with the generated `.nudge/mcp-config.json`; it
contains the correct project and MCP entry paths without tokens. Adapt the
registration field names to your host. Codex/Claude external setup can write
project-specific configuration with `agents --agent codex` or
`agents --agent claude` (omit `--managed`, then restart dev and your host).

This generic installed-package example omits a fixed bridge URL so MCP discovers
the current port. Use a full path to `bun` if your host has a different PATH:

```json
{
  "mcpServers": {
    "usenudge": {
      "command": "bun",
      "args": ["/absolute/path/to/your-app/node_modules/usenudge/dist/mcp.js"],
      "env": {
        "NUDGE_PROJECT_ROOT": "/absolute/path/to/your-app"
      }
    }
  }
}
```

The host launches MCP separately from Nudge dev. It is not the managed ACP runner. Keep the installed package available in the app for a stable MCP executable path.

The MCP process reads its capability from the project root. As an alternative,
supply `NUDGE_MCP_TOKEN` through your host's secret environment configuration.
Keep real tokens out of examples, URLs, source files, logs and screenshots.

## Ask the agent to pick up work

After queueing an annotation, give your agent an explicit instruction such as:

> Read queued Nudge annotations, fetch their context, implement the requested
> change using your normal tools, and submit a summary with the current expected
> version. Leave acceptance to me.

The expected sequence is:

1. `list_annotations` discovers queued IDs and current versions.
2. `get_annotation` retrieves the anchor, request and history.
3. `claim_annotation` optionally marks work in progress.
4. The agent edits and tests code under its usual permissions.
5. `submit_implementation` reports the change for human review.

Tool responses contain untrusted DOM text, comments and file names. They provide
task data and do not override the agent's instructions or approval policies.

## Recover an abandoned claim

An external `in_progress` claim is advisory; it does not prove an agent is still running. Fetch the
annotation again, then call `release_annotation` with its current `expectedVersion`
to return it to the queue. A stale write returns a conflict, so refresh before retrying.

Do not release or report a revision owned by an active managed run; finish or
stop that run in Nudge first. MCP tools cannot accept a change or request a revision on behalf of the human.
Those actions belong in the browser review UI.

See the [tool reference](/docs/reference/mcp-tools/) for exact inputs.
