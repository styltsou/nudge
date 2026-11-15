# Coding agent session log

The implementation agent must append a short entry after each meaningful coding session. Don't manufacture completed work or test outcomes.

Entries are chronological. The latest Bun migration entry supersedes the initial session's Node/pnpm setup instructions.

The subsequent validated capture/review entry supersedes the migration entry's dependency blockers. Application checks now pass; Git commit/push remain blocked by sandbox Git-metadata permissions and outbound GitHub access.

## Session template

### YYYY-MM-DD — short title

**Scope:** Phase / tasks undertaken.

**Changes:** Files, packages and behavior added or updated.

**Validation:** Commands run, results and any failing checks.

**Blockers / decisions:** Facts, tradeoffs, outstanding risks; link to `docs/08-DECISIONS.md` if needed.

**Next:** Smallest concrete task to pick up next.

---

### 2026-11-14 — Initial implementation, environment-blocked validation

**Scope:** Started Phase 0, added Phase 1/2 source and tests, and implemented human review with truthful unavailable evidence as an initial Phase 3 slice. Phase exit gates remain open.

**Changes:**

- Workspace packages `shared`, `core`, `react`, `bridge`, `mcp`, `cli` and Vite/React dashboard. Root pnpm scripts, strict TypeScript, esbuild package bundling, Vitest/Playwright, Oxlint/Prettier, GitHub Actions and `.nudge/` gitignore.
- Shared strict Zod contracts, URL scrubbing, input limits, complete pure transition/capability rules.
- Browser-only opt-in SDK with Shadow DOM, duplicate mount cleanup, annotation toggle/shortcut/Escape, throttled highlight, isolated selection clicks, safe anchors/text redaction, validated composer, feedback tray, revision history and accept/revise controls. React wrapper lazy-loads the core; the demo gates the entire adapter import behind Vite DEV.
- Loopback Fastify bridge, separate random persisted browser/MCP credentials, exact origin/host checks, scope enforcement, capped requests/subscriptions and authenticated fetch SSE. Project-scoped SQLite schema initialization and transactional versioned state changes; revisions stored in validated annotation documents.
- Official MCP v2 server with all five specified tools, local HTTP only and generic errors without credentials. Cached installed-version declarations inspected; stdio runtime invocation **not yet validated**. Browser credentials are not accepted for agent reports; MCP cannot human-accept/revise.
- CLI doctor/explicit local-state clean, dev process runner, copy/paste MCP configuration, privacy and recovery instructions. README now distinguishes implemented source from validated functionality.
- Vitest tests written for Zod, anchors/redaction, lifecycle/click isolation, HTTP auth/persistence/versioning/revisions/SSE, and actual MCP subprocess invocation. Playwright scenarios written for queue/reload/live report/revise/accept, inert script-like text and keyboard/narrow viewport behavior. These suites remain **unrun**.

**Validation actually run:**

| Command                                                                           | Result                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --version`                                                                  | Failed: Node not on PATH.                                                                                                                                                                                           |
| `pnpm --version`                                                                  | Failed: pnpm not on PATH.                                                                                                                                                                                           |
| `pnpm install`                                                                    | Failed before execution: pnpm not found.                                                                                                                                                                            |
| `pnpm dev`                                                                        | Failed before execution: pnpm not found; no browser demo verified.                                                                                                                                                  |
| `pnpm build`                                                                      | Failed before execution: pnpm not found.                                                                                                                                                                            |
| `pnpm typecheck`                                                                  | Failed before execution: pnpm not found.                                                                                                                                                                            |
| `pnpm lint`                                                                       | Failed before execution: pnpm not found.                                                                                                                                                                            |
| `pnpm test`                                                                       | Failed before execution: pnpm not found; full Vitest suite not run.                                                                                                                                                 |
| `pnpm test:e2e`                                                                   | Failed before execution: pnpm not found; Playwright not run.                                                                                                                                                        |
| `curl.exe -I --max-time 20 https://nodejs.org/dist/index.json`                    | Connection failed.                                                                                                                                                                                                  |
| `curl.exe -I --max-time 15 https://registry.npmjs.org/pnpm`                       | Connection failed.                                                                                                                                                                                                  |
| `bun install --offline --ignore-scripts`                                          | Failed: global cache not writable under sandbox.                                                                                                                                                                    |
| `bun install --offline --ignore-scripts --cache-dir .tools/bun-cache`             | Failed: local cache has no dependency manifests.                                                                                                                                                                    |
| `bun test tests/contracts`                                                        | **Passed: 32 tests, 0 failures** (20 transition combinations, 10 capability combinations, 2 credential lifecycle tests).                                                                                            |
| `bun build ... --packages external --target browser --outdir .tools/syntax-check` | **Passed** for implementation/config/test entry points. This checks syntax/bundling with third-party imports external; it is **not** TypeScript typechecking, dependency resolution or a working application build. |
| Bun JSON parse of workspace manifests/configuration                               | **Passed**; all package/config JSON is syntactically valid.                                                                                                                                                         |
| `git status --short`                                                              | Not a Git repository; no commit created.                                                                                                                                                                            |

**Blockers / decisions:** Node/pnpm and installable dependencies are unavailable; no pnpm lockfile or meaningful full-stack execution can be produced here. Bun exists but cannot replace the specified Node/Fastify/better-sqlite3 validation. CI temporarily uses non-frozen installation until the first real lockfile exists. See [D-013–D-016](../docs/08-DECISIONS.md). No external resources were created or packages published.

**Remaining issues:** Phase 0 verification and all Phase 1/2 runtime gates are pending. Source may contain issues the unrun strict checks will reveal. Phase 3 still needs optional before capture, secure image validation/upload/serving, after capture/retries/manual reselect, visual evidence and snapshot ownership/security tests. Current review always says Comparison unavailable. Phase 4 accessibility/cross-browser/HMR/manual validation, real screenshots/GIF and external integration are deferred.

**Exact next steps:**

1. Make Node 22.14+ and pnpm 10.32.1 available in a network-enabled environment. Run `pnpm install`, commit the generated lockfile when a Git repository is initialized, and switch CI to `--frozen-lockfile`.
2. Resume the earliest incomplete Phase 0 task: run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm exec playwright install chromium`, then `pnpm test:e2e`; fix actual failures. Run `pnpm dev` and `pnpm bridge:doctor`; manually demonstrate annotation/reload/click restoration and real host MCP retrieval/reporting before closing Phase 1/2 verification items.
3. Implement the first remaining Phase 3 task: optional, lazy `html-to-image` before capture and strictly validated snapshot storage, then same-revision after capture with conservative anchors and truthful missing/ambiguous states. Preserve all old revisions and add capture/security E2E coverage.

### 2026-11-14 — Switch to Bun at the user's request

**Scope:** Replace pnpm and the Node runtime requirement with Bun across the workspace while retaining the product/API contracts.

**Changes:**

- Root `package.json` declares Bun 1.4.4, Bun `workspaces`, and Bun commands for dev, builds, typecheck, lint, formatting, tests, CLI and MCP. Removed `pnpm-workspace.yaml`, tsx/esbuild/Vitest/better-sqlite3 dependencies and the old Vitest configuration. Added Bun/JSDOM types and a project-local cache in `bunfig.toml`.
- Package build scripts use `Bun.build` with browser targets for the SDK and Bun targets for backend tools. Dev resolves Vite's actual package location, so it works with hoisted workspace dependencies. MCP tests launch TypeScript directly using the Bun executable.
- Bridge uses built-in `bun:sqlite`; new `packages/bridge/src/database.ts` preserves the schema, WAL and busy timeout. Repository queries use cached statements with explicit close to release Windows handles. Native SQLite persistence/reopen and rollback tests were added in `tests/contracts/database.test.ts`.
- Unit/integration suites now import `bun:test`. Browser unit tests install/restore JSDOM explicitly through `tests/helpers/dom.ts`; the main test script excludes Playwright's E2E directory. Playwright's web-server command uses Bun.
- GitHub Actions installs Bun; README/MCP examples, AGENTS/start prompt, architecture/quality/roadmap and checklist now use Bun commands. D-017 records the runtime/test/SQLite changes; historical earlier results remain intact.

**Validation actually run:**

| Command                                                                                                                | Result                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun --version`                                                                                                        | 1.4.4.                                                                                                                                                                                  |
| `bun install`                                                                                                          | Failed with registry `ConnectionRefused` for dependency manifests. The project-local cache resolves the prior global-cache permission issue; no `bun.lock` was generated.               |
| Initial `bun test tests/contracts` after SQLite migration                                                              | 33 passed, 1 failed during Windows fixture cleanup because uncached prepared statements kept a file handle open. Changed to cached query statements/explicit close; rerun below passed. |
| `bun test tests/contracts`                                                                                             | **34 passed, 0 failed**, including real file-backed Bun SQLite persistence/reopening and transaction commit/rollback.                                                                   |
| `bun run build` in each of shared/core/react/bridge/mcp/cli                                                            | **All six library bundles passed** using the actual new Bun.build helper. Third-party dependencies remain external, so this is not full application validation.                         |
| `bun build <all TS/TSX source/config/test entry points> --packages external --target bun --outdir .tools/syntax-check` | Passed syntax/externalized bundling.                                                                                                                                                    |
| Bun JSON parse of workspace manifests/configs                                                                          | Passed.                                                                                                                                                                                 |
| `bun run typecheck`                                                                                                    | Failed: TypeScript executable not installed.                                                                                                                                            |
| `bun run lint`                                                                                                         | Failed: Oxlint executable not installed.                                                                                                                                                |
| `bun run test`                                                                                                         | Failed overall: **34 passed, 5 failed/errors** from missing Fastify/JSDOM/Zod dependencies; no full integration results.                                                                |
| `bun run test:e2e`                                                                                                     | Failed: Playwright executable not installed.                                                                                                                                            |
| `bun run dev`                                                                                                          | Failed: Fastify missing; registry connection refused during resolution.                                                                                                                 |
| Root `bun run build`                                                                                                   | Failed at the required typecheck, before demo build.                                                                                                                                    |

**Blockers / decisions:** Bun is installed and the migration no longer requires installing Node or pnpm. Registry connectivity is the remaining installation blocker. Full application behavior, typechecking, DOM integration and browser tests remain unverified. CI temporarily runs non-frozen installation until a real lockfile exists. See [D-017](../docs/08-DECISIONS.md).

