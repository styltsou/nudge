# Implementation backlog — authoritative checklist

Check items **only after code and tests exist**. Work from top to bottom, but create runnable vertical slices rather than isolated scaffolding. Add links to key implementation files after they exist.

**2026-11-14 status (validated MVP slice):** Bun frozen installation, strict typecheck, lint, 65 unit/integration tests, production build, and six real browser scenarios pass. Phase 3 capture/review is implemented, including two-revision evidence and recovery from missing/ambiguous anchors. The normal demo and doctor run. Remaining human/manual, HMR/cross-browser and external-installation checks are explicitly open below. See [actual results and remaining work](SESSION-LOG.md).

## Phase 0 — setup

- [x] Initialize Bun workspace and strict TypeScript configs. ([workspace](../package.json), [config](../tsconfig.base.json))
- [x] Create packages: shared, core, react, bridge, mcp; app demo.
- [x] Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`. ([scripts](../package.json))
- [x] Configure test runners, lint/format, CI basic checks, gitignore `.nudge/`. Bun lockfile included; CI freezes it.
- [x] Implement Zod contract types and pure transition validators. ([contracts](../packages/shared/src/index.ts), [native tests](../tests/contracts/state-machine.test.ts))
- [x] Create demo dashboard with annotated card/chart and a visible normal-click control. ([demo](../apps/demo/src/main.tsx), [E2E](../tests/e2e/loop.spec.ts))
- [x] Bridge `/health` route and deterministic local state location. ([bridge](../packages/bridge/src/index.ts), [config tests](../tests/contracts/config.test.ts))
- [x] Run and log Phase 0 verification commands.

## Phase 1 — in-browser annotation + persistence

- [x] Create overlay mount/unmount API and Shadow DOM host. ([overlay](../packages/core/src/index.ts), [lifecycle tests](../packages/core/src/index.test.ts))
- [x] Implement toolbar toggle, selection mode, escape handling and click isolation.
- [x] Implement throttled hover box and scroll/resize repositioning. Hover/selection verified in the browser; additional manual layout checks remain.
- [x] Implement safe element anchors and text/value redaction. ([anchors](../packages/core/src/anchors.ts), [tests](../packages/core/src/anchors.test.ts))
- [x] Implement comment composer with validation and helpful network errors.
- [x] Implement bridge auth, scope, origin allowlist, size constraints. ([HTTP tests](../packages/bridge/src/index.test.ts))
- [x] Implement SQLite migrations/repository and create/list/get endpoints. ([repository](../packages/bridge/src/repository.ts))
- [x] Implement React wrapper gated to development build. ([wrapper](../packages/react/src/index.ts), [dev-only import](../apps/demo/src/main.tsx))
- [x] Implement annotations tray and persistence on page refresh. HTTP and browser scenarios passed.
- [x] Tests for selectors, redaction, bridge auth, persistence, duplicate mounts.
- [ ] Verify manual hover/select/queue/reload workflow. Automated browser coverage passed; developer manual sign-off remains.

## Phase 2 — agent bridge

- [x] Implement status transition endpoints with optimistic versioning.
- [x] Implement official MCP TypeScript stdio server. ([server](../packages/mcp/src/server.ts), [subprocess test](../packages/mcp/src/server.test.ts))
- [x] MCP tools: `list_annotations`, `get_annotation`.
- [x] MCP tools: `claim_annotation`, `release_annotation`, `submit_implementation`.
- [x] Implement separate browser/MCP token authorities (no trusted `actor` field).
- [x] Implement authenticated SSE state events and client reconciliation. ([client](../packages/core/src/client.ts)); real HTTP events and client reconnect tests passed.
- [x] Add copy/paste MCP setup instructions and health/doctor check. ([README](../README.md), [CLI](../packages/cli/src/index.ts))
- [x] Test real MCP tool invocation and browser status update. Real stdio subprocess plus HTTP/SSE/browser scenarios passed.

## Phase 3 — snapshots and human review

- [x] Add optional initial before capture using lazy-loaded `html-to-image`. ([capture](../packages/core/src/capture.ts))
- [x] Validate/upload/serve snapshots securely, cap dimensions and size. ([validation/store](../packages/bridge/src/snapshots.ts), [security tests](../packages/bridge/src/snapshots.test.ts))
- [x] Re-anchor on agent completion; distinguish confident/missing/ambiguous.
- [x] Capture after snapshot, with retry and unavailable states. Explicit manual reselection is labeled.
- [x] Implement side-by-side/toggle before/after evidence. Authenticated image fetch/object URLs and timestamp/integrity captions.
- [x] Implement `accept` and `request-changes` human-only actions. HTTP and browser tests passed.
- [x] Implement revisions and history with correct snapshot ownership. Original images remain immutable; new revision gets a fresh baseline.
- [x] Add E2E for full happy path and capture failures. ([browser tests](../tests/e2e/snapshots.spec.ts))
- [x] Test authorization, unsafe payloads, XSS, path traversal and malformed images.

## Phase 4 — showcase/readiness

- [ ] Improve accessibility, keyboard shortcuts, mobile/narrow viewport.
- [ ] Validate cleanup under React Strict Mode and HMR.
- [ ] Create authentic demo GIF and screenshots, after real implementation. Actual [browser screenshot](../docs/assets/review.png) exists; GIF remains.
- [ ] Produce install instructions for external Vite React project.
- [x] Add project architecture and limitations to final README.
- [x] Run all checks and document actual results, defects, and deferred work. Local checks passed; CI itself is not yet run remotely.
- [x] Ensure development-only installation and no accidental secret commits. Production assets exclude SDK/credentials; all 70 candidate files passed local credential/private-path checks. Git staging/commit itself is blocked by read-only Git metadata in this sandbox.

## Hard blockers / anti-goals

- Do not spend time on branding/domain/release marketing before the loop works.
- Do not implement agent auto-send by assuming MCP pushes messages.
- Do not implement source file/line mapping before core annotations work.
- Do not build a hosted account system or SaaS backend.
- Do not claim visual validation is automatic or reliable when it is not.

## Final MVP demonstration script

1. `bun run dev` starts app and bridge.
2. Annotate the chart and queue feedback.
3. Refresh the tab; annotation persists.
4. Agent discovers annotation using MCP and edits chart component.
5. Agent submits summary; browser shows review-ready.
6. Compare snapshots or see truthful fallback; accept change.
7. Repeat on another component with Request changes and verify a second revision is queued.
