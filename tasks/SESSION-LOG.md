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
