# 08 — Architecture decision log

Keep this updated when an implementation decision materially affects the product or public contracts.

## Accepted defaults

- **D-001 Local-first:** SQLite bridge on loopback, no backend SaaS or login for MVP.
- **D-002 Agent-agnostic:** MCP stdio server; agent owns editing and approvals.
- **D-003 No pretend push:** browser queues feedback; MCP client pulls. Auto-send is later and requires agent-specific adapter.
- **D-004 Vanilla overlay:** TypeScript + Shadow DOM; React is only a wrapper/demo dependency.
- **D-005 Closure:** agent reports implementation; human accepts or requests changes.
- **D-006 Snapshots:** best-effort element captures with explicit unavailable state; no guaranteed full-page screenshot.
- **D-007 DOM source context:** best-effort selectors, no guaranteed file/line mapping initially.
- **D-008 Toolchain (updated by D-017):** Bun, strict TS, Fastify, built-in SQLite, Vite React demo, Bun test runner, Playwright.
- **D-009 Product identity:** Nudge is the chosen product name; `usenudge` is the proposed CLI/npm namespace, `usenudge.live` is the selected domain candidate. None implies trademark clearance or verified account, package, GitHub organization, or domain ownership.
- **D-010 Independent implementation:** don't copy licensed competitor source or clone its exact UX/artwork.
- **D-012 Package conventions:** internal package names should use `@usenudge/*` and the intended unscoped CLI `usenudge`, subject to registry ownership; no external publication during MVP. Local state directory `.nudge/`; environment variables begin `NUDGE_`.
- **D-011 Security:** loopback, restricted origins, separate browser and MCP capabilities, redaction and no code execution.

## Choices the implementing agent may resolve

- Specific CSS primitives in Shadow DOM (plain CSS preferred).
- UUID package vs `crypto.randomUUID` in suitable Node/browser environment.
- SSE transport approach with authenticated fetch stream vs short-lived event ticket.
- Package builds (`tsup` / Vite library) and dev process runner.
- Snapshot mime/quality and max dimensions (document concrete limits).
- Where a developer finds their generated browser token, without leaking it to production bundles.

Record decisions here when selected, with date and rationale.

## Implementation decisions

### D-013 Local bootstrap and build (2026-11-14)

The esbuild choice below was superseded by Bun.build in D-017; the credential and production-gating decisions remain accepted.

Accepted: workspace exports point at TypeScript source during local development; esbuild produces ESM artifacts and root TypeScript checks all source. These private packages are not publishable distributions yet. The dev runner provisions credentials before starting Vite and binds the bridge to IPv4 loopback. Vite reads only the browser capability, and only during dev; the MCP process independently loads the MCP capability from the configured project root or environment. No credential is printed or embedded during a production build.

### D-014 MCP SDK generation (2026-11-14)

