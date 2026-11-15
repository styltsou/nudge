# Implementation backlog — authoritative checklist

Check items **only after code and tests exist**. Work from top to bottom, but create runnable vertical slices rather than isolated scaffolding. Add links to key implementation files after they exist.

**2026-11-15 direction:** No demo workspace or public test-drive generator. Install the archive in an existing app; local `usenudge init`/`dev` leave source/config/scripts untouched. Persistent integration is explicit. `release:check` passed 95 unit/integration tests, 13 tool browser cases, 15 website cases, builds, typecheck, lint and archive validation. Publication and live-provider/Linux checks remain open.

**2026-11-14 status (validated MVP slice):** Bun frozen installation, strict typecheck, lint, 65 unit/integration tests, production build, and six real browser scenarios pass. Phase 3 capture/review is implemented, including two-revision evidence and recovery from missing/ambiguous anchors. The normal demo and doctor run. Remaining human/manual, HMR/cross-browser and external-installation checks are explicitly open below. See [actual results and remaining work](SESSION-LOG.md).

## Phase 0 — setup

- [x] Initialize Bun workspace and strict TypeScript configs. ([workspace](../package.json), [config](../tsconfig.base.json))
- [x] Create packages: shared, core, react, bridge, mcp. The former demo workspace was removed by user direction; tests generate temporary consumers.
- [x] Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`. ([scripts](../package.json))
- [x] Configure test runners, lint/format, CI basic checks, gitignore `.nudge/`. Bun lockfile included; CI freezes it.
- [x] Implement Zod contract types and pure transition validators. ([contracts](../packages/shared/src/index.ts), [native tests](../tests/contracts/state-machine.test.ts))
- [x] Cover annotated elements and normal-click controls in temporary consumer fixtures. ([fixture](../tests/helpers/consumer-project.ts), [E2E](../tests/e2e/loop.spec.ts))
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
- [x] Implement React wrapper gated to explicit development enablement. ([wrapper](../packages/react/src/index.ts), [Strict Mode test](../packages/react/src/index.test.ts))
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

## Next required slice — Nudge-managed agent sessions

The user clarified this as the primary vision, not optional polish. Prioritize it
over the remaining showcase tasks. See [target contract](../docs/09-MANAGED-AGENT-RUNS.md).

- [x] Select and verify the first supported provider and its installed APIs: Codex app-server 0.169.0 generated protocol.
- [x] Implement a separate local runner with project-scoped capability/configuration; no arbitrary browser-supplied executable or shell command.
- [x] Add durable run/job/events storage, atomic claims, idempotent submission and restart recovery, separate from annotation review status.
- [x] Default every prompt/follow-up to a fresh session; add explicit same-project existing-session selection, persist run routing and reset the next composer to New session.
- [x] Add Run agent, real progress/activity, supported approval/question handling, Stop and actionable failure/retry UI. Unknown/unsafe permission requests fail closed.
- [x] Connect implementation reports and follow-up sessions to existing capture/revision/human-review ownership.
- [x] Add provider/process fixtures, authorization/lifecycle and browser tests for the managed loop; retain external MCP tests.
- [x] Test distinct sessions by default, cross-element explicit continuation, selection reset, project/provider validation, busy/missing-session handling and idempotent session creation.
- [ ] Validate a real authenticated provider without an external agent terminal/app interaction, document setup, and update public docs after implementation.
- [x] Add preview Claude Agent SDK and OpenCode ACP adapters with shared session routing, progress, approvals/questions, Stop and review; cover all three browser flows with deterministic providers.
- [x] Use a single ACP client for Codex/Claude/OpenCode and install Codex/Claude adapters in Nudge-owned ignored state without app SDK dependencies.
- [ ] Install/verify real ACP adapter packages and authenticated provider runs; expand unsupported form/permission variants against verified APIs.
- [x] Cover malformed-report subprocess rejection. The prior timeout reproduces with Bun's rejects matcher; an explicit settled-outcome assertion passes the full process case.

## Phase 4 — showcase/readiness

- [x] Replace the public demo/test-drive launcher with existing-project installation. Default local init/dev leave source/config/scripts untouched; persistent integration is explicit. Keep installed CLI/runner/edit/HMR/acceptance coverage in temporary test consumers.
- [x] Prepare a publishable bundle, user-approved MIT license, package metadata/changelog/README, dependency notices, setup skill, archive checks and a manual tagged publishing workflow. Actual publication, registry ownership, remote trusted-publisher settings and real provider checks remain open.

- [x] Polish onboarding: browser Agent setup with provider selection, copyable setup/sign-in guidance, scoped runner readiness and billing hints, draft preservation, save-only fallback, and managed-by-default init with explicit external mode.

- [x] Keep pinned comments compact: collapse optional snapshots/capture controls under View comparison, load images on demand, and preserve direct human review actions.

- [x] Add a local-checkout installer and development-only Vite integration; verify generated wrappers in a separate app, repeat setup, origin/auth handling, cleanup and production exclusion.
- [x] Build an installable standalone preview archive with CLI, Vite declarations, bundled browser/bridge/MCP runtime; test packaged installation and MCP tools.
- [x] Add guided Codex/Claude discovery, local authentication checks, explicit host selection and project configuration that preserves unrelated settings.
- [ ] Before registry publication: verify package ownership/licensing notices, test Linux and other package managers/framework variants, and obtain publishing approval.

- [x] Make element-pinned composers/comments the SDK default, persist pins through stable reattachment, offer explicit side-panel docking and handle unavailable anchors safely; align the website demo and cover browser behavior.

- [ ] Improve accessibility, keyboard shortcuts, mobile/narrow viewport.
- [ ] Validate cleanup under React Strict Mode and HMR.
- [ ] Create authentic demo GIF and screenshots, after real implementation. Actual [browser screenshot](../docs/assets/review.png) exists; GIF remains.
- [ ] Produce install instructions for external Vite React project.
- [x] Add project architecture and limitations to final README.
- [x] Run all checks and document actual results, defects, and deferred work. Local checks passed; CI itself is not yet run remotely.
- [x] Ensure development-only installation and no accidental secret commits. Production assets exclude SDK/credentials; all 70 candidate files passed local credential/private-path checks. Git staging/commit itself is blocked by read-only Git metadata in this sandbox.

## Public website — explicitly requested addition

- [x] Rewrite the README/public docs around select → request → run → human review, with clear Vite setup, ACP/subscription guidance, separate external MCP mode and honest preview validation status. Update downloadable setup skill and contributor contracts consistently.

- [x] Create `apps/website` / `@usenudge/website` with Astro, Tailwind 4 and Starlight.
- [x] Keep public docs separate from internal root `docs/` and `tasks/` material.
- [x] Build a custom homepage with a clearly labeled interactive workflow example and the authentic review screenshot.
- [x] Author getting started, MCP setup, workflow, snapshots, privacy, troubleshooting and MCP/HTTP reference pages.
- [x] Implement matching light/dark styles, shared preference, pure white/black canvases and a centralized accent palette based on the supplied references.
- [x] Verify production search, theme persistence, keyboard operation, responsive layout and all public content links in browser tests. Six production-browser scenarios passed.
- [x] Run website check/build and workspace regression checks; record actual outcomes. Strict TS/Astro check, all workspace builds, lint, format, 65 unit/integration tests and 12 browser scenarios passed.
- [x] Rework the initial website after user rejection; follow the selected dark technical references, simplify structure and replace the chart mockup with the annotation interaction.
- [ ] Obtain the user's visual review of the revised dark technical direction and accent.
- [x] Make website header dividers span the full bar after the logo, between links and before the theme toggle; replace the cursor logo with a minimal monochrome selection-frame mark across website/docs/favicon.
- [x] Add the approved geometric lowercase “n” inside the frame, keeping the shared website/docs mark and favicon consistent.
- [x] Match the docs topbar to the website with the shared logo/theme button, full-height separators, a larger GitHub icon, and preserved native search/mobile navigation.
- [x] Replace cyan/teal with coral #e05246 and readable supporting shades.
- [x] Restore the user's preferred single-icon theme button; share system-first initialization and persist manual choices across homepage/docs navigation and reloads.
- [x] Add coral corner frames for header/sidebar hover and keyboard focus; selected sidebar entries use framed accent text with no filled background.
- [x] Add subtle dashed connecting edges to sidebar navigation frames, retaining solid corners and keeping header hover frames corner-only.
- [x] Brighten dark-mode primary accents to #ef6b5e while retaining #e05246 as the light-mode brand/button color.
- [x] Verify the live dev docs use the shared theme button; configure Vesper/GitHub Light code blocks, flat chrome and intact copy controls, and prevent stale highlighting assets with content-cache refreshes.
- [x] Use primary hover/focus colors for pagination and secondary controls; add thin coral scrollbars with transparent tracks and no arrow buttons.
- [x] Align and simplify search label/shortcut (no separator), restyle search/TOC panels with distinct neutral surfaces, and preserve native keyboard/navigation behavior.
- [x] Add subtle interruptible TOC pointer motion using the invoked Emil design/animation guidance, with instant keyboard/reduced-motion paths.
- [x] Replace the rejected TOC exit with Motion-controlled presence; verify retained exit, rapid reopening, keyboard/reduced-motion behavior and heading navigation.

## Hard blockers / anti-goals

- Do not spend time on branding/domain/release marketing before the loop works.
- Do not implement agent auto-send by assuming MCP pushes messages.
- Do not implement source file/line mapping before core annotations work.
- Do not build a hosted account system or SaaS backend.
- Do not claim visual validation is automatic or reliable when it is not.

## Final MVP demonstration script

1. Install the archive in an existing Vite app, configure an agent and start `bunx --bun usenudge dev`.
2. Annotate the chart and queue feedback.
3. Refresh the tab; annotation persists.
4. Agent discovers annotation using MCP and edits chart component.
5. Agent submits summary; browser shows review-ready.
6. Compare snapshots or see truthful fallback; accept change.
7. Repeat on another component with Request changes and verify a second revision is queued.

- [x] Center the homepage hero and add copyable Bun/npm/pnpm install tabs for the proposed `usenudge init` CLI, clearly labeled as coming soon; move the interactive walkthrough below.
- [x] Replace the isolated-button mockup with an app dashboard and Nudge panel; remove step navigation, add a pausable sample animation, eliminate internal scrolling, and style Connect your agent as a secondary button.
