---
title: Getting started
description: Install Nudge in your existing Vite or Astro app and request your first UI change.
---

Nudge runs on **your existing project**. Install the development dependency,
configure an agent and start the app through Nudge. No demo, mount component or
application-source edits are required.

> **Unpublished preview:** Use a built `usenudge.tgz` archive until the first npm
> release. Provider tests use fixtures; live authenticated validation remains open.

## Requirements

- **Bun 1.4.4+**, even if your app uses another package manager.
- An existing standalone local HTTP **Vite** app (including React + Vite) or **Astro** app with installed dependencies. Astro support is tested with Astro 7.4.
- An ESM config (`.ts`, `.mts`, `.js`, `.mjs`), or no config file.
- A supported agent with native authentication; registry access for new adapters.

Linux is the primary target; live-provider/Linux validation remains open. HTTPS,
CommonJS Vite configs and middleware servers are unsupported. Nudge dev loads your framework's
config rather than running arbitrary dev-script pipelines.

Next.js support is coming soon; it is not supported by the current preview.

## Install in your app

From the app root:

```sh
bun add -d /absolute/path/to/usenudge.tgz
```

To build the archive locally, run `bun install` and `bun run package:release` in
the Nudge repo once. Install `dist/usenudge.tgz`; your app then runs independently
of the checkout. Repeat `bun add -d <archive>` to refresh a rebuilt preview.

After publication, replace the install line with `bun add -d usenudge@preview`.
Do not assume that release exists yet.

## Configure your agent

```sh
bunx --bun usenudge init
```

Choose `claude` or `opencode` if preferred. Setup installs Codex/Claude ACP
adapters in `.nudge/agents/`; OpenCode needs its CLI with ACP support. Complete
[native sign-in](/docs/agents/) separately. Subscription login and API billing differ.

`init --skip-agent` preserves an existing choice. Use `init --external --agent codex`
or Claude for an external agent terminal/IDE.

## Start Nudge dev

```sh
bunx --bun usenudge dev
```

Open the printed URL. Nudge loads your app config, injects the overlay at runtime
and starts the bridge/runner. No manual tokens or separate bridge terminal are
needed. `--port 5175` selects a port; `--project /path/to/app` selects a project.

Setup writes only self-ignored `.nudge/` state. App source, config, normal dev
script and production build stay untouched. Your usual `bun run dev` runs without
Nudge. Installing the dev dependency changes manifest/lockfile normally.

## Make your first request

1. Open **Agent setup** and check the adapter/runner. Unknown sign-in is **Not verified**.
2. Choose **Annotate UI**, select an element and describe the change.
3. Keep **New session** unless explicitly continuing a compatible session.
4. Choose **Run agent** and answer supported questions or approvals.
5. Inspect the app, then **Accept** or add a follow-up and **Request changes**.

Comments stay pinned and survive refresh. **Feedback** includes missing elements.
**Save without running** keeps requests while setup is incomplete. Snapshots are
optional; completion always needs your review.

While Nudge dev runs, check it from another terminal in your app:

```sh
bunx --bun usenudge doctor
```

This checks authorization/storage rather than model access.

## Optional persistent integration

Vite users can opt in to including Nudge in the normal dev command:

```sh
bunx --bun usenudge init --integrate --agent codex
bun run dev
```

This requires a direct `vite` dev script. It preserves the original config, adds
`vite.nudge.config.ts` and updates the dev script. Commit the portable wrapper
with dependency/script changes so a clean clone works. Production still omits
Nudge. Avoid committing absolute source-checkout imports.

## Ask your coding agent to set up Nudge

Install the [setup skill](/skills/nudge-project-setup/SKILL.md):

```sh
bunx skills add https://github.com/styltsou/nudge --skill nudge-project-setup
```

It covers local/persistent setup and staged-change review without committing
Nudge state or rewriting user edits. This command needs the changes pushed.

## Remove Nudge

For local mode, stop Nudge and optionally remove its dev dependency; no app-source
cleanup is needed. For persistent integration, restore the dev script and remove
the wrapper. Remove any external MCP registration you added. Keep `.nudge/` for
history or deliberately [remove local data](/docs/privacy/#remove-local-data).