**Next:** In an environment with registry access, run `bun install`, commit the generated `bun.lock` when Git is initialized, and enable `bun install --frozen-lockfile` in CI. Then run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun --bun playwright install chromium` and `bun run test:e2e`; start `bun run dev` and run `bun run bridge:doctor`. Fix actual failures before closing Phase 0–2 gates, then continue Phase 3 snapshot capture/review.

### 2026-11-14 — Validated capture/review loop and requested first Git publication

**Scope:** Complete the installed-dependency verification, fix real failures, implement Phase 3 snapshots and immutable review evidence, and attempt the user's explicitly authorized first commit/push to `https://github.com/styltsou/nudge.git`.

**Implemented and changed:**

- `packages/shared`: strict snapshot upload payload, shared image limits/reference types; retained URL/path/control-character protections while fixing the real lint failures.
- `packages/bridge`: PNG signature/chunk/CRC/dimension/filter/decompression validation, 2 MiB / 2048×2048 caps, generated UUID file storage, authenticated reads, browser-only versioned uploads and project/revision ownership. Schema v2 migration preserves v1 annotations and rejects future schemas. Old/accepted revision evidence cannot be overwritten. Fastify router configuration now uses the current non-deprecated option.
- `packages/core`: explicit initial capture opt-in, lazy `html-to-image` 1.11.13, form/private filtering, resource preflight, bounded canvas and cancellable capture deadlines. A saved before image permits best-effort automatic after capture; missing/ambiguous anchors show truthful errors and explicit manual recovery. Before/after images use authenticated blob fetch/object URLs, timestamp/integrity labels and immutable revision history. Follow-up revisions attempt fresh baselines. Off-mode Escape preserves app focus; object URLs/listeners/timers are cleaned up.
- Tests added/expanded for PNG spoofing/corruption/inflation/limits, auth/scopes/origins/traversal, stale/historical uploads, SQLite migration, private/external resource preflight, SSE reconciliation/reconnect and credential-safe errors. Real MCP stdio invocation still passes. Bun fetch mock now includes its required `preconnect` member.
- Playwright now owns isolated Vite/Fastify servers directly through `tests/e2e/setup.ts` on ports 5174/4748. This fixed a real Bun/Windows shell-process teardown hang. Installed Chrome is a fallback when bundled Chromium is absent. Browser coverage includes queue/reload/claim-report statuses, private capture fallback, real before/after images, two revisions, accepted persistence, missing/ambiguous recovery and keyboard/narrow viewport behavior. Test-only DOM style changes simulate the implementation; actual code editing remains the external agent's responsibility.
- `bun.lock` includes the user's installed dependencies and new capture library; CI uses frozen installation. Root/package source formatted with Prettier. README, protocol details, decision D-018 and checklist updated. `docs/assets/review.png` is an actual browser-test screenshot, visually inspected, with isolated test data and no visible credentials.

**Actual final validation:**

| Command / check                          | Result                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun install --frozen-lockfile`          | Passed: 135 installs across 181 packages, no changes. The user installed dependencies and the capture library outside the restricted network.                                                                                                    |
| `bun run typecheck`                      | Passed. Initial run failed on Bun fetch mock's missing `preconnect`; fixed.                                                                                                                                                                      |
| `bun run lint`                           | Passed. Initial control-character regex warnings fixed without weakening validation; deprecated Fastify router option also corrected.                                                                                                            |
| `bun run test`                           | **65 passed, 0 failed**, 11 files; includes real SQLite/HTTP/SSE and all five real MCP stdio tools.                                                                                                                                              |
| `bun run build`                          | Passed: strict typecheck, all six library packages and production Vite demo.                                                                                                                                                                     |
| `bun run test:e2e`                       | **6 passed**, final run 24.2 seconds using installed Chrome. Happy path captures actual PNGs, recaptures a second revision, accepts and reloads; failure cases support honest fallback and explicit recovery.                                    |
| `bun run dev`                            | Started successfully at `http://localhost:5173` with bridge bound to `127.0.0.1:4747`. Restarted after backend changes so the running normal demo has the current snapshot routes/schema.                                                        |
| `bun run bridge:doctor`                  | Passed against the current normal demo bridge: HTTP, MCP capability and SQLite reads healthy.                                                                                                                                                    |
| `bun run format:check`                   | Passed. One intermediate check flagged bridge formatting; formatted that file and reran successfully.                                                                                                                                            |
| Production bundle/private-data preflight | Passed: actual local browser/MCP capabilities absent from all 70 Git-candidate files and production JS; development SDK markers/bridge routes absent from production JS. `.nudge`, `.tools`, dependencies, build outputs and traces are ignored. |
| `bun --bun playwright install chromium`  | Blocked: default user-cache write denied; retry in a writable workspace cache reached a network denial. No browser-download success claimed; installed Chrome was used successfully instead.                                                     |

**Failures resolved during validation:** Initial Windows Playwright web-server teardown hung after tests passed; direct server ownership fixed it. Two intermediate E2E assertions were ambiguous (manual-selection announcement vs caption, then repeated persisted follow-up text); assertions now target the caption and unique follow-up text. Final browser suite passes repeatedly. Screenshot failures never prevent queued comments or human review.

**Git publication requested by user:**

- `git init -b main` succeeded. Existing configured Git identity was found; none was invented.
- `git ls-remote --heads https://github.com/styltsou/nudge.git` failed to connect to GitHub on port 443. Remote contents/default branch could not be verified.
- `git remote add origin https://github.com/styltsou/nudge.git` failed: `.git/config` lock permission denied. No origin was saved.
- `git add --all` failed: creating `.git/index.lock` is denied. No files are staged and no first commit exists. Creating the commit and pushing cannot proceed without writable Git metadata; no alternate location or force-push was attempted.
- The environment explicitly exposes `.git` read-only, with no approval escalation available. Repository source remains complete and reviewable. No GitHub push or remote CI run is claimed.

**Remaining:** Developer manual review, explicit HMR/Firefox/Safari checks, external-project installation/publishable package declarations and a real GIF remain Phase 4 work. The core capture/review loop and automated local gates are implemented and passing; screenshots remain advisory, and no real user annotation was accepted on the user's behalf.

**Exact next steps:** From a normal terminal with Git write permission and GitHub access, publish the prepared first commit (without force):

```sh
git remote add origin https://github.com/styltsou/nudge.git
git add .
git commit -m "Build Nudge local annotation and review MVP"
git push -u origin main
```

If the remote already contains history, fetch/reconcile it instead of force-pushing. Then review CI results, manually exercise the running demo, and continue the open Phase 4 checklist items.

### 2026-11-14 — Linux-first line endings

**Scope:** Apply the user's requested LF policy and record Linux as the primary development environment.

**Changes:** Added root `.gitattributes` with `* text=auto eol=lf`; explicitly set Prettier `endOfLine` to `lf`; noted Linux-first, portable Bun workflows in `AGENTS.md`. Binary files remain auto-detected. No Git configuration or index changes were made.

**Validation:** `bun --bun prettier --check .prettierrc.json AGENTS.md tasks/SESSION-LOG.md` passed. `git check-attr text eol -- scripts/dev.ts tasks/IMPLEMENTATION.md tsconfig.json` confirmed `text: auto` and `eol: lf` for all three files. No application behavior changed; runtime tests are unnecessary for this configuration-only update.

**Next:** Include these configuration files in the user's next commit; continue the open Phase 4 checklist.

### 2026-11-14 — Public Astro/Starlight website

**Scope:** Build the explicitly requested `apps/website` / `@usenudge/website` product homepage and public documentation, separate from internal agent/contributor documents. Incorporate the user's three design references, modern developer-tool styling, both themes, and white/black main canvases.

**Changes:**

- Added a static Astro 7.4.12 site with Starlight 0.43.1, Tailwind 4.3.5, Starlight's Tailwind compatibility package and self-hosted Public Sans. Inspected current official docs and installed APIs; dependencies are pinned to compatible version ranges in the real Bun lockfile.
- Custom homepage with a keyboard-accessible, clearly labeled sample walkthrough: queue literal text, preview a reported implementation, accept, request another revision, or reset. It never contacts the Nudge bridge or changes real annotations. Setup-command copy, theme toggle, responsive layouts and a custom 404 are functional.
- The initial design combines technical framing with rounded panels/navigation/code blocks. Main backgrounds are exactly white and black. The initial cyan/deep-teal accent family and font tokens live in `apps/website/src/styles/tokens.css`; homepage semantic accents resolve from those same tokens. The homepage and docs share Starlight's saved theme preference. Brand color remains open for the user's visual review.
- Authored nine public guide/reference pages under `apps/website/src/content/docs/docs/`: introduction, getting started, MCP setup, workflow, snapshots, privacy, troubleshooting, MCP tools and HTTP API. Native Starlight navigation, code highlighting/copy, TOC, theme selection and production Pagefind search are retained. Root `docs/` and `tasks/` are not published. Reference images are not included in the static output; the existing authentic review screenshot is included intentionally.
- Root `website:dev`, `website:check`, `website:build`, `website:preview` and `website:test` scripts added. Root typecheck includes Astro check; all-workspace builds include the website. CI includes website browser tests. Astro CLI telemetry is disabled. Canonical URL/sitemap generation waits for an explicitly configured `NUDGE_WEBSITE_URL`; no domain, hosting account, deployment or Git write was created.
- Added Astro Prettier support and ignored generated `.astro` data. Existing user-installed `.agents`, `.claude` and skill lock files are excluded from project formatting rather than rewritten. Internal architecture/decision D-019, README, AGENTS and implementation checklist explain the public/internal separation.
- Six website browser scenarios cover the walkthrough/XSS-safe rendering, exact canvas colors and cross-page theme persistence, actual built-site search, content/navigation links and private-path 404s, keyboard/copy/320px layouts, and captured desktop/mobile visual previews. Tests own an isolated native Astro preview on port 4322 and stop it directly.

**Validation actually run:**

