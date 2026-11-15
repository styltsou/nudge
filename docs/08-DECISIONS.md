# 08 — Architecture decision log

Keep this updated when an implementation decision materially affects the product or public contracts.

Current status is recorded in the latest ACP decisions and session log. Historical
entries below describe the state at their original phase; later decisions
supersede earlier deferrals of snapshots and managed agent execution.

## Accepted defaults

- **Onboarding readiness:** the browser offers an explicit Agent setup dialog;
  the trusted runner alone probes the selected native CLI and posts bounded
  adapter/sign-in/billing enums. Bridge/browser never execute setup commands.
  CLI `init` defaults to managed ACP; `--external` opts into MCP and
  `--skip-agent` preserves existing selection. Run controls wait for a fresh
  adapter check and online runner; unknown native sign-in is not a fabricated
  failure or success. Save without running preserves requests during setup.
  Local readiness does not prove model availability or actual run billing.

- **ACP unification (supersedes direct provider adapters):** all managed agents
  use one ACP v1 client over private stdio. CLI setup manages maintained Codex and
  Claude adapter packages in ignored `.nudge/agents/`; OpenCode speaks ACP itself.
  Remove direct app-server/Agent SDK code and the SDK peer dependency from Nudge.
  Adapter-native sign-in owns billing; choosing subscription login is distinct
  from API-key billing. Pinned private installs and existing PATH adapters are
  supported. No package installation occurs during browser dispatch and no
  app manifest is modified for these adapters. Real package and authenticated
  provider validation are still open because registry/profile access is restricted.

- **Additional managed providers:** Claude uses the official Agent SDK as an
  optional dependency installed in the target project, resolved from that project
  at runtime so its native binary remains external to the release bundle. Settings
  sources load normally; no permission bypass or auto-approved tool list is added.
  OpenCode uses ACP protocol v1 through a private stdio process, with explicit
  session loading and one-time permission options. It does not attach to an
  existing shared server. Provider selection is trusted local config; sessions
  from a different provider are rejected. Browser fixtures exercise all providers;
  live authentication and SDK-version validation remain explicit open gates.

- **Managed Codex preview:** separate supervised runner and capability, app-server
  JSONL protocol verified from installed 0.169.0 bindings; project records persist
  run/session identity independently of annotations. Dispatch is idempotent and
  editing runs serialize. Existing session reuse is explicit. Provider model and
  sandbox/approval configuration are inherited, never weakened. Bounded activity
  categories replace raw process logs; supported one-time permissions/questions
  reach the UI. Unknown requests, secret questions and file-root expansions fail
  closed. Structured reports trigger existing review; exit alone does not.
  Deterministic tests pass; live initialization is blocked by user-profile SQLite
  permissions in the current sandbox. This supersedes the earlier auto-send deferral.

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

## Public website

### D-019 Public website and documentation (2026-11-14)

Accepted at the user's request: add `apps/website` as private workspace package
`@usenudge/website`, using Astro 7, Tailwind CSS 4 and Starlight. The homepage is a
custom Astro page, while user-facing Markdown/MDX lives in
`src/content/docs/docs/` and routes under `/docs/`. Internal root `docs/` and
`tasks/` remain contributor/agent material and are not imported into the public
site. The site is static and independent of the local bridge/SDK; it reads no
credentials and contacts no local tool ports. No domain ownership or hosting
account is assumed. A canonical URL is optional via `NUDGE_WEBSITE_URL`; sitemap
generation is skipped until it is configured.

Design follows the user's three image references: dark technical framing with
rounded panels, navigation and code blocks. The explicit canvas preference is
pure white / pure black. Cyan in dark mode and deep teal in light mode are the
initial accent direction, centralized for easy revision. Homepage and docs share
Public Sans, palette tokens and Starlight's theme preference. The homepage example
is clearly labeled sample data and supports queue/revise/accept interactions
without changing real annotations. The published review screenshot is an actual
existing isolated test artifact; reference screenshots are not shipped as assets.

