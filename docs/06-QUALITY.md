# 06 — Quality gates and test plan

## Definition of done for MVP

A developer can run `bun run dev`, annotate an element in the demo, reload without losing the request, retrieve it from a registered MCP server, report implementation, see ready-for-review status update in the browser, review original and updated element snapshots (or explicit unavailable state), and accept or request changes. All documented checks run; failed tests are fixed or accurately reported.

## Automated tests

### Unit (Bun test runner; JSDOM for browser lifecycle tests)

- Anchor serialization, selector priority (`data-testid` > stable IDs > constrained CSS path), escaping and text redaction.
- Element lookup returns `found`, `missing` or `ambiguous`; no guessing.
- State transitions and revision numbering; invalid transitions fail.
- Zod validation, limits, safe URL serialization, special characters.
- Scope permission checks for browser vs MCP credentials.
- API client handles network errors and event reconnect.

### Integration (HTTP + real test SQLite)

- Create/list/get persist after repository reinitialization.
- Agent claim/release/report transitions and version conflicts.
- Browser accept/request-changes authorization boundaries.
- Snapshot upload/retrieval, bad MIME, oversize and traversal rejection.
- SSE emits events and reconnecting clients refetch state.
- Unknown Origin / no auth / incorrect credential scope denied.

### End-to-end (Playwright against demo)

1. App loads with a single toggle and annotation mode off; normal controls click normally.
2. Enable annotation mode, hover card, see correct highlight, select without firing card action.
3. Enter comment, queue; see **Queued for agent** and exact comment in tray.
4. Reload; annotation remains.
5. Through authenticated API or MCP test harness, claim and submit implementation.
6. UI updates to **Ready for review** without reload (SSE).
7. Review shows capture evidence when possible, otherwise honest **Comparison unavailable**.
8. Accept → accepted.
9. Separate annotation → agent submit → request changes → new revision queued; revision history visible.
10. Hover over Nudge controls never selects the overlay itself.
11. On disable/unmount, underlying page events and browser memory/listeners restored.
12. Keyboard navigation and Escape work.

### Manual cross-checks

Automated local verification currently covers 65 unit/integration tests and six installed-Chrome browser scenarios. Browser setup owns isolated Vite/Fastify instances, with direct teardown on Bun/Windows. Bundled Chromium remains the CI browser. See the session log for exact outcomes; automated execution and a captured screenshot do not count as developer manual acceptance of a real annotation.

- Light/dark app theme contrast.
- Scrolling and responsive width changes.
- React Strict Mode double mount/unmount.
- Screenshot failure on cross-origin assets.
- Bridge process unavailable and recovered.
- Browser console has no duplicate event warnings.
- Chrome/Firefox/Safari smoke tests when practical (Chromium is CI gate).

## Repository tooling

- `bun run typecheck` across packages, TS strict (no casual `any`).
- `bun run lint` Oxlint enforced.
- `bun run test` unit/integration.
- `bun run test:e2e` Playwright Chromium and small seeded demo.
- `bun run build` all packages + demo.
- `bun run format:check` if formatter selected.

## CI

On PRs: install with frozen lockfile, typecheck, lint, test, build and e2e. Cache dependencies, upload Playwright traces for failures. Avoid tests requiring user API keys or external services.

## Practical acceptance considerations

- Do not assert pixel-perfect screenshots in environments with different font rendering; test presence, dimensions and state transitions, and use consistent rendering where needed.
- Measure overlay impact in demo informally (no excessive pointer handlers or layout thrashing); document known limits.
- Prefer realistic E2E scenarios over snapshots of the UI alone.
- Release only after local end-to-end test manually demonstrated.