| Command / check                 | Result                                                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial `bun install`           | Failed with registry connection refusals. User completed installation in their terminal; no failed install was reported as successful.                                                                                                                                               |
| `bun install --offline`         | Passed after pinning the installed version ranges; saved the updated lockfile.                                                                                                                                                                                                       |
| `bun install --frozen-lockfile` | Passed: 466 installs across 582 packages, no changes.                                                                                                                                                                                                                                |
| `bun run website:check`         | Passed: 0 errors, 0 warnings, 0 hints.                                                                                                                                                                                                                                               |
| `bun run typecheck`             | Passed, including root strict TypeScript and Astro check.                                                                                                                                                                                                                            |
| `bun run website:build`         | Passed: 11 static HTML routes and production Pagefind index. Expected sitemap warning because a canonical domain is not configured.                                                                                                                                                  |
| `bun run build`                 | Passed: all SDK/backend packages, demo and public website, including strict typechecking.                                                                                                                                                                                            |
| `bun run lint`                  | Passed.                                                                                                                                                                                                                                                                              |
| `bun run format:check`          | Passed. Initial check flagged newly installed third-party skill files and one new component; ignored vendor skill directories and formatted project source. A direct formatter invocation on `.prettierignore` reported no parser; the actual root format check subsequently passed. |
| `bun run test`                  | **65 passed, 0 failed**; existing SQLite/HTTP/SSE/MCP/SDK contracts remain intact.                                                                                                                                                                                                   |
| `bun run test:e2e`              | **6 passed**, including the existing real snapshot/revision/recovery loop.                                                                                                                                                                                                           |
| `bun run website:test`          | **6 passed** against the production static preview; search/theme/links/privacy paths/interaction/responsiveness verified.                                                                                                                                                            |
| Static website audit            | Passed for all 50 built files: no real local bridge credentials or internal/reference source directories in the output.                                                                                                                                                              |
| `git diff --check`              | Passed. No commit, staging, remote or push operation was attempted in this session; user is managing Git.                                                                                                                                                                            |

**Observed and resolved:** Initial site tests used an ambiguous desktop/mobile theme selector and the wrong Pagefind input role; selectors now use the visible combobox and Search textbox. The first full-page image captured a lazy screenshot placeholder; visual preview capture now scrolls to load the actual screenshot before taking the image. Starlight's default 404 conflicted with content routing; a standalone Astro 404 handles unknown/private paths. The expected sitemap warning is documented rather than assigning an unverified domain.

**Visual verification:** Inspected actual dark homepage, light/mobile homepage and light/dark documentation screenshots. Previews are stored locally under `.nudge/website-preview/` (not committed). Both requested canvas colors, the cyan/teal family, rounded code/panel details and responsive layout are implemented. Installed Chrome was used locally; the existing Linux CI configuration uses Chromium and has not been run remotely in this session.

**Next:** User reviews the first accent/aesthetic direction; adjust the centralized tokens if requested. Configure an owned canonical URL and hosting only when explicitly requested. Continue the original open Phase 4 items independently; public docs accurately describe the current source-workspace installation and do not claim published npm packages or drop-in external installation.

### 2026-11-14 — Website revision: dark technical references

**Scope:** The user rejected the initial website as generic and explicitly chose
the dark technical references as the lead direction. Reworked the existing local
Astro/Starlight website; retained full light mode and exact white/black canvases.

**Changes:** Replaced the homepage layout and CSS with a compact header,
continuous alignment rails, regular-weight display typography, neutral surfaces
and restrained cyan/teal controls. Removed the rounded dashboard/chart example,
fake window controls, redundant feature sections and repeated promotional copy.
The interactive sample now centers on a selected button, its anchor, cursor and
attached request. Queue/revise/accept/reset and keyboard behavior remain working.
Kept the authentic review screenshot and source-based Bun setup. Simplified the
public docs introduction, tightened Starlight typography/code/navigation geometry,
and shared the updated cursor wordmark through a native SiteTitle override.
Favicon follows the same mark. Added `apps/website/DESIGN.md`, updated the website
README, recorded D-020 and revised the implementation checklist. User visual
approval remains open.

**Validation:** `bun run typecheck` passed, including Astro's 10 files with zero
errors/warnings/hints. `bun run lint`, `bun run format:check` and `git diff --check`
passed. `bun run website:build` passed with 11 static routes and Pagefind search;
the documented unset-canonical-URL sitemap warning remains. The first production
browser pass after the layout change passed all six scenarios. Screenshots were
inspected in dark/light desktop, mobile, and dark docs; this caught a missing
mobile heading space, which was fixed alongside the shared docs wordmark. The
final `bun run website:test` rerun passed all six scenarios (26.6 seconds),
including refreshed desktop/mobile captures. SDK and
bridge code did not change; their tests were not rerun for this website revision.

**Next:** Review the revised aesthetic with the user. Continue the original open
MVP readiness items separately; no hosting or Git writes were performed.

### 2026-11-14 — Correct the primary agent workflow

**User clarification:** Nudge should be the interface for submitting changes,
starting agents, showing their activity and reviewing results. Operating a
separate coding-agent terminal/app per request misses the product vision.

**Changes:** Added `docs/09-MANAGED-AGENT-RUNS.md` with a concrete target workflow,
separate runner/job architecture, real progress/approval/question/cancel/retry
requirements, session reuse, privacy boundaries and an acceptance gate. Updated
AGENTS, the starting prompt, README, product/architecture/protocol/UX/security/
quality/roadmap contracts, D-021 and the implementation checklist. Managed runs
are explicitly the next required slice, ahead of showcase polish. All runtime
implementation items remain unchecked; existing public guides still accurately
describe today's manual MCP behavior.

**Research:** Read current official Codex app-server and Claude Code programmatic
documentation. Inspected local `codex --version` and `codex app-server --help`:
Codex 0.169.0 exposes the expected interface. Both commands exited successfully
but reported sandbox permission warnings for user-profile temp/PATH setup.
Claude Code was not found on this shell's PATH. No authenticated agent session,
provider installation, model request, source-editing run or Git write occurred.

**Validation:** Documentation-only changes; runtime tests are not applicable.
`bun run format:check` and `git diff --check` passed. Confirmed the new plan exists
and references resolve from the updated contract locations. No managed-run
behavior is claimed as implemented or tested.

**Next:** Confirm the first provider preference (question already sent) and
implement the runner → durable job → UI run/progress/approval/cancel → existing
review vertical slice against its actual installed protocol.

### 2026-11-14 — Fresh sessions by default

**User clarification:** Every submitted prompt should launch a fresh agent
session by default. Before submitting, users can explicitly route a prompt about
a newly selected element into an existing session instead.

**Changes:** Updated doc 09's composer flow, session selection, identity model,
dispatch idempotency and acceptance gates. Follow-ups also default to new
sessions; the next composer resets to New session. Sessions can span different
annotation items, and an item can have runs in different sessions, while review
history remains separate. Existing-session routing requires project/provider
validation and explained busy/missing/incompatible states without silent fallback.
Recorded D-022 and updated AGENTS, START-HERE-PROMPT, README, product/protocol/UX
contracts and the open implementation/test checklist. Replaced an outdated README
claim that managed dispatch was a later feature. Runtime remains unchanged and
managed-run implementation tasks remain unchecked.

**Validation:** Documentation-only change; no runtime tests needed. The first
targeted Prettier check flagged doc 09's table formatting; formatted it and the
targeted check passed for all ten changed files. `git diff --check` passed.

**Next:** Implement the managed-run slice with fresh-session dispatch by default
and explicit existing-session routing; verify both with provider fixtures and
browser coverage before a real authenticated provider run.

### 2026-11-15 — Website header dividers and minimal mark

**Scope:** User requested full-height topbar dividers after the logo, between
links and before the theme toggle, then a more minimal technical logo.

**Changes:** Header flex cells now stretch to the top/bottom borders with their
contents centered and padding inside each cell. Removed inset theme-toggle
divider sizing and navigation gaps. Mobile cells fit the existing 320px layout.
Replaced the cursor/arrow graphic with four thin monochrome selection corners;
shared Brand and the docs title use the same mark as the theme-aware favicon.
Updated `apps/website/DESIGN.md` and the website checklist. Tool runtime and
managed-agent work are unchanged.

**Validation:** `bun run website:build` passed (11 routes/search index; existing
unset-canonical sitemap warning). Targeted Prettier checks and `git diff --check`
passed. After the separator change, the existing keyboard/copy/narrow-layout and
desktop/mobile preview scenarios both passed (45.6 seconds). The same two
scenarios passed against the final logo build (1.2 minutes); inspected the
refreshed desktop/mobile header captures and confirmed the full-height cells and
minimal mark. No new runtime tests were needed for this cosmetic change.

**Next:** Continue user-directed website refinements; the managed-run checklist
remains the next tool implementation slice.

### 2026-11-15 — Geometric n inside the selection frame

**Scope:** User approved adding a small geometric lowercase n inside the minimal
frame logo.

**Changes:** Added an original SVG path with a slightly heavier stroke than the
frame, a chamfered shoulder and clear space around the letter. The shared Brand
component updates the homepage, footer and docs title together; the theme-aware
favicon uses identical geometry. Updated website DESIGN.md and the checklist.

**Validation:** Targeted Prettier and `git diff --check` passed.
`bun run website:check` passed for 10 Astro files with zero errors, warnings or
hints. No runtime behavior changed, so no new tests or full browser-suite rerun
are needed for this vector-only change.

**Next:** Continue website refinements requested by the user; managed-agent
implementation remains open in its own checklist.

### 2026-11-15 — Shared website/docs header controls

**Scope:** Ensure the framed-n logo appears on docs pages and bring their topbar
in line with the website: full-height dividers, the same theme switch and a
larger GitHub icon.

**Changes:** Confirmed native Starlight SiteTitle override uses shared Brand,
including the n. Extracted the homepage sun/moon control into ThemeToggle.astro
and reused it through Starlight's ThemeSelect override, including the mobile
sidebar footer. Both copies synchronize labels, theme and saved preference;
system changes apply until an explicit preference is saved. Removed duplicated
homepage toggle markup/script/styles. Styled the native docs header's logo,
search/actions and 24px GitHub icon as full-height cells, removed the old inset
social divider, and reserved a matching menu cell on mobile. Native search,
sidebar popover/focus behavior and print hiding remain. Removed the inherited
underline from the docs wordmark after visual inspection. Updated DESIGN.md,
website README and the implementation checklist.

**Validation:** `bun run typecheck` passed, including 11 Astro files with zero
errors/warnings/hints. `bun run lint`, `bun run format:check` and
`git diff --check` passed. `bun run website:build` passed with 11 routes and
Pagefind search; the existing unset-canonical sitemap warning remains.
`bun run website:test` passed all **7 scenarios (53.7 seconds)**. Updated theme
navigation coverage for the shared button and added mobile search/theme/menu
coverage at 390px/320px, including synchronized header/footer switches and
navigation to another docs page. Inspected actual dark/light desktop and mobile
docs captures. No SDK/bridge behavior changed, so those suites were not rerun.

**Next:** Continue requested website refinements; managed-run implementation is
still open in its separate checklist. No deployment or Git write was performed.

### 2026-11-15 — Coral accent and clearer theme switch

**Scope:** User supplied four replacement accent candidates and requested one
instead of cyan/teal. Also clarified that the docs theme switch itself looked bad.