Use root `website:*` scripts with Bun, and Astro check for `.astro` files in the
website's own TS configuration. Root TypeScript still checks SDK/demo/tests;
root workspace builds include the static website. Browser tests preview the
production build on port 4322 so Pagefind search is real, and they validate theme
persistence, keyboard operation, responsive layouts, links and source isolation.
Astro telemetry is disabled by the package scripts; fonts and search are self-hosted.

### D-020 Website design revision (2026-11-14)

The user rejected the initial blended/rounded marketing design and explicitly
selected the dark technical references. This supersedes D-019's blended aesthetic;
the stack, public/internal content boundary and behavior contracts remain intact.
Use a compact header, continuous alignment rails, neutral pure black/white
canvases, lighter display typography and restrained cyan/teal. Replace the generic
chart mockup with an element-selection example and remove repeated promotional
sections. Keep the authentic review screenshot, sample-data labeling, accessible
interactions and full light mode. Shared docs receive the same tighter geometry
and neutral palette. The accent remains provisional pending visual review.

## Remaining architecture risks

### D-021 Nudge is the agent interface (2026-11-14)

Accepted from explicit user clarification: submitting a request in Nudge should
start a background coding agent, show real progress/required approvals, and return
to human review without requiring a separate agent terminal/app. Treat this as
the primary workflow. The implemented external MCP queue remains an optional
integration and foundation, not completion of the intended product.

This supersedes earlier deferral of managed dispatch in the product scope and
roadmap. A separate local runner owns provider lifecycle; bridge/overlay do not
gain arbitrary shell execution. Preserve sandbox/approvals, project boundaries,
separate credentials and human-only acceptance. Do not claim zero model-provider
egress. Provider selection and implementation remain open. See doc 09 and the
new authoritative checklist; no runtime change is implied by this decision.

### D-022 Fresh session per prompt, explicit continuation (2026-11-14)

Accepted from user clarification: every submitted prompt starts a fresh agent
session by default, including a follow-up in an item. The composer may explicitly
select an existing compatible session in this project, including for a newly
selected element. Reset the next submission to New session. Never silently reuse
the last session or assume one session per annotation/project.

Runs associate revisions with sessions. Sessions may receive requests from
multiple annotations; an annotation may have runs in different sessions. Keep
review evidence separate and validate routing/project ownership. Explain busy,
missing or incompatible selections without silent fallback. Idempotent dispatch
includes session creation. This replaces the previous suggestion of implicit
follow-up reuse. Managed execution remains planned, not implemented.

- Browser token is readable by scripts on the trusted dev origin; origin allowlist and loopback do not provide a full compromise boundary.
- `html-to-image` cannot guarantee accurate capture for all DOM/CSS/iframe/canvas content.
- Multi-instance MCP agent processes could claim same task; version-based conflict checking is required.
- Source mapping across frameworks has different tooling and cannot be promised generically.
- A local coding agent may not support MCP or may not fetch tools automatically; provide explicit prompts/manual path.
- Reviews are human-confirmed; screenshot differences alone do not prove intended outcomes.

### D-023 Element-pinned comments are the default (2026-11-15)

Status: Accepted by user direction.

Selection and submission open the prompt beside its element. Saved requests
remain numbered pins, like Figma comments. The side panel is an explicit
per-comment presentation option, never the default. The website demonstration
must show this interaction. Keep comments accessible in Feedback if attachment
is missing or ambiguous; do not invent a replacement anchor or pin to stale
coordinates. Direct live element references may preserve pins within the same
mount; persistent reattachment uses the existing confident-anchor rules.

### D-025 Existing-project installation and publication setup (2026-11-15)

Accepted from the user's correction: remove the demo workspace and public
test-drive generator. Root dev serves the website. Use temporary test consumers
to prove the installed workflow; the product is installed in an existing app.
This supersedes D-024's public launcher and earlier demo-startup requirements.

