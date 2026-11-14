# 07 — Implementation roadmap

Ship in vertical slices; each phase should leave the repo runnable. Don't overbuild abstractions before the main loop works.

## Phase 0 — Skeleton and contracts

- Monorepo scaffolding, toolchain, workspace scripts, lint/typecheck/tests.
- Shared validated types and state machine pure functions.
- Demo page and bridge stub with health route.
- Short README quick start, gitignore, CI starter.

**Gate:** `bun install`, `bun run dev`, `bun run build`, `bun run typecheck`, `bun run test` succeed; demo and bridge run.

## Phase 1 — Annotation to durable queue

- Framework-neutral overlay toggle, highlight, selection composer, DOM metadata.
- Secure bridge auth/origin rules and SQLite persistence.
- Create/list/get annotation API, local per-project storage.
- React wrapper and demo integration.

**Gate:** developer annotates, queues, reloads and sees persisted annotation; app functions normally after overlay disabled.

## Phase 2 — MCP and implementation tracking

- MCP stdio server with list/get/claim/release/submit tools.
- Bridge endpoints and state transitions, revision/version logic.
- SSE updates, status tray, auth scope enforcement.
- Verified agent registration instructions + tool smoke test.

**Gate:** agent fetches real annotation and reports implementation; browser shows **Ready for review**; no automatic-send claim.

## Phase 3 — Review loop / differentiated MVP

- Best-effort initial before screenshot and post-implementation after screenshot.
- Safe re-anchor handling, upload/serve snapshot files.
- Before/after UI with honest capture status, accept/request changes/history.
- End-to-end tests and demo video/GIF ready.

**Gate:** end-to-end review journey passes without manually editing database; missing screenshots fail gracefully.

## Phase 4 — Showcase polish

- CLI `init`/`doctor` for Vite React app; optional keyboard shortcut.
- DX-focused README, docs, screenshots, architecture diagram, demo GIF.
- Error states, accessibility, responsive behavior and security hardening.
- Changelog, package metadata, release guide.

**Gate:** a fresh Vite React repo can integrate via documented steps; another developer can reproduce the demo without privileged context.

## Later, only after MVP validated

1. **Source-aware mapping** via dev-only Vite transform (accurate file/line where feasible).
2. **Framework adapters** Vue, Astro, Svelte; zero-install script injection / proxy.
3. **Bug reproduction**: clicks, console errors, network traces with strict redaction.
4. **Session-aware agent adapters** for verified auto-send into named agent sessions (explicit opt-in, avoid arbitrary agent invocation).
5. **Git-aware review** file diff links and branching metadata; never let overlay directly commit code.
6. **Collaborative feedback** optional hosted sync, access controls and retention.

## Why this order

The competitive feature is the review loop; invest in that before universal framework integration or elaborate AI features. Each later phase should be justified by actual use of the local workflow.