Accepted: pin the official `@modelcontextprotocol/server` 2.4.0 package. Its cached declarations were inspected for `McpServer.registerTool` with Zod object schemas and `serveStdio(factory)`; these replace older SDK import examples without changing Nudge tool IDs or payload semantics. References: [official v2 SDK](https://ts.sdk.modelcontextprotocol.io/v2/) and [server guide](https://ts.sdk.modelcontextprotocol.io/v2/get-started/first-server). Installation and real stdio invocation remain pending environment recovery; a subprocess integration test is provided.

### D-015 Conservative identity and current capture gap (2026-11-14)

The interim capture gap below was resolved by D-018; the conservative anchor policy remains in force.

Accepted: retain bounded CSS paths as useful agent context, but only stable test IDs / IDs qualify for `findAnchor` matches. Positional paths cannot establish identity after edits and return missing. Missing/duplicate anchors require manual recovery in the future capture workflow.

Phase 3 capture is **not implemented** in this session. Review displays Comparison unavailable, retains the agent summary and permits human review. This is an interim functional slice, not fulfillment of the snapshot acceptance criteria. Initial opt-in capture, secure image upload/storage, retries and per-revision evidence ownership remain on the checklist.

### D-016 Bootstrap validation limitation (2026-11-14)

Historical initial-session limitation; Node/pnpm and Vitest are no longer prerequisites after D-017. Registry access remains blocked.

Node and pnpm are not available on PATH; outbound Node/npm downloads fail. Bun is available, but its global cache is not writable in this sandbox, and a workspace-local offline cache has no manifests. No dependency lockfile can be honestly generated here. CI temporarily installs with `--no-frozen-lockfile`; after the first successful `pnpm install`, commit the generated lockfile and restore `--frozen-lockfile`. Native contract tests can run through Bun without third-party dependencies; they do not substitute for Vitest/Playwright or TypeScript validation.

### D-017 Bun toolchain and runtime (2026-11-14)

Accepted at the user's explicit request to use Bun instead of pnpm. The root package declares Bun 1.4.4 and `workspaces`; remove the pnpm workspace file. All local commands, CI and MCP process launchers use Bun directly, without a Node executable or tsx loader. Bun.build replaces esbuild; the unit suites use `bun:test` with explicit JSDOM lifecycle helpers. Playwright remains the browser runner and TypeScript remains the strict type checker. `bun run test` excludes the separate E2E suite.

Use built-in `bun:sqlite` in place of the native better-sqlite3 dependency. Preserve the SQLite file location/schema, WAL, immediate transactions, optimistic versions and all external HTTP/MCP payloads. Use cached `query()` statements and explicitly close the database so Windows file handles are released. Real file persistence/reopening and transaction rollback passed on Bun 1.4.4. References: [Bun workspaces](https://bun.sh/docs/pm/workspaces), [SQLite and statement lifecycle](https://bun.sh/docs/runtime/sqlite).

The install cache is project-local and ignored (`.tools/bun-cache`). A real `bun install` now reaches dependency resolution but fails with registry `ConnectionRefused`; no `bun.lock` was generated. CI temporarily runs `bun install`; after the first successful install, commit the generated lockfile and enable `--frozen-lockfile`. Do not mark the full application validated based on dependency-free tests or externalized syntax builds.

## Capture implementation

### D-018 Validated capture/review slice (2026-11-14)

The user installed dependencies and `html-to-image` 1.11.13; installed APIs were inspected. Optional capture lazy-loads the library, excludes form/private nodes, rejects remote/resource-bearing regions before rendering, skips font downloads and caps canvas dimensions. A saved before reference is the consent signal for best-effort automatic after capture. Missing/ambiguous anchors produce explicit errors; user reselect is labeled manual. Request changes attempts a new baseline while preserving prior revisions and images.

The demo uses native controls and plain CSS. This follows the UX specification's optional shadcn guidance and keeps the working slice independent of additional styling dependencies.

Images use strict PNG-only validation (2 MiB, 2048×2048, 8-bit RGB/RGBA, non-interlaced, bounded decompression and CRC checks). Restricting the accepted canvas format avoids adding a native decoder and rejects text/EXIF metadata and unsupported images. SQLite schema v2 adds project-scoped immutable snapshot metadata; migration preserves v1 annotations and fails closed for newer schemas. Image filenames, dimensions and timestamps are server-controlled. Upload authority and version/status/revision checks are enforced in the bridge.

Playwright's shell-managed web-server teardown hung under Bun/Windows after passing tests. Tests now own Vite/Fastify servers in global setup and close them directly. Ports 5174/4748 and `.nudge/e2e` isolate browser tests from the normal demo. Installed Windows Chrome is a fallback when bundled Chromium is absent; CI downloads Chromium normally. CI now freezes the real Bun lockfile. Browser tests demonstrate the happy path, two-revision immutable evidence, unavailable capture, missing/ambiguous recovery and inert text; this does not substitute for human visual approval or Firefox/Safari checks.

## Remaining architecture risks

- Browser token is readable by scripts on the trusted dev origin; origin allowlist and loopback do not provide a full compromise boundary.
- `html-to-image` cannot guarantee accurate capture for all DOM/CSS/iframe/canvas content.
- Multi-instance MCP agent processes could claim same task; version-based conflict checking is required.
- Source mapping across frameworks has different tooling and cannot be promised generically.
- A local coding agent may not support MCP or may not fetch tools automatically; provide explicit prompts/manual path.
- Reviews are human-confirmed; screenshot differences alone do not prove intended outcomes.

## ADR template

```text
D-### Title (YYYY-MM-DD)
Status: Accepted / Superseded / Proposed
Context:
Decision:
Alternatives:
Consequences:
```