**Changes:** Recommended and applied coral `#e05246`, with a complete supporting
accent scale in tokens.css. Primary homepage/sample buttons use the exact coral
with black text in both themes. Small light-mode accent text uses `#a8322b`;
dark-mode accents use the base coral. Starlight links, active navigation and
accents resolve from the same semantic tokens. Kept pure white/black canvases,
monochrome branding and green acceptance states. Replaced the isolated theme
icon with a neutral rectangular sun/moon track and a contrasting active-mode
indicator, shared across the homepage/docs/mobile menu. Preserved existing
click/keyboard behavior, preference persistence and full-height header cells.
Updated website design notes, README and checklist.

**Validation:** Calculated contrast: base coral/black 5.46:1; base coral/white
3.84:1, so primary buttons use black text; dark coral/white 6.65:1 for small
light-mode accent text. `bun run website:build` passed (11 routes/search index;
existing unset-canonical sitemap warning). `bun run website:check` passed for 11
Astro files with zero errors/warnings/hints. `bun run lint`, `bun run format:check`
and `git diff --check` passed. `bun run website:test` passed all **7 scenarios
(33.5 seconds)**, including theme persistence, mobile switch synchronization,
search/menu behavior, links and narrow layouts. Inspected actual coral dark
homepage, dark docs and mobile docs captures. No SDK/bridge changes or test reruns
were needed for this website styling change.

**Next:** User visual feedback on the coral direction and revised switch.

### 2026-11-15 — Restore single-icon theme and add corner-frame states

**Scope:** User clarified they preferred the single-icon switch, requested
system-default theme with persistent manual preference, and asked for primary
corner frames on header/sidebar hover instead of filled sidebar selection.

**Changes:** Removed the two-icon track/indicator and restored one action icon
(sun in dark mode, moon in light mode) in the shared ThemeToggle. Added a shared
inline ThemeProvider for both the homepage head and Starlight's supported
ThemeProvider override. Both start from a valid stored preference or the system,
with light fallback when unavailable. The toggle follows system changes until
manual choice, persists explicit choices, synchronizes copies/tabs, and retains
in-memory choice if storage is unavailable. Shared frames.css paints short coral
corner strokes on header controls and sidebar links/groups for hover/focus.
Selected sidebar links keep a transparent background, accent text and frame.
Keyboard focus uses heavier corners and forced-colors mode retains an outline.
Neutral full-height dividers remain. Corrected design notes/README/checklist so
the rejected two-icon track is not treated as the desired direction.

**Validation:** `bun run website:build` passed (11 routes and Pagefind; existing
unset-canonical sitemap warning). `bun run typecheck` passed, including 12 Astro
files with zero errors/warnings/hints. `bun run lint`, root `format:check` and
`git diff --check` passed after formatting the updated browser test file.
`bun run website:test` passed all **9 scenarios (1.2 minutes)**. New coverage
checks system changes before manual choice, persistence despite subsequent OS
changes/reload/navigation on both entry points, a single visible icon, header
hover/focus and unfilled sidebar selection/navigation in light/dark modes.
Existing mobile/search/menu tests passed. Added and inspected actual header and
sidebar hover captures in both themes. No SDK/bridge changes or suite reruns were
needed for this website-only change.

**Next:** Continue user-directed website refinement; managed agent runs remain
unimplemented in their separate checklist.

### 2026-11-15 — Website/docs polish, Vesper and native dropdown motion

**Scope:** Continued user-directed website work: sidebar dashed edges, brighter
dark primary, live docs theme-control mismatch, code blocks, secondary hover
colors, scrollbars, search alignment, raised TOC/search surfaces and the invoked
Emil design/animation guidance.

**Changes:**

- Sidebar navigation frames now connect their solid corners with subtle dashed
  edges. Header frames remain corner-only with continuous structural dividers.
- Dark primary is brighter `#ef6b5e` (6.93:1 against black); light buttons retain
  `#e05246`, with readable darker light-mode accent text.
- The live dev server initially returned zero shared theme buttons and native
  dropdown markup despite correct production overrides. User restarted it;
  subsequent live HTTP checks show two shared controls (header/mobile footer),
  zero native dropdown elements, and current Vesper tokens. Windows denied
  process inspection; no user process was killed or bypassed. Grouped the
  existing override paths in Astro config for clarity.
- Added `ec.config.mjs`: installed/bundled Shiki Vesper for dark mode and GitHub
  Light for light mode; square thin borders, consistent padding, no decorative
  terminal header/dots, native copy retained. Inspected official documentation
  and installed 0.44.3 Expressive Code / 4.6.0 Shiki APIs; no dependency added.
- Found a real highlighting-cache defect: cached Markdown retained old Night
  Owl markup and CSS asset references after changing EC config, producing empty
  CSS variables/transparent code backgrounds. Website builds now use Astro's
  documented `build --force` content refresh. Verified Vesper output and zero
  missing stylesheet references; link coverage now checks CSS/scripts too.
- Pagination/secondary links and controls use primary text/icons/borders on
  hover/focus. Shared scrollbar CSS uses transparent tracks, thin coral thumbs,
  no WebKit arrow buttons and Firefox thin/color fallback. Forced colors retain
  system contrast. No JS scrolling behavior was added.
- Search and On this page use flat controls/thin borders. Search label/icon and
  shortcut align vertically; removed the shortcut divider, muted its text and
  hid it in the mobile icon-only control. Popup surfaces are #101010 dark and
  #f4f4f4 light, distinct from the pure page canvases. Native search, details,
  outside/Escape dismissal and anchor navigation remain.
- Applied the explicitly requested Emil design-engineering and animate skills
  and recipe. Occasional pointer TOC motion serves spatial consistency: native
  CSS `::details-content` transitions opacity/4px movement, 150ms enter / 125ms
  exit with `cubic-bezier(0.23, 1, 0.32, 1)`. It retargets on rapid toggles and
  disables retained-panel pointer events on close. Keyboard/reduced-motion
  paths are instant; unsupported browsers retain native immediate behavior.
  No animation library, bounce or stagger. Keyboard focus uses the control's
  coral frame; forced colors retain a system outline.
- Updated website design notes, README and authoritative checklist. No tool
  backend/SDK behavior, Git writes, deployment or external resources changed.

**Validation:** Final `bun run website:build` passed (11 routes/Pagefind; existing
unset-canonical sitemap warning). Root `bun run typecheck` passed, including 13
Astro files with zero errors/warnings/hints. `bun run lint`, `bun run format:check`
and `git diff --check` passed. The full browser suite passed **12 scenarios
(35.5 seconds)**, including real clipboard JSON copying across themes, system and
saved preferences, primary pagination states, native search shortcut/results,
CSS/script asset links, mobile menu/search, TOC keyboard/anchor behavior and
pointer/keyboard/reduced-motion timing. Earlier failed code-style checks exposed
the cache defect described above; an initial TOC preview timed out because the
custom-element host has no layout box, resolved by capturing its rendered nav.
Inspected actual dark/light header, search and TOC captures. After the final
cosmetic focus-ring adjustment, the focused TOC/preview rerun passed **3 scenarios
(8.4 seconds)**. SDK/bridge suites were not rerun for website-only changes.

**Next:** User feel/visual feedback on the brief TOC motion and site controls.
Managed-agent implementation remains open in its separate checklist.

### 2026-11-15 — Motion-controlled TOC exit

**Scope:** User disliked the CSS dropdown exit and requested Framer Motion.
Applied the previously invoked Emil design-engineering/animate guidance and
checked the installed Starlight override API and official Motion documentation.

**Changes:** Added a focused `MobileTableOfContents.astro` override, recursive
`TocLinks.astro` and `src/scripts/toc.ts` controller. Uses installed Motion
14.14.0's `motion/mini` JavaScript API with no Astro React integration. The user
installed the dependency with Bun after this sandbox's registry request failed;
website package manifest and Bun lockfile include it. Removed the previous CSS
`::details-content` animation to avoid competing lifecycles.

The panel stays rendered until its 125ms fade/2px exit completes; entry is
150ms/4px with the existing strong ease-out token. Closing immediately makes
content inert and updates accessibility state. Reopening stops at the current
appearance and invalidates stale completion callbacks. Keyboard, anchor
navigation, reduced-motion changes and desktop breakpoint changes settle
instantly. Preserved native details/summary and anchors, outside dismissal,
Escape/focus restoration, nested heading links and scroll-based current heading.
Native disclosure/anchors still work without JavaScript. Kept raised light/dark
surfaces, corner frames and mobile layout. Updated website design notes, README
and implementation checklist. No backend/SDK, Git or deployment changes.

**Validation:** `bun run website:build` passed (11 routes/Pagefind; existing unset
canonical-URL sitemap warning). `bun run typecheck` passed, including 16 Astro
files with zero errors/warnings/hints. Lint, repository formatting and
`git diff --check` passed. An initial browser run passed 11/12 scenarios; the
new test's outside click targeted an H1 covered by the open panel, causing a
Playwright click timeout. Corrected the test to click outside the panel and
added heading-tracking/no-JavaScript coverage. Focused TOC rerun passed all
3 scenarios (9.1 seconds). Verified live localhost:4321 docs return the new
`data-nudge-toc` override and no native theme dropdown. Inspected actual dark
and light dropdown captures. Final `bun run website:test` passed all **13
scenarios (39.4 seconds)**; its owned preview server shut down normally. SDK and
bridge tests were not rerun for this website-only change.

**Next:** User review of the new exit feel. Managed-agent implementation remains
open in its separate checklist.

### 2026-11-15 — Centered hero and proposed install commands

Implemented the user-requested centered homepage hero, with larger display type,
centered actions and a new `InstallCommands.astro` component. Bun, npm and pnpm
tabs expose proposed `usenudge init` commands and copy only the selected command.
Tabs support arrow keys/Home/End and clipboard results are announced. The box
labels the commands as coming soon and states packages are unpublished. A setup
skill guide link remains accessible; the existing runnable source-demo commands
remain below. Moved the interactive walkthrough into a centered section under
the hero and preserved existing colors, header rails and mobile layout.

Validation: website build passed (11 routes; existing unset-site sitemap warning),
Astro check passed (17 files; zero errors/warnings/hints), and lint passed. Three
focused website browser scenarios passed in 7.7s: real clipboard/keyboard install
tabs with overflow checks at 320/390/1440px, existing setup/keyboard controls,
and desktop/mobile screenshots. Inspected the dark desktop and light mobile
captures. Updated the checklist and design notes. No publishing or Git writes.

Next: user's visual review of the centered hero; managed-agent runs remain open.

### 2026-11-15 — Simplify hero install box labels

