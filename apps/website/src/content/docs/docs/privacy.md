---
title: Privacy and security
description: What Nudge stores, what an agent can read, and the local development trust boundary.
---

## What stays in the project

The bridge stores annotations and revisions in `.nudge/data.sqlite`. Optional images
live in `.nudge/snapshots/`; project capabilities live in `.nudge/credentials.json`.
The entire directory is gitignored. Nudge has no hosted account, telemetry or
cloud synchronization service.

The public website and documentation are a separate static app. They do not
connect to your bridge or load its credentials. The homepage walkthrough uses
sample data and does not modify real annotations.

## What an agent can receive

In managed mode, Nudge sends the selected request, DOM anchor and intentionally
assembled revision context to a local coding agent through ACP. That agent can
read and edit project files under its own permissions and send context to its
model provider. Optional external MCP hosts can fetch comments, metadata and
history too. Screenshot bytes are not returned by default in MCP annotation
responses. Local-first storage does not imply offline model inference.

Treat comments and DOM text as untrusted input. Embedded instructions in a page do
not outrank your coding agent's system instructions or approval policies.

## Redaction and visible information

Nudge excludes form values, private/editable/hidden content, URL credentials,
query strings and fragments from DOM context. Text previews are bounded and scrub
recognizable email/token-like strings. Mark sensitive regions explicitly:

```html
<section data-nudge-private>Sensitive development content</section>
```

Visible content can still contain secrets. Review the selected region before
opting into screenshots. Redaction is a safeguard, not a guarantee that every
sensitive value will be recognized.

## Local capability boundary

The bridge binds to IPv4 loopback by default and checks the host and exact allowed
browser origin. Browser, MCP and runner capabilities are independent:

- **Browser:** read, create, capture, accept and request changes from an allowed dev origin.
- **MCP:** read, claim, release and report implementations without a browser Origin header.
- **Runner:** claim managed jobs and report bounded activity/results over a dedicated local channel. This capability and each run's lease are never sent to the browser.

The browser capability is observable to scripts on your trusted development
origin. This design does not protect against compromised same-origin code. Never
put the MCP capability in the browser, tokens in URLs, or credential files in Git.

## Agent execution and sign-in

The bridge and overlay do not execute code, shell commands or Git operations from
feedback. A separate runner starts the configured ACP agent process. That agent
can execute commands and edit files under its native permissions; supported
approvals and questions appear in Nudge. Unknown requests fail closed. Selectors
use constrained DOM lookup, and comments/file paths are displayed as text.

The agent owns sign-in and billing. Choose its supported subscription login if
you want plan-backed usage; API-key configuration may select API billing instead.
Nudge does not copy subscription tokens into its database or browser.
Codex/Claude adapter downloads require registry access and live in ignored
`.nudge/agents/`, separate from your app's packages.

## Remove local data

Stop Nudge, then run:

```sh
bunx --bun usenudge clean --confirm
```

This deletes the default `.nudge/` directory, including annotations, credentials and
images, agent selection and downloaded ACP adapters. In the source repository,
use `bun run state:clean --confirm`. The next startup provisions new capabilities;
rerun agent setup to enable managed mode again. The command refuses linked
or custom state directories; manage those manually. To rotate a compromised
capability without deleting annotations, stop the processes, remove the local
credential file, then restart and reconfigure the MCP host.
