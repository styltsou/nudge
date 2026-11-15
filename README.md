# Nudge

**Ask for UI changes right where you see them.**

Select an element in your running app, leave a pinned request and start Codex,
Claude or OpenCode from the browser. Follow progress, answer supported approvals
or questions, then inspect the app and accept or ask for another pass. Every prompt
starts a fresh session by default; continuing a compatible session is explicit.

> **Unpublished preview.** Installed-package and provider-fixture tests cover the
> workflow. Real ACP downloads and authenticated edits still need validation.
> Nothing is on npm yet. Use a built archive until the first release.

## Install in your project

Requires **Bun 1.4.4+**, an existing standalone local HTTP Vite app, installed app
dependencies and an ESM config (or no config file). No demo app is required.

From your app root:

```sh
bun add -d /absolute/path/to/usenudge.tgz
bunx --bun usenudge init --agent codex
bunx --bun usenudge dev
```

Choose `claude` or `opencode` if preferred. Complete native agent sign-in.
Codex/Claude setup downloads ACP adapters into ignored state; OpenCode needs its
CLI with ACP support. Subscription sign-in and API billing are different choices.

After publication, install with `bun add -d usenudge@preview`. To build an archive
now, run `bun install` and `bun run package:release` in this repository once.
Install `dist/usenudge.tgz` in your app; it runs independently of the source
checkout. Repeat `bun add -d <archive>` to refresh a rebuilt preview.

Open the printed URL, check **Agent setup**, choose **Annotate UI** and select an
element. Describe a change and choose **Run agent**. Inspect the actual app before
**Accept** or **Request changes**. Stop does not undo edits.

## Development only, outside application code

`usenudge dev` loads the app's Vite config and injects Nudge at runtime.
Default `init` writes only self-ignored `.nudge/` state. No component imports,
mount calls, wrapper or changes to normal dev/build scripts are needed. Your
usual `bun run dev` runs without Nudge. Production builds omit it. Installing a
dev dependency changes the manifest and lockfile normally.

To deliberately include Nudge in the normal dev command, opt in:

```sh
bunx --bun usenudge init --integrate --agent codex
bun run dev
```

This creates a portable dev-config wrapper and updates the dev script. Commit
that wrapper with the dependency/script changes so a clean clone works. Never
commit `.nudge/`, credentials, snapshots or downloaded adapters. The
[setup skill](skills/nudge-project-setup/SKILL.md) covers setup and staged-change
review without automatic Git writes or blanket cleanup.

## Review, setup and privacy

Comments stay pinned and survive reload. **Feedback** includes missing elements.
Snapshots are optional under **View comparison**. Missing or ambiguous anchors
show unavailable evidence. Completion and screenshots never prove visual
correctness: human review closes the loop.

**Agent setup** shows adapter, runner and sign-in hints. Unknown or stale checks
are **Not verified**; **Save without running** keeps requests for later.
`init --skip-agent` preserves an existing choice. `init --external --agent codex`
(or Claude) selects external MCP: **Queue for agent** then saves a request for an
existing host to fetch rather than launching a run.

The loopback bridge separates browser/MCP/runner capabilities. The browser and
bridge never execute annotations as shell commands. A separate runner supervises
the configured agent under its real permissions. Cloud-backed agents may send
project/request context to their provider. Mark sensitive regions with
`data-nudge-private`. See [privacy](apps/website/src/content/docs/docs/privacy.md),
[agents](apps/website/src/content/docs/docs/agents.md) and
[external MCP](apps/website/src/content/docs/docs/mcp-setup.md).

While Nudge dev runs, check the bridge from another app terminal:

```sh
bunx --bun usenudge doctor
```

## Build and release

This repository contains Nudge packages and the website, with no demo app.
Browser tests create temporary consumer fixtures and install the actual archive.

```sh
bun install
bun run build
bun run test
bun run test:e2e
bun run package:release
bun run package:check
```

Release metadata is in `package.release.json`. See [release instructions](docs/RELEASING.md)
for checks, ownership, first publication and the manual trusted-publishing workflow.
The root and internal workspaces stay private. No install hook rewrites an app.

`bun run dev` now starts the **website** at http://localhost:4321. Contributor
contracts are in [AGENTS.md](AGENTS.md) and [docs](docs/01-PRODUCT.md).
See [the checklist](tasks/IMPLEMENTATION.md) and [session log](tasks/SESSION-LOG.md)
for actual results and open live-provider/Linux checks.

MIT license. Bundled dependency texts/attributions ship in `THIRD_PARTY_NOTICES.md`.