Removed the coming-soon badge and proposed/unpublished note from the hero install
box at the user's request. Removed their unused styles, balanced command-row
padding, and removed the browser assertion for the deleted badge. Updated design
guidance. Commands and tab/copy behavior are unchanged. Formatting and diff checks
passed; no behavioral tests rerun for this copy/style removal.

### 2026-11-15 — Full-width homepage mockup

Removed the hero walkthrough's 660px width cap and horizontal section inset.
It now spans the page's contained area, using the outer page rails as its side
borders. The specific hero selector also overrides the narrow-screen 520px cap.
Formatting and diff checks passed. No behavior changed; browser tests not rerun.

### 2026-11-15 — Browser proportions for homepage mockup

Set the full-width mockup to a 16:10 desktop browser aspect ratio. Header, tabs
and footer stay in place while the body fills the viewport and can scroll if
needed. The selection canvas expands into the extra height. Below 600px the
frame uses content height so annotation inputs stay usable on phones.

Validation: website build passed (existing unset-site sitemap warning). Two
focused browser scenarios passed in 7.2s: the full interactive walkthrough loop
and desktop/mobile preview captures. Formatting and diff checks passed.

### 2026-11-15 — App-context animated browser example

Replaced the isolated button canvas with `SampleDashboard.astro`: a sample Orbit
workspace with navigation, metrics, a chart and selected Publish update button.
The Nudge pane stays beside the app on desktop and stacks below on phones.
Review shows the larger button in the app as well as before/after evidence.
Changed Connect your agent to an outlined secondary hero button.

Following user steering, removed step navigation. The sample plays through once
on viewport entry, using Motion mini for 200ms opacity/4px panel transitions.
Added play/pause/replay controls; editing pauses playback, and reduced motion
disables autoplay. Hidden documents pause. Existing manual queue/revise/accept
behavior remains usable. Removed internal scrolling and checked all panel sizes.

Validation: website build and Astro check passed (18 files, zero diagnostics;
existing unset-site sitemap warning). Four focused browser scenarios passed in
8.5s: timed playback/pause/replay, no step bar or internal scroll at
1440/1024/390px, literal-text queue/review/revision loop, keyboard/setup controls
and preview capture. Earlier dashboard-only lint passed. A final focused rerun
after pause/reset cleanup is recorded below. Updated checklist and design notes.

The final pause/reset rerun passed both focused browser scenarios (4.7s), and
lint/diff checks passed.

### 2026-11-15 — Pinned comments as the tool's default

User clarified that Figma-like element-pinned comments are the actual product
behavior, not only a website treatment. Implemented in the framework-neutral
Shadow DOM SDK: selection opens an anchored composer, submission keeps its
comment open beside the element, saved annotations appear as numbered pins,
and pin clicks reopen review/history there. Added explicit Open in side panel /
Pin to element controls and Close comment. Feedback remains an explicit list.

Pins reposition on scroll, viewport/element resize and app DOM changes, and
stable anchors restore pins after reload. Direct live references preserve newly
selected positional elements during the current mount. Missing/disconnected or
ambiguous persisted anchors do not get guessed pins; attachment-unavailable
feedback remains accessible. New listeners/observers are cleaned up on unmount.
No annotation protocol/database or snapshot ownership changes.

The animated website example now uses a pin and floating comment by default,
with optional side-panel docking. Kept the browser scene free of internal scroll;
moved the expanded review card upward to fit tablet dimensions after the layout
check caught overflow. Updated UX spec, ADR D-023, public workflow and checklist.

Validation: all 65 unit/integration tests passed before the final live-target
refinement; final core lifecycle rerun passed 3/3. Root typecheck/Astro check
passed with zero diagnostics; lint and diff checks passed. Final full core
browser suite passed 6/6 (26.3s), including persistence, docking, pin reopening,
layout movement, snapshot/revision ownership and missing/ambiguous recovery.
A previous parallel website/core run collided in Playwright's shared output
directory (ENOENT trace files); sequential rerun resolved that harness issue.
Three website scenarios passed (23.8s), covering no-scroll playback, manual
review loop and desktop/mobile captures. Further website docking/replay checks
are recorded below. Website build passed with the existing unset-site warning.

User then explicitly stopped mockup work, reserving fidelity improvements for
later. No further mockup implementation or browser checks were performed.
The additional docking/replay check exposed a playback-label reset; its fix is
in source but the website rerun remains unverified. The SDK's six browser
scenarios and three final lifecycle tests above passed independently. Next:
user review of the actual tool's pinned comments; defer mockup polish.

### 2026-11-15 — Local Vite project installation

Added `packages/cli/src/init.ts` and a source-checkout Vite adapter at
`packages/vite/src/index.ts`. `bun /path/to/nudge/packages/cli/src/index.ts init
/path/to/app` recognizes an installed Vite app, preserves its existing config,
writes a machine-local ignored wrapper, and updates the direct dev script to
run Vite under Bun. Repeat init is idempotent; unsupported scripts/configs and
unowned wrapper files are rejected. No dependencies downloaded or packages
published. This is a local-checkout integration, not registry distribution.

Vite owns the development-only bridge, picks a free loopback port, derives exact
origins from the actual listening app port, injects the browser SDK and closes
the database via its awaited closeBundle hook. Browser bootstrap checks local
Host/Origin and never includes the MCP capability. Production builds retain the
original config; the plugin itself is also serve-only. Generated MCP template
contains paths without tokens. MCP and doctor now discover connection.json's
runtime port; external host configuration remains optional/manual because host
formats differ. Updated README, public guide, setup skill and checklist.

Validation: all **68 unit/integration tests passed**. Installer tests cover
repeat runs/config preservation, a generated wrapper in a separate app, local
origin/auth checks, token separation, shutdown and production exclusion. A real
browser installation test passed (2.7s): app with no Nudge UI code loads overlay,
saves a pinned request and restores it on reload. Initial Windows cleanup EBUSY
exposed an unawaited HTTP-close callback; awaited Vite closeBundle resolved it.
TypeScript and lint passed during implementation; final checks recorded below.
Vite warns that existing extensionless source imports will need adaptation for
a future native config loader; current bundled config loader works.

Remaining: publishable packages/declarations, package-manager installation,
host-specific configuration, broader framework/config support, concurrent
dev-server ownership in one project, and managed agent dispatch. Current support
is installed ESM Vite projects on local HTTP with Bun and a retained checkout.
Mockup work remains deferred at the user's request.

Final root typecheck passed, including 18 Astro files with zero diagnostics,
after correcting optional config access in the new test. Lint, targeted
formatting and git diff whitespace checks passed.

### 2026-11-15 — Optional comparison in comments

At the user's request, simplified the actual SDK comment detail. Before/after
images, capture/retry/reselect controls and comparison warnings now live inside
a closed View comparison disclosure. Images load on first expansion. The
request, agent summary and accept/revise actions remain immediately available;
historical evidence is also collapsed. Expansion survives live refresh within a
revision. Updated UX contract, public workflow and checklist. No mockup edits.

Validation: all seven core browser scenarios passed (16.0s), including lazy
snapshot visibility, explicit comparison inspection, history, unavailable/private
capture recovery, pinned comments and separate-app installation. TypeScript and
lint passed. Added disclosure cursor/focus styling; formatting/diff checks pass.

# Standalone package and guided agent setup

- Added `bun run package:release`: private local `dist/usenudge.tgz` containing
  bundled CLI/Vite/browser/MCP runtime and declarations; no source checkout needed
  by the installed app. Nothing published or pushed.
- Packaged init can install its pinned dependency through the detected package
  manager, or a supplied local archive; preserves existing Vite config and uses
  the app's installed MCP path. Source-checkout integration remains supported.
- Added interactive/flag-based Codex/Claude selection, sanitized version/login
  detection, install/login guidance, project config merging and conflict refusal.
  No model calls, coding sessions or global permission changes. Local read-only
  probe: Codex 0.169.0 signed in; Claude absent.
- Updated README, public getting started, managed-run status and checklist.
- Validation: 73 unit/integration tests passed, including all five tools through
  bundled MCP; 8 Playwright tests passed, including source and archive installs
  with persisted browser annotations. Typecheck (18 Astro files, no diagnostics),
  lint and format check passed. Package build and full workspace production build
  passed; website sitemap skipped because no production site URL is configured.
- Initial packaged test hit sandbox global-cache permissions, then registry
  refusal. Final fixture uses a workspace cache and links the already installed
  Vite; Nudge itself is installed from its tarball. Registry downloads and Linux
  execution are not validated here. Non-Bun package managers and real Claude auth
  remain untested; auth checks do not establish model/network readiness.
- Next: implement managed run/session orchestration from doc 09. Before publishing,
  validate Linux/package managers/framework variants, audit bundled license notices,
  confirm namespace ownership and obtain release approval. Source adapter still
  emits Vite's advisory future-native-config warning; packaged adapter passes.

## Managed Codex runner, sessions and browser workflow

- Implemented `packages/runner/src` using installed Codex 0.169.0 app-server
  JSONL APIs. Vite/source startup launches the separate process; the distributable
  bundles runner.js and its startup was verified in an installed app.
- Added a distinct runner credential, project-scoped durable sessions/runs/events,
  atomic lease claims, idempotency, per-project serialization, heartbeat expiry,
  restart interruption and explicit retry. Browser/bridge cannot supply commands
  or executable paths. Raw provider logs are not exposed.
- Browser now offers Run agent, fresh session default, explicit continuation,
  real activity, supported one-time command/file approvals, questions, Stop,
  retry and existing human review. Follow-ups retain immutable revisions and
  default to fresh sessions. Provider configuration is inherited, not weakened.
  Unknown permission requests, secret-input questions and file-root expansion
  fail closed. Sessions are limited to one editing run at a time and runs to
  30 minutes. Cancellation does not revert edits.
- Enabled managed Codex in this repo's ignored local config using
  `bun packages/cli/src/index.ts agents --agent codex --managed`. Restart dev to
  load it. This mode does not need a project MCP registration.
- Validation: `bun run test` passed 80 tests; full Playwright suite passed 9
  scenarios. After subsequent protocol/startup changes, all 3 managed/installation
  browser cases passed again; packaged automatic runner startup also passed.
  Typecheck, lint and full workspace production build passed. Formatting fixed
  after detecting one unformatted bridge file. No publishing/Git operations.
- Live smoke attempted an isolated button-padding edit through the real Codex
  executable. Initialization failed: its user-profile SQLite memories database
  cannot be opened under this sandbox's permissions. No live model edit succeeded.
  Do not confuse fixture coverage with live-provider validation. The corresponding
  checklist acceptance gate remains open. Linux/live-provider behavior and broader
  permission variants remain unverified; no permission bypass was attempted.