Default init only creates self-ignored `.nudge/` state. `usenudge dev` resolves
Vite from the consumer, loads its config and injects the serve-only plugin at
runtime. App components, normal dev/build scripts and Vite config stay unchanged.
Installing a dev dependency changes manifest/lockfile normally. A separate CLI
process owns server/runner cleanup; the browser/bridge cannot launch arbitrary
executables. The setup skill guides staged-change review without Git writes.

`init --integrate` explicitly opts into the prior wrapper/dev-script integration.
Its portable generated wrapper must be committed with those script changes, rather
than ignored: otherwise a fresh clone's normal dev command would reference a
missing file. Source-checkout absolute imports must not be committed in consumers.

Ship one bundled `usenudge` package, keeping internal workspaces private.
`package.release.json` owns version/metadata and preview tag; include a package
README, changelog, user-approved MIT license, actual bundled dependency notices
and canonical setup skill. Allowlist/check the actual archive. The manual tagged
GitHub workflow verifies first and publishes the same artifact with npm OIDC;
Bun remains the install/build tool. No package publication or remote configuration
is authorized by merely preparing this setup. Ownership, upstream-license review,
live authenticated providers and Linux remain explicit release gates.

### D-024 Installed-preview test drive (2026-11-15; superseded by D-025)

Use `bun run try` to exercise the unpublished archive in an editable Vite app
under ignored `.nudge/test-drive`, rather than requiring changes to the contributor
demo. Seed once and preserve app files, requests and agent choices on reruns.
Local agent instructions scope edits to that sample app and replace the parent
repository's contributor workflow. No fixture agent is installed by the launcher.

Rebuild the archive and use `bun add -d <archive>` on reruns: Bun 1.4.4's plain
`install` retained the previous contents for an unchanged tarball path/version;
an archive-refresh regression test verifies the updated dependency and preserved
app edits. Own Vite's installed entry process directly in the launcher and browser
test, avoiding a package-manager shell whose termination can leave child processes
behind on Windows. The generated app still supports its ordinary dev command.

The package and CLI share one preview version. Help/version commands do not
provision state. Installed-package browser coverage uses a deterministic ACP
fixture, edits real app CSS, observes HMR and requires persisted human acceptance.
Live authenticated providers, real registry resolution and Linux validation remain
separate release gates; an offline fixture does not establish those guarantees.

## ADR template

```text
D-### Title (YYYY-MM-DD)
Status: Accepted / Superseded / Proposed
Context:
Decision:
Alternatives:
Consequences:
```

# Standalone preview and guided external-agent setup

The first distributable is a private `usenudge` archive containing bundled CLI,
Vite adapter, bridge/browser and MCP runtime, with a Vite declaration entry.
Installed apps reference their own package for MCP, never a temporary bunx cache.
The adapter still requires Bun and only applies during development. Registry
publication, ownership/licensing checks and broader compatibility remain pending.

Guided setup probes official CLI version/login commands without starting a coding
session, prints only sanitized readiness, and configures a host only after explicit
selection. Codex uses project TOML; Claude uses project MCP JSON. Neither global
permissions nor credentials are changed. This is the setup foundation for future
managed sessions, not automatic dispatch.

### D-026 In-browser agent selection and sign-in (2026-11-15)

The Agent setup panel lists Codex, Claude and OpenCode with CLI/adapter/sign-in
status, switches the active agent (`Use <agent>`) and starts native sign-in.
The browser only asks: it posts a provider name to the bridge, which records one
setup task (install or login). The separate runner, now always launched by
Nudge startup (idle unless `agent.json` is managed), claims the task and runs
fixed commands: the pinned ACP adapter install, `codex login` or
`claude auth login`. Nothing from the browser reaches a command line.
The bridge and overlay still execute nothing. The native CLI opens its own
sign-in page; the runner relays only a plain `https:` URL it printed so the
user can open it manually. Credentials are never read, stored or shown, and
success is re-checked with the CLI's own status command. Switching is refused
while a run is active. OpenCode has no headless login, so the panel shows
`opencode auth login`. Live provider sign-in is not covered by automated tests.
