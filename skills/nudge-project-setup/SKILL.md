---
name: nudge-project-setup
description: Set up Nudge in an existing Vite or Astro app with local development-only injection, configure ACP agents, and keep Nudge runtime state out of commits.
---

# Set up Nudge in an existing app

Nudge adds pinned requests and coding-agent review to the user's running app.
Inspect the project root, installed Vite or Astro, package manager, dev config and
existing agent preferences. Bun 1.4.4+ and a standalone local HTTP app are required.
Preserve the app's source, scripts, production build and unrelated settings.

## Install and run

Install an available `usenudge` release as a dev dependency with the project's
package manager. Before publication use a supplied `usenudge.tgz` archive; do not
invent registry availability. After publication the preview uses `usenudge@preview`.
An installed package is independent of Nudge's source repository.

From the app root:

```sh
bunx --bun usenudge init --agent codex
bunx --bun usenudge dev
```

Choose `claude` or `opencode` when requested. Default local setup writes only
ignored `.nudge/` state. `usenudge dev` loads the app's existing framework config and
injects the overlay at runtime. The normal dev command remains unchanged and
does not load Nudge. Do not import Nudge into app components or entry points.
Do not add a demo, mount component or token-bearing config to the app.

For Vite apps, `init --integrate` explicitly opts into a persistent
dev-script/config change. Use the default local setup for Astro.
Use it only when the user wants the normal dev command to include Nudge. Review
the dev dependency, lockfile, dev script and portable generated wrapper together;
the wrapper must be available after a clean clone. Keep production scripts intact.

Managed setup installs Codex/Claude ACP adapters inside ignored local state.
OpenCode needs its own CLI with ACP support. Native subscription sign-in and API
credentials are different billing choices; preserve the user's provider setup.
Never copy or display credentials. `--skip-agent` skips setup and preserves an
existing choice; `--external --agent codex` selects optional external MCP instead.

## Verify and review changes

Run `bunx --bun usenudge doctor` while Nudge dev is running. Submit a small real
request, observe progress/required approvals and inspect the app before accepting.
Fresh sessions are the default; continuation is explicit. Stop does not undo edits.
Fixture tests and sign-in hints do not prove a live provider can edit.

Before an already-authorized commit, inspect the diff and staged filenames.
Keep `.nudge/`, credentials, downloaded adapters and snapshots out of commits.
Default local setup should not introduce Nudge imports in application source or
change normal dev/build scripts. Package/lockfile changes from installing a dev
dependency are expected; preserve intentional shared installation when requested.
Do not use blanket restores, clean commands, auto-staging or automatic Git writes
to hide setup changes. If accidental integration is mixed with user edits, adjust
only the Nudge-owned changes you can identify safely and report the remainder.

Remove a local installation by stopping Nudge and removing its dev dependency if
desired. No application-source cleanup is needed. Retain `.nudge/` for history or
delete it only when the user explicitly wants local data removed.