- Next: restart dev outside this sandbox, submit a small real request, verify
  progress/required approvals, inspect the edit, accept, and try an explicit reused
  session. Then add in-UI model configuration and the next provider adapter.

## Claude and OpenCode managed adapter previews

- Added provider-neutral runner contracts and dispatch for Codex, Claude and
  OpenCode. Persisted sessions validate provider compatibility; the picker filters
  incompatible sessions. The existing Codex local preference was retained.
- Claude uses official Agent SDK query, explicit resume, structured reports,
  canUseTool for permissions/AskUserQuestion and abort/interrupt. User/project/local
  settings are inherited. SDK resolves from the target app and remains optional
  in the distributable. No global permission mode or auto-approved tools added.
- OpenCode uses a private `opencode acp` subprocess with bounded JSONL transport,
  fresh/load sessions, streamed activity, allow-once/deny, form questions, cancel
  and validated JSON reports. Unknown requests/forms fail closed. No shared-server
  attachment, credentials copied or global settings changed.
- Deterministic tests cover fresh/explicit sessions, denial/questions, cancellation,
  process exit and report parsing. Three Playwright managed-loop cases verify
  refresh, review, continuation and Stop. `bun run test`: 89 passed; lint, typecheck
  and production build passed. All 18 Astro files checked without diagnostics.
- Initial full browser run had one existing reload/pin failure while retaining
  many previous runs' records; isolated rerun passed. Browser harness now creates
  and cleans up unique state for each suite rather than accumulating annotations.
  Full suite subsequently passed all 11 scenarios (30 seconds).
- Limits: Claude CLI/SDK are absent here; registry install failed with connection
  refusal. Requested user installation using `bun add -d
@anthropic-ai/claude-agent-sdk`; no completion reply yet. SDK compatibility and
  live authentication remain unverified. OpenCode package metadata reports 2.2.6,
  but running it fails on its profile log directory due sandbox permissions.
  No live model changes are claimed for any provider.
- An exploratory malformed-report subprocess fixture timed out before returning
  its prompt result. It was replaced by explicit parser rejection coverage;
  full malformed-report transport regression remains to investigate alongside live
  protocol validation. Exit/cancellation and success paths are process-tested.
- Next: finish SDK installation/version validation, then run small real edits
  with each authenticated provider outside profile restrictions. Expand complex
  OpenCode form support only against verified protocol schemas.

## ACP unification after the Zed integration clarification

- Replaced direct Codex app-server and Claude SDK implementations with a shared
  `AcpTurn` for all managed providers. Removed obsolete provider runtimes/tests;
  retained shared run/session/review ownership, fresh-session defaults and explicit
  continuation. The shared client handles session/new/load, streaming, one-time
  permission decisions, supported forms, cancellation and report validation.
- Setup manages `@agentclientprotocol/codex-acp` 2.6.0 and
  `@agentclientprotocol/claude-agent-acp` 0.107.0 in ignored `.nudge/agents/`, or
  uses ACP executables already on PATH. OpenCode runs `opencode acp`. Adapter
  packages can contain their underlying runtimes; no SDK dependency is required
  in target apps. Removed the release manifest's optional Claude SDK peer.
  Package identities/entries are validated; installation has a 3-minute deadline.
  These versions came from maintained upstream manifests, not a successful npm
  registry download; installation/live compatibility still need verification.
- Agent-native authentication and configuration control subscriptions/billing.
  Nudge does not collect credentials or call model APIs directly. Native API-key
  credentials may still select API billing; select subscription sign-in explicitly.
- Transport uses Bun's native bounded subprocess pipes. The malformed-report
  process regression now passes using an explicit settled-outcome assertion;
  Bun's rejects matcher reproduced the prior timeout. This supersedes the open
  malformed-report investigation noted in the previous entry.
- Validation: 88 unit/integration tests passed (including shared ACP process
  cases for all three providers, malformed reports and exit/cancellation); all
  11 Playwright scenarios passed. Production build/typecheck passed, with no
  diagnostics in 18 Astro files; lint passed. Adapter resolution tests verify
  isolated state, preservation of app package.json and path-traversal refusal.
- Actual setup attempt via `agents --agent codex --managed` failed downloading
  the adapter manifest (ConnectionRefused). Requested the user rerun Claude then
  Codex setup outside the sandbox; no completion response yet. Existing local
  agent preference was preserved on installation failure. No live provider edit
  or successful real adapter install is claimed. Prior profile restrictions still
  apply. Nothing published or committed.
- Next: complete real adapter installation, verify native subscription sign-in,
  then exercise real requests, approvals, Stop, review and explicit continuation.

## Documentation clarity and product introduction

- Rewrote README and the public introduction to lead with the concrete product:
  select an element, leave a pinned request, run an agent, inspect the app and
  accept or iterate. Removed the old brand metadata/bootstrap narrative and
  MCP-first framing from the primary reading path.
- Reorganized getting started into demo, local archive installation, first
  request, health check, source-checkout alternative and removal. Explicitly
  distinguished Queue for agent from Run agent, unpublished registry commands
  from installed local commands, and live-provider status from fixture coverage.
- Added `/docs/agents/` as the main Connect your agent guide with ACP, native
  subscription/API billing distinctions, adapter ownership and setup commands.
  Kept `/docs/mcp-setup/` working as optional External MCP integration under
  Reference. Updated workflow, privacy, snapshots, troubleshooting and HTTP/MCP
  references, including managed-run routes and runner capability scope.
- Updated the downloadable setup skill using skill-creator guidance and refreshed
  contributor product/architecture/protocol/UX/security/quality/roadmap text plus
  START-HERE-PROMPT.md. Historical decisions remain historical, now labeled as
  superseded where later phases changed scope. Checklist updated.
- Validation: `bun run website:build` passed (12 pages and production search
  index); `bun run website:check` passed with zero errors/warnings/hints in 18
  Astro files; `bun run format:check` and `git diff --check` passed. Full
  `bun run website:test` passed all 15 scenarios in 41.7 seconds after updating
  TOC tests to the renamed Try the demo heading. Link coverage includes the new
  agent page and downloadable skill; internal contracts/credentials remain 404.
- Initial website test run had two stale heading expectations and a search-focus
  failure. Heading targets were updated; isolated search rerun and the final full
  suite passed. No UI/mockup implementation changes were made.
- The skill's Python quick_validate command could not run because Python is not
  installed on PATH. Frontmatter/name, scope, commands and public asset links
  were reviewed manually; website asset/link validation passed.
- Live ACP package installation/provider authentication gates are unchanged.
  Next implementation work remains real adapter installation and authenticated
  request/review verification; no publication or Git operations performed.

## Onboarding polish

- Added a keyboard-accessible Agent setup dialog in the SDK toolbar: provider
  selection, copyable project-specific setup command, native login guidance,
  separate bridge/selection/adapter/runner/sign-in/billing checks, refresh and a
  first-annotation action. Incomplete setup stays explicit; no automatic modal
  interrupts the app. Opening/closing setup preserves an existing comment draft.
- Installation instructions use progressive disclosure when the connection is
  available; the close control stays at the top. Real fixture screenshots were
  inspected at desktop/mobile sizes in `.nudge/onboarding-{desktop,mobile}.png`.
- Extracted shared bounded native-CLI readiness probing. The runner checks only
  the selected provider while idle and posts enum-only readiness on its scoped
  authenticated route. No raw stdout, account email or credentials reach the UI.
  Subscription versus API/provider sign-in is a detected hint, not verified
  model access or a promise of actual billing. Unknown/stale checks stay unverified.
- Run controls require an online runner and fresh available-adapter check;
  explicit sign-in requirements block dispatch in the UI. Save without running
  persists a comment for later. Existing managed fixture flows report readiness
  before starting work. No browser/bridge shell execution was introduced.
- `init` now defaults to managed ACP setup; `--external` selects external MCP,
  `--skip-agent` preserves current agent selection, and existing `agents` command
  flags stay compatible. CLI feedback uses clear labels and errors omit source
  stacks. A real CLI subprocess test verifies the managed default with a present
  fixture adapter and no host-config writes or registry download.
- Updated README, public agent/getting-started/workflow/API guides, setup skill,
  decision log and checklist. Live ACP installation/provider validation is still
  open; this session did not claim or perform a live model edit.
- Validation: 91 unit/integration tests passed, full tool Playwright suite passed
  12 scenarios. After compact-layout/fresh-readiness changes, all four managed
  and onboarding cases passed again; expanded stale-state onboarding test also
  passed. Strict typecheck, lint, formatting and full workspace build passed.
  No homepage mockup implementation or Git/publishing operations were changed.
- Next: install real ACP adapters outside the registry restriction, verify native
  subscription login and a real request/review cycle. In-UI model selection and
  a browser-driven provider login flow remain separate work; onboarding currently
  provides the one-time CLI setup/login commands and readiness hints.

## 2026-11-15 — Installed-preview end-user test drive

- Added `bun run try [--agent codex|claude|opencode|skip] [--prepare]` in
  `scripts/try.ts` and `scripts/test-drive-project.ts`. It builds the private
  archive, seeds an editable standalone Vite app in `.nudge/test-drive`, installs
  the archive, invokes its installed setup CLI and starts the installed Vite entry.
  No fixture agent is installed for users. App files, requests and selected agent
  survive reruns. Local AGENTS/CLAUDE instructions scope changes to the sample app;
  existing custom instructions are preserved. The sample is ignored local state,
  so docs explain keeping work before removing the repository's `.nudge` folder.
- Replaced plain install on reruns with `bun add -d <archive>`. A real archive
  refresh regression test first exposed that Bun 1.4.4 retained old package bytes
  at an unchanged tarball path/version; the new command refreshes the dependency
  while preserving app source. Two test-drive contract tests cover ownership,
  preservation, dependency refresh and app instruction scope.
- Added side-effect-free CLI help/version, sharing the preview version with the
  packager in `packages/shared/src/release.ts`. Browser coverage verifies the
  installed `bunx --bun usenudge --version`, help, setup, health check and build.
- Added an installed-package browser test: only Vite is linked to the existing
  dependency for offline installation; all Nudge code comes from the archive.
  The real packaged runner launches a deterministic ACP fixture, edits app CSS,
  HMR updates the button, and human acceptance persists across reload. The fixture
  is test-only and is not part of the archive or generated end-user app.
- Initial process tests failed Windows cleanup when terminating a package-manager
  wrapper. Starting Vite's installed entry directly gives the launcher/test direct
  server ownership; the final installed browser test and cleanup pass. This does
  not constitute Linux validation or a real provider run.
