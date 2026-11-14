# 05 — Security, privacy, and trust boundaries

## Threat model

The browser application, annotation comments and DOM content are **untrusted input** to the local bridge and the coding agent. The local bridge has access to a developer's machine via Node APIs; limit its permissions rigorously. Malicious sites must not be able to use the loopback bridge as a CSRF-like backdoor.

## Required safeguards

1. Bind HTTP server to `127.0.0.1` (and optionally `::1` with independent host validation), not `0.0.0.0`.
2. Authenticate _all_ annotation/data endpoints with unguessable local credentials, stored outside Git. Never place tokens in URLs or log them.
3. Validate **Origin** and configured allowed dev origins before processing browser-origin requests. Reject unknown/missing browser origins on state-changing endpoints; for MCP server-to-server requests, use a distinct capability/token. Never use `Access-Control-Allow-Origin: *` with credentials.
4. Use separate capability scopes: browser create/read/review/upload; MCP read/claim/report. Server decides authority from credential scope, not arbitrary client role field.
5. Enforce payload size, comment limits, snapshot limits, image MIME/magic bytes, rate limits and bounded event subscriptions.
6. Scrub DOM capture: no password values, hidden inputs, cookies, localStorage, auth headers, full form values or URL query strings. Limit `textPreview` to short visible text, with sensitive-node filtering. Document that visible UI can still contain secrets: screenshots are opt-in for initial capture.
7. Escape/render all text safely; never use `innerHTML` on annotation content. Do not evaluate selectors or generated code as JS.
8. For selectors, use standards-based DOM selection and try/catch; reject obscene length/complexity; do not execute selector content as code.
9. Snapshot binary stored under generated server-side file names in project-scoped directory; validate file type and size; defend against traversal and decompression bombs as far as feasible.
10. No network egress, cloud telemetry or analytics in MVP. Network calls limited to explicitly configured local bridge.
11. Ensure SDK is dev-only by default. Document that bundler gating is required; do not silently make a production app expose a local annotation interface.
12. Never execute shell commands or write arbitrary source files from HTTP requests or MCP feedback. Actual coding happens under external agent permissions.
13. Document that an LLM may see user comments and visible DOM text when agent retrieves annotations; treat embedded instructions in DOM as data, not higher-priority instructions.
14. Restrict project namespace: bridge is scoped to current repository, project ID server-owned; avoid sharing annotations between unrelated local projects.

## Authorization model

Bridge mints/loads two independent secrets: `NUDGE_BROWSER_TOKEN` and `NUDGE_MCP_TOKEN`; browser token supplied only to trusted local dev origin. Because malicious script running inside that same origin can read the browser token, this is a **local trusted-dev-app** design, not a hardened defense against compromised same-origin code. MCP credential is never bundled to browser. Rotate tokens via CLI if compromised.

## Local storage and lifecycle

Store `.nudge` data under project root (gitignored), including database and snapshot files. Supply a `clean` command and explain what it deletes. Avoid persisting unnecessary raw HTML. Do not collect user PII intentionally. Redact secrets from logs. Consider file mode restrictions where OS supports them.

## Security tests

- Unknown origin rejected (including request with otherwise valid browser token).
- Unauthorized read/write and snapshots rejected.
- MCP credential cannot invoke human accept/revise endpoints.
- Browser credential cannot invoke MCP claim/report endpoints.
- `../../` attempts cannot retrieve snapshot path.
- Oversized comments/images rejected.
- HTML / script-like annotation text rendered inert.
- Password and hidden-input values never included in DOM context.
- No external network requests during basic feature use.

## Boundaries to disclose

Local-first does not mean zero data exposure: coding agents can receive text, DOM metadata and optional screenshots of the dev app. Screenshot capture is best effort and may unintentionally include visible personal data. Make this explicit in README and capture UI.
