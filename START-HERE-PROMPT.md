# Continue work on Nudge

Read `AGENTS.md`, `README.md`, the linked contributor contracts in `docs/`,
`tasks/IMPLEMENTATION.md`, and the latest entry in `tasks/SESSION-LOG.md` before
editing. Inspect the existing implementation; do not restart completed phases.

Nudge lets a developer select an element in a running app, leave a pinned request,
run their coding agent, and review the actual change in the same browser. Human
acceptance closes the loop. Optional snapshots support review; they do not prove
visual correctness.

Managed agent sessions use a separate local runner and a common ACP connection
for Codex, Claude and OpenCode. Nudge setup manages Codex/Claude adapters in ignored
`.nudge/agents/`; apps do not need a Claude SDK dependency. Adapters own their
native authentication, model, tools, permissions and billing. Native subscription
sign-in and API-key billing are different choices; do not copy credentials or
promise subscription coverage without checking the provider's supported flow.

Each prompt, including follow-ups, defaults to a fresh session. Explicit reuse
must select a compatible session in the same project. Keep annotation revisions,
runs and sessions separate. Preserve prior evidence and human-only acceptance.

The annotation/review loop, durable run/session lifecycle, ACP client and browser
controls are implemented with deterministic process/browser coverage. Real adapter
installation and live authenticated edits remain open validation gates. The
development sandbox could not reach the adapter registry or access some provider
profile state. Fixture tests and bridge health are not proof of live agent editing.

Work on the earliest relevant incomplete task, prioritizing live ACP validation
over showcase polish. Implement working vertical slices and update the checklist.
Use Bun and portable Linux/Windows scripts. There is no demo app: install the archive in an existing Vite project. Default init writes only ignored .nudge state; usenudge dev injects at runtime. Persistent dev-script/config changes require --integrate. Root dev starts the website. See docs/RELEASING.md for packaging; never publish as a validation step. The overlay remains framework-neutral,
development-only and isolated in Shadow DOM. Keep bridge execution on loopback,
validate exact origins and separate browser/MCP/runner capabilities. The browser
and bridge never execute arbitrary shell commands from annotations.

Optional external MCP mode is a separate workflow: users queue a request, then
ask an existing agent terminal/IDE to fetch it. A saved queue record is not a
dispatched run. Keep mode-specific labels and documentation truthful.

Run the validation appropriate to the change and report actual results. Update
`tasks/SESSION-LOG.md` with changes, checks, limitations and next steps. Do not
publish packages or create external resources without explicit authorization.