- Updated README, public getting-started/test-drive guides and sidebar, decision
  D-024 and implementation checklist. Updated TOC heading targets in website tests.
  A cold-load search check failed before Starlight/Pagefind initialization; the
  test now waits for its client controls/input before exercising Ctrl+K. No website
  mockup or UI redesign was performed.
- Validation: `bun run test` passed 93 tests; full `bun run test:e2e` passed 13;
  full `bun run website:test` passed 15 after the search initialization correction.
  `bun run build`, `bun run typecheck`, lint and targeted formatting checks passed.
  After the final helper changes, its two contract tests, installed browser test,
  strict TypeScript and lint passed again. The release archive was rebuilt by
  the installed-package test with the current README and CLI.
- Direct launcher check `bun run try --prepare --agent skip` built the archive and
  created the app, then failed resolving Vite with registry ConnectionRefused.
  It left a retryable app and printed an actionable error. Real registry install,
  real ACP adapter downloads/authenticated edits and Linux checks remain open;
  no publication or Git operations were performed.
- Next: run `bun run try --agent codex` in an unrestricted terminal, finish native
  sign-in/setup if needed, request a button change, inspect it and accept/revise.
  Repeat for Claude/OpenCode and Linux before calling those paths release-verified.

## 2026-11-15 — Existing-project install, decoupled dev mode and release setup

- Superseded the previous test-drive approach by user direction. Removed the
  tracked `apps/demo` app, demo startup script, public try launcher/generator and
  test-drive guide. Root dev now serves the website. Updated Bun lockfile and
  compiler/workspace references; ignored user-local state was not wiped.
- Default `usenudge init` now writes only self-ignored `.nudge` state. Added
  `usenudge dev`, resolving Vite from the consumer and injecting the serve-only
  plugin programmatically. App source, config, normal dev/build scripts and root
  gitignore stay untouched. Existing dev dependency/lockfile installation remains
  an intentional package-manager change. No browser/bridge shell execution added.
- Kept prior wrapper setup behind explicit `--integrate`. Its portable wrapper
  must be committed with the dev script; migrated the old exact ignore entry so
  clean clones do not reference a missing file. Source-checkout absolute imports
  are documented as unsuitable for consumer commits. Duplicate Vite injection
  fails clearly. External MCP requires a stable installed executable path.
- Added real Git-status coverage in an isolated temporary repository: repeated
  local setup evaluates no app config, changes no tracked files, and its nested
  ignore hides local state. A new React Strict Mode test checks disabled behavior,
  single overlay mount and cleanup without retaining a demo workspace.
- Browser tests now generate small temporary consumers. Installed-package tests
  launch the actual CLI dev command, preserve the consumer manifest/config, run
  the real bundled runner with a test-only ACP fixture, edit CSS/HMR, persist
  human acceptance, check health/production and shut down through the parent pipe.
  Fixtures are never installed by a user-facing command or included in the archive.
- Initial workflow/snapshot cases reached an unrelated running app through fixed
  localhost ports. Replaced those fixture URLs/bridge ports with dynamic IPv4
  loopback ports and worker fixtures; left existing user servers untouched. The
  full final browser suite passes. Initial React test needed a ResizeObserver
  shim and an explicit wait for the wrapper's lazy import; final unit suite passes.
- Prepared `package.release.json` as the single public version/metadata source,
  package-specific README, changelog and user-approved MIT license. The bundler
  collects actual dependency license files (or their shipped README attribution
  if no license file exists). Added strict checks against the actual 12-file
  archive, including metadata/version, notices, shebang and private/workspace data.
  Internal workspaces/root stay private; the generated public package is publishable.
- Added `release:check`, archive checks to CI, and manual `publish.yml`: check out
  an existing version tag, verify/build/test and dry-run, then publish the same
  artifact from the separate npm environment using OIDC. Bun owns installs/builds;
  npm is used only for CI publishing/provenance. Added `docs/RELEASING.md`; no
  registry publication, remote settings, tag/commit or push was performed.
- Applied the skill-creator guidance to canonical `skills/nudge-project-setup`
  and matching website download, and shipped the skill in the package. It explains
  local/persistent setup and staged-diff review without blanket restores,
  automatic staging or Git writes. Updated README, public installation commands,
  navigation, troubleshooting, contributor contracts, D-025 and checklist. The
  homepage mockup implementation was not changed.
- Final `bun run release:check` passed end to end: 95 unit/integration tests across
  20 files, all 13 tool browser cases, all 15 website cases, strict TS/Astro checks,
  lint, all builds, packaging and archive validation. Frozen offline install
  passed without lockfile changes. Initial release lint failure on Playwright's
  empty fixture binding was corrected; the final aggregate command passed.
- Remaining owner/environment checks: npm namespace ownership, upstream-license
  review, real ACP adapter installation/native authentication/edit/review on
  Linux and intended platforms, remote trusted-publisher/environment setup and
  explicitly authorized first publication. Automated fixture success does not
  establish live model access or actual registry publication.

- Final packaging/documentation refresh: targeted formatting and `git diff --check`
  passed. Rebuilt the archive after the package README clarification; archive
  validation passed again. `bun publish ./dist/usenudge.tgz --dry-run --access
public --tag preview` failed with missing authentication. The alternate local
  npm dry run could not start because npm is not installed. No credentials were
  supplied, no login was started, and nothing was published. CI provides Node/npm;
  actual authenticated publishing remains an owner/environment step.
- Automatic approval review rejected deletion of leftover ignored generated
  `apps/demo` build/dependency directories with the reported reason “blocked by
  policy.” The tracked demo files/workspace/startup are removed and no longer
  build or ship. Those ignored cache directories remain for manual removal;
  no alternate deletion mechanism was attempted after the rejection.

## Website clipboard test in CI

- Updated the setup-copy browser test to grant clipboard permissions and verify
  the copied command text, normalizing Windows CRLF clipboard line endings.
  The previous test assumed clipboard write permission, which can fail in CI.
- Validation: `bun run website:build`, `bun run lint`, and the full
  `bun run website:test` suite passed locally (15 tests, Windows). The Linux CI
  run remains to be verified after the change is pushed. The initial enhanced
  assertion failed on Windows CRLF; normalization fixed it.

## Cloudflare Workers deployment setup

- Added `apps/website/wrangler.jsonc` for a static-assets Worker named
  `nudge-website`, with the generated `dist` directory, custom 404 handling and
  branch preview configuration. Added Wrangler 4.162 as a website dev dependency,
  root/website production, preview and dry-run scripts, and `.wrangler/` ignore.
- Documented Workers Builds root/build/deploy/preview commands and variables in
  the website README. The Worker name must match the dashboard project; domain
  and account-specific routes remain dashboard configuration. This prepares a
  Workers project, which has a different flow from Cloudflare Pages.
- Validation: frozen offline Bun install, website build, website typecheck,
  targeted Prettier check and all 15 website browser tests passed locally.
  The sandbox's Wrangler dry run failed due to profile-write and ancestor-directory
  access restrictions. The user ran `bun run website:deploy:dry-run` outside the
  sandbox and reported that it succeeded. No remote deployment was performed.
- Next: commit/push these changes, match the Worker name to the Cloudflare project,
  apply the documented build settings and attach the user's domain in Cloudflare.

## In-browser agent selection and sign-in

- `init` now auto-detects an installed agent when `--agent` is omitted.
- Agent setup panel: per-agent status, `Use <agent>`, `Sign in with <agent>`
  (Codex/Claude). New bridge routes: `POST /agents/select`, `POST /agents/login`
  (browser) and `/runner/agents`, `/runner/setup/claim`, `/runner/setup/update`
  (runner). Runner re-reads `agent.json` each cycle, reports all agents, runs
  setup tasks with the non-blocking adapter installer and login subprocess.
  The Vite plugin always launches the runner. See D-026.
- Validation: tsc, oxlint, prettier, 100 unit/contract tests and all 13 browser
  tests passed (Windows). Not verified: real `codex login` / `claude auth login`
  output, Windows `.cmd` CLI shims, or an end-to-end live agent run.

## Overlay redesign, pin recovery and dev port selection

- Overlay restyled with website brand tokens (dark/light via prefers-color-scheme),
  rounded corners, icon-only toolbar buttons (accessible names unchanged).
  Toolbar: small pill, bottom-centre, can be hidden leaving an edge that
  reveals on hover/keyboard focus (per-viewer localStorage).
- Tray and docked comments are a full-height side panel that pushes the page
  via a temporary root margin-right (restored on close/destroy). Requests
  opened from it stay in it. Rows show a status dot and title only; comments
  show the prompt and one run-status line; details are collapsed or in tooltips.
- Pins: new `locateAnchor` accepts a unique positional match with matching tag
  and text (or position), so pins survive reloads/re-renders for elements
  without id/test id. Snapshot comparison still uses strict `findAnchor`.
- `usenudge dev` without `--port` picks the first port free on both 127.0.0.1
  and ::1 from the app's configured port (respects strictPort). Previously Vite
  could bind ::1 while another server held 127.0.0.1 on Windows.
- Validation: tsc, oxlint, 102 unit/contract and all 13 browser tests passed;
  checked visually in the browser pane. Agent setup dialog still dense.

## Toolbar hiding, spinner, tooltips and pins that follow agent edits

- Hide works like Astro's dev toolbar: eye-off icon hides the bar at once even
  under the cursor; it peeks back when the pointer returns to the bottom edge
  and re-hides 400 ms after leaving. Eye icon keeps it visible.
- 3x3 square spinner with a diagonal opacity wave replaces the ring spinner
  and pulsing dot (new `packages/core/src/spinner.ts`).
- Agent setup uses a gear icon. Native `title` tooltips replaced by styled
  `data-tip` tooltips (delayed on first hover, instant between controls, shown
  on keyboard focus too).
- Pins follow replaced elements: the live node while connected, then strict
  anchor, then same position and tag (text may differ), then unique tag+text,
  then whatever now occupies the last known spot. The "element not found"
  notice is removed. Before/after comparison still uses strict `findAnchor`.
- Validation: tsc, oxlint, 102 unit/contract and 13 browser tests passed.
  In the browser pane: renamed and restyled the pinned button and reloaded;
  the pin and comment stayed attached with no notice.

## Icon submit buttons, Enter to submit, pin spinner, annotation cursor

- Shared `packages/core/src/icons.ts` (icons, setIcon, iconButton,
  submitOnEnter). Submit actions are icon buttons with unchanged accessible
  names: Run agent/Queue for agent (send/bookmark), Save without running,
  Request changes (send, beside the follow-up box), Retry agent, Stop agent,
  Send answer. Composer's duplicate Cancel removed (header close and Escape
  remain). Accept sits on the right with a check icon.
