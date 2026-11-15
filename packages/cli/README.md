# Nudge

Ask for UI changes where you see them. Select an element in your running app,
leave a pinned request, run your coding agent and review the result in place.

Requires **Bun 1.4.4+** and an existing local HTTP Vite app with an ESM config
(or no config file). Nudge is disabled in production.

## Install

After the preview is published:

```sh
bun add -d usenudge@preview
bunx --bun usenudge init
bunx --bun usenudge dev
```

Before publication, use the release archive instead of the registry package:
`bun add -d /absolute/path/to/usenudge.tgz`, then run the same init/dev commands.
No clone, demo app, manual bridge process or token copying is required in your app.
Default setup writes only self-ignored `.nudge/` state; app source, Vite config
and normal dev/build scripts stay untouched. `usenudge dev` injects Nudge at runtime.
Use `init --integrate` only to opt into a portable dev-config/script integration.

In a terminal, `init` asks which installed agents to set up (the first runs by default), how they connect and whether to edit your Vite config, then prints the equivalent one-line command. Every choice has a flag (`--agent claude,codex`, `--external`, `--integrate`, `--yes`); scripts and CI never get prompts and auto-detect a ready agent. Setup installs maintained
Codex/Claude ACP adapters in ignored `.nudge/agents/`. OpenCode needs an installed
CLI with ACP support. Complete native agent sign-in separately; subscription
login and API-key billing are different choices. Nudge does not collect tokens.

Open **Agent setup** in the browser, then **Annotate UI**. Select an element,
describe a change and choose **Run agent**. Each request starts a new session
unless you explicitly choose an existing compatible session. Review the app and
choose **Accept** or **Request changes**. Stop does not revert edits.

Use `init --skip-agent` to configure the overlay without agent setup, preserving
any existing choice; `init --external --agent codex` selects external MCP instead.
Run `bunx --bun usenudge doctor` while dev is running to check the local bridge.

Requests and optional screenshots stay in the project's ignored `.nudge/` folder.
Cloud-backed agents can send project and request context to their provider.
Completion and screenshot comparisons are not proof of visual correctness.

This is a preview. Automated tests cover the installed workflow with fixture
agents; live authenticated providers and broader compatibility still need validation.

[Documentation and limitations](https://github.com/styltsou/nudge#readme) ·
[Issues](https://github.com/styltsou/nudge/issues) · MIT license
