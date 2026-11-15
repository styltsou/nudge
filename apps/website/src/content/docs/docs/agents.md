---
title: Connect your agent
description: Run Codex, Claude or OpenCode from Nudge using ACP and your agent's own authentication.
---

Connect an agent once, then submit requests, follow progress and review changes
from Nudge. You do not need a separate agent terminal to dispatch each request.

**This is a preview.** All three providers have deterministic ACP process/browser
coverage. Real adapter installation and live authenticated edits still need
validation; do not treat fixture tests as proof that every installed version works.

## Choose an agent

Open **Agent setup** in the browser toolbar. It lists Codex, Claude and OpenCode
with their CLI, adapter and sign-in status. Select an agent and choose **Use**
to switch to it; Nudge installs its pinned ACP adapter in ignored `.nudge/`
state. Choose **Sign in with Codex/Claude** to run that CLI's own login: the CLI
opens its sign-in page (a link appears if you need to open it yourself), and
Nudge never sees your password or token. OpenCode has no in-browser sign-in; run
`opencode auth login` in a terminal. Switching is blocked while a request runs.

You can still use the command line instead: copy the setup command, run it once
in the project root, then restart dev. The panel distinguishes bridge connectivity, selected agent, installed ACP
adapter, background runner, native CLI sign-in and detected billing mode.

Use **Check again** after setup or sign-in. Native sign-in checks update every
30 seconds while the runner is idle; stale or unsupported checks stay **Not
verified**. These are local readiness hints, not proof of live model access.
The model comes from your agent's own configuration.

After [installing Nudge](/docs/getting-started/) in your app, run one of:

```sh
bunx --bun usenudge agents --agent codex --managed
bunx --bun usenudge agents --agent claude --managed
bunx --bun usenudge agents --agent opencode --managed
```

Run only the command for the agent you want. Restart your dev server after setup
or after switching providers.

In the Nudge source repository, replace `bunx --bun usenudge` with
`bun packages/cli/src/index.ts`.

| Agent    | What Nudge starts             | What setup needs                                  |
| -------- | ----------------------------- | ------------------------------------------------- |
| Codex    | Maintained Codex ACP adapter  | Adapter on PATH, or registry access to install it |
| Claude   | Maintained Claude ACP adapter | Adapter on PATH, or registry access to install it |
| OpenCode | `opencode acp`                | An installed OpenCode CLI with ACP support        |

Codex/Claude adapters are installed under ignored `.nudge/agents/`, separately
from app dependencies. They include their underlying agent runtime dependencies.
There is no need to install the Claude Agent SDK in every app.

## Use your existing subscription

Authentication and billing belong to the agent. Use its native subscription
sign-in, for example `codex login` for ChatGPT or `claude auth login` for Claude,
when the native CLI is installed. For OpenCode, configure the provider through
OpenCode's own authentication flow.

Nudge does not collect your subscription credentials or sell model access.
API keys, environment variables, gateways and native agent configuration can
select a different billing method. An existing subscription does not make
API-key usage subscription-billed.

Anthropic's current [subscription guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
states that signed-in SDK and `claude -p` use can draw from subscription limits.
Provider terms, plan limits and integration support still apply. Nudge's preview
has not yet been validated with a live subscription-backed run.

## Why ACP?

**Agent Client Protocol (ACP)** is the structured conversation between Nudge and
the agent process. It carries session creation, prompts, activity, permission
requests and cancellation.

```text
Your app + Nudge → local runner → ACP adapter → coding agent
```

The adapter may use another interface underneath. Claude's maintained adapter
uses the Agent SDK; the Codex adapter uses app-server. Those are adapter details.
Nudge uses the same ACP connection model for all three.

ACP is distinct from **MCP**, which exposes tools to an agent. Nudge's
[optional MCP integration](/docs/mcp-setup/) lets an external agent fetch saved
requests; it does not start a managed agent session.

## Sessions and permissions

Each request and follow-up defaults to **New session**. Select an existing
compatible session explicitly to continue its conversation. The session picker
shows sessions for the selected provider in this project. Only one editing run
can be active per project.

Nudge preserves agent-native model and permission configuration. Supported
approval requests offer **Allow once** or **Deny**. Supported form questions
appear in the comment. Unsupported requests fail rather than receiving automatic
permission.

**Stop** interrupts work. It does not undo edits already made. Interrupted runs
are not automatically replayed after restart. See [review and recovery](/docs/workflow/).

## Inspect or change setup

If setup is incomplete, you can still annotate and **Save without running**.
Run controls explain missing adapter, offline runner or required sign-in states.
Opening and closing setup preserves a comment draft. Keyboard users can dismiss
setup with **Escape** and return to its toolbar button.

```sh
# Inspect native CLI version/login detection without changing configuration.
bunx --bun usenudge agents --status
```

This is a local readiness hint. Unknown status does not prove that a provider is
unavailable; it also does not prove a working model connection.

Run the chosen `agents --agent ... --managed` command again to retry setup.
To use an external Codex or Claude MCP host instead, rerun without `--managed`,
restart dev, and follow the [MCP guide](/docs/mcp-setup/).