- Enter submits the composer, follow-up and question boxes; Shift+Enter and
  IME composition insert a new line.
- Comment popups stay aligned with their marker: they move up only when less
  than 220px remain below and otherwise shrink and scroll; the composer
  re-finds its element if HMR replaces it while typing.
- Pins show the 3x3 spinner while their agent run is active, whether or not
  the comment is open.
- Annotation mode uses a temporary page-wide custom cursor (coral arrow with a
  comment badge), removed when annotation ends.
- Validation: tsc, oxlint, 104 unit/contract and 13 browser tests passed.
  Browser pane: composer layout, Enter submit, cursor and popup placement
  checked. The pin spinner was not seen live (no running agent in the pane).

## Interactive init, popup fixes, page-wide requests, theme and scrollbars

- `usenudge init` is interactive in a TTY (@clack/prompts 1.9.0, MIT, bundled):
  agent multiselect with live status, default agent, browser vs MCP, opt-in
  integration; prints the equivalent command. Every choice has a flag
  (`--agent a,b`, `--external`, `--integrate/--no-integrate`, `--yes`);
  non-TTY/CI never prompts. New `init-options.ts` (parse + canonical command,
  unit-tested), `init-run.ts`, `brand.ts` (website colours, honours NO_COLOR),
  non-blocking `detectAgentsAsync`. Multiple agents install adapters up front so
  switching in the browser is instant.
- Pins numbered by creation order on the page (bridge lists newest first).
  Replacement search prefers same tag+text before bare position.
- Clicking an open comment's pin closes it; popups keep clear of their pin
  (measured: 8px gap, top-aligned) and are positioned before first paint, so
  submitting no longer flashes the box at the top-left.
- Page-wide requests from a new toolbar button: composer above the bar, no pin,
  "Page" tag in the list, capture option hidden.
- Light/dark follows the system with a System/Light/Dark switch in Agent setup
  (per browser). Thin scrollbars without arrow buttons, transparent track.
- Cursor is the plain coral arrow. The bridge status dot left the toolbar; the
  gear shows a red dot and says so when the bridge is offline.
- Validation: tsc, oxlint, 107 unit/contract and 13 browser tests passed. Browser
  pane (hidden, checked via DOM): numbering, popup gap/no overlap, pin toggle,
  page-wide flow, theme switching. Interactive init checked in a real terminal
  up to the agent prompt. Not seen visually: light theme and scrollbars.

## Agent-generated session titles; quieter init

- Sessions take the title their agent generates over ACP
  (`session_info_update.title`; Claude sends it during the turn, Codex right
  after its first turn). The runner forwards it to a new runner-only route
  `POST /api/v1/runner/sessions/:id/title`; the bridge reduces it to one safe
  line (control/zero-width/bidi characters removed, max 80) and marks the
  session `titled`. After a successful run without a title yet, the runner keeps
  the agent open up to 8 s for it (review is not delayed). The Feedback list and
  session picker show the generated title; the prompt excerpt remains the
  fallback.
- Interactive init no longer prints an agent summary line; the agent question
  already shows each status (spinner without guide line, cleared).
- Validation: tsc, oxlint, 109 unit/contract tests; managed browser tests (all
  three providers, fixture agent sends a title with a control character) pass.
  The real runner's forwarding and Codex's post-turn timing are not exercised
  by tests with live agents.

## Windows: repeated Codex admin prompts; dev port detection

- Diagnosis from ~/.codex/.sandbox logs (read-only): every Nudge Codex run
  logged "sandbox setup marker missing or incompatible" and started elevated
  setup (the admin prompt), which then failed with
  `helper_sandbox_lock_failed ... SetNamedSecurityInfoW ... 5` on
  ~/.codex/.sandbox-bin, so setup never completed and the next Codex process
  prompted again (twice per run: app-server and helper). Nudge's Codex adapter
  ran its bundled Codex 0.166.0 while the user's CLI is 0.169.0; sandbox setup
  is tied to the Codex version.
- Fix: `resolveAdapter` passes `CODEX_PATH` (the user's installed `codex`)
  to the Codex ACP adapter, so Nudge uses the same Codex as the CLI. Env is
  threaded through AcpTurn/JsonRpcProcess. Unit-tested.
- Not fixed by code: the stuck `.sandbox-bin` permissions; the user needs a
  one-time Codex sandbox reset (documented in the reply). Not verified with a
  live Codex run.
- Dev port: a port is free only if both loopback families bind and nothing
  answers a connect on 127.0.0.1/::1. Catches servers bound to all interfaces
  (e.g. `vite --host`), which Windows otherwise lets Nudge shadow on 127.0.0.1.
  Checked: holding [::1]:5173 makes Nudge choose 5174.
- Validation: tsc, oxlint, 110 unit/contract tests, 6 browser tests
  (installation, managed, packaged CLI), package:release + package:check.

## Side panel animation; archive and delete

- Side panel slides in and out (transform via @starting-style and a CSS
  transition, 260ms, drawer curve) and the page push animates on the same
  timing via a temporary root margin-right transition; inline values are
  restored afterwards. Closing slides out before hiding (panel inert), reopening
  mid-close reverses. Reduced motion: instant. Checked in the pane via DOM state;
  the motion itself could not be watched (hidden pane does not run frames).
- Requests can be archived/restored or permanently deleted from the side panel
  (hover/focus row actions, inline delete confirmation, "Show archived (n)").
  Bridge: `/annotations/:id/archive` and `/delete` (browser-only, version
  checked, refused during an active run); archived requests are hidden from MCP
  listing, claim and managed dispatch. See D-027.
- Validation: tsc, oxlint, 111 unit/contract (new archive contract test), all
  13 browser tests; side panel flows exercised in the preview via DOM.

## Parallel runs; bar always opens; no jump on submit

- Simultaneous runs (D-028): RunStore allows overlapping runs across requests
  up to maxParallel (default 3, NUDGE_MAX_PARALLEL_RUNS), still one per request
  and per session; claim hands out the oldest queued run whose session is free.
  Runner refactored to run claimed jobs concurrently (runJob per run, shared
  active set for shutdown). Agent switching still waits for all runs to end.
- Submitting a comment no longer jumps: the saved comment is shown in the same
  task before refreshing (the selection was cleared first, leaving the box
  without an anchor during the refresh).
- The toolbar always starts open; hiding no longer persists across reloads.
- Validation: tsc, oxlint, 112 unit/contract (new parallel-runs contract test),
  all 13 browser tests. Two real agents running at once were not exercised.

## Feedback dot; animated delete confirmation

- The Feedback badge is a 7px dot instead of a number: shown while requests are
  open (not accepted/archived), pulsing ring while any is ready for review
  (static ring with reduced motion). Count stays in the label/tooltip, and it
  updates on every change, not only on refresh (it previously counted accepted
  requests too, so it never went down).
- Archive stays one click (reversible via Show archived); delete keeps its
  inline confirmation, whose label and buttons now enter with a 180ms
  opacity + 6px slide, strong ease-out, 30ms stagger (@starting-style).
- Validation: tsc, 112 unit/contract, 7 browser tests (loop, managed,
  installation); dot state and confirmation transitions checked via DOM.

## Pins linked to the side panel; uncovered pins; compact Agent setup

- Side-panel rows show the same number as their pin (shared `pinNumbers()`;
  page-wide rows keep the "Page" tag). Hovering/focusing a row highlights its
  pin (scaled with a ring) and outlines its element (dashed `.highlight-box`);
  hovering a pin highlights its row.
- Pins of other requests under an open pinned popup fade out and stop taking
  clicks instead of sitting on its text; the popup's own pin stays.
- Agent setup is compact: agent status lives in the dropdown labels, Use/Sign
  in share a row, a one-line state summary (green when ready), the checklist and
  setup steps fold away when ready and open when something needs attention,
  the privacy note moved into the setup steps, Appearance sits at the bottom.
  Tests that read the checklist in the ready state now open "Connection
  details" first.
- Validation: tsc, oxlint, prettier, 112 unit/contract, all 13 browser tests;
  dialog checked from the onboarding test screenshot (light theme).

## Flush side-panel list with title, excerpt and time

- Side-panel rows are a flush list instead of cards: transparent rows, hover and
  pin-linked highlight on a soft background with an accent edge. Each row shows
  status (dot or grid spinner), a title (agent-generated or the prompt's first
  line), a one-line excerpt (agent summary when finished, the latest activity
  while working, else the prompt or status) and a relative time with the pin
  number or Page tag. Archive/delete icons replace the time and marker on hover
  (always shown on touch, where the meta hides).
- Validation: tsc, oxlint, prettier, 112 unit/contract, 13 browser tests; dark
  and light screenshots taken with Playwright against the preview app.

## Product aesthetic pass; layout settings

- Overlay restyled toward the user's references (Kodeo/CodaAI) on a black and
  white base: true-black dark surfaces, hairline borders, 14px panels, 9-10px
  controls, the coral accent kept. Bar is a rounded rect; side panel has a
  sticky header, a "New request" row and requests grouped as Open / Accepted
  (Archived in its own view).
- New "Layout and theme" popover on the bar (scale-in from its button, 160ms,
  reduced-motion safe): toolbar position bottom/top/left/right (vertical on the
  sides, hide slides toward its edge), side panel left/right (page pushed from
  that side; switching while open restores the old side first), and theme
  (moved here from Agent setup). Preferences stored per browser. Tooltips point
  away from vertical/top bars; the page-wide composer avoids the bar.
- Website: rounded install box, demo, review image, terminal, buttons; frame
  lines removed; docs sidebar uses soft filled rows instead of corner frames;
  rounded code blocks, asides, search and pagination. Original black/white
  canvases kept (user preference). Website tests updated for the new docs rows.
- Validation: prettier, oxlint, tsc, 112 unit/contract, 13 overlay browser
  tests, 15 website tests; screenshots (Playwright, installed Chrome) of the
  overlay in several layouts/themes and of the site before/after.

## Website: no hard edges; docs row states

- Header and footer are rounded inset panels on the code-block surface;
  the step rail and "Your project" band are rounded inset panels instead of
  full-width strips; the demo has a full rounded border (inset only on small
  screens, so its fixed desktop height still fits without internal scroll);
  the theme toggle lost its separator.
- Docs sidebar: hover adds a background only (normal text colour); the current
  page has the accent text on a soft background.
- Demo internals match the overlay: rounded metric/chart cards, rounded demo
  popover with softer border and shadow, rounded buttons and comment box.
- Validation: prettier, oxlint, 15 website tests (the demo-overflow test caught
  the first inset attempt); screenshots of home, docs nav and the demo in both
  themes from the built site.
