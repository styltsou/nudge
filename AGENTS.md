# AGENTS.md — instructions for coding agents

## Mission

Build **Nudge** as a developer-first, local-first visual annotation and verification tool for existing AI coding agents. The defining product behavior is **closed-loop review**: a user annotates a UI element, an agent implements the change, and the user sees evidence and accepts or iterates.

## Naming and publishing

The product is **Nudge**. The intended developer-facing namespace is `usenudge`; names for internal workspace packages are `@usenudge/shared`, `@usenudge/core`, `@usenudge/react`, `@usenudge/bridge`, `@usenudge/mcp`, and `@usenudge/cli`. Reserve `usenudge` for a future CLI entry point if permissible. Keep repo folder `nudge/` and local state `.nudge/`. Do not assume npm scope, domain, or GitHub organization ownership, and do not publish anything or create external resources without explicit approval.

## Read before editing

Read `README.md`, `docs/01-PRODUCT.md`, `docs/02-ARCHITECTURE.md`, `docs/03-DATA-AND-PROTOCOL.md`, `docs/04-UX-SPEC.md`, `docs/05-SECURITY-AND-PRIVACY.md`, `docs/06-QUALITY.md`, `docs/07-ROADMAP.md`, `docs/08-DECISIONS.md`, and `tasks/IMPLEMENTATION.md`. Treat these as product contracts. When they conflict, prioritize safety requirements, then acceptance criteria, then protocol definitions, then implementation suggestions. Record any resolved ambiguity in `docs/08-DECISIONS.md`.

## Workflow

Primary development environment is Linux. Keep text files in LF format as defined by `.gitattributes` and Prettier; keep Bun scripts portable across Linux and Windows.

1. Inspect the repository; do not overwrite existing code without reason.
2. Pick the earliest incomplete task from `tasks/IMPLEMENTATION.md`; maintain its checkbox state.
3. Implement the smallest **working vertical slice**, not only placeholder interfaces.
4. Write or update tests for behavioral changes.
5. Run available validation commands and report actual outcomes (never claim tests passed without running them).
6. Update `tasks/SESSION-LOG.md` with what changed, commands run, test results, blockers, next task.
7. Commit when appropriate in the user's environment; do not force-push or rewrite Git history.

## Commands to provide by end of Phase 1

```bash
bun install
bun run dev
bun run build
bun run typecheck
bun run lint
bun run test
bun run test:e2e
```

`bun run dev` must run the bridge and demo simultaneously. The MCP stdio process is launched **separately** by the agent host and points to the same bridge through a configured local URL/token. Provide a copy/paste MCP config example and a CLI health check.

## Non-negotiable engineering rules

- Core SDK must be framework-neutral, browser-only, type-safe, and **disabled in production by default**.
- Overlay UI must use Shadow DOM; never mutate app styles beyond temporary, fully cleaned-up annotation behavior.
- Never evaluate arbitrary JS from annotations, HTML, CSS selectors or agent responses.
- Treat DOM text, URLs, screenshots and comments as potentially sensitive and untrusted.
- Bind bridge to `127.0.0.1` by default. Explicitly validate `Origin`, use a per-session bridge token and strictly controlled CORS. MCP should use stdio locally by default.
- Do not leak auth tokens into browser-visible logs, browser error messages, screenshots, examples or git.
- No automatic code execution, shell execution or Git writes in the bridge or overlay. The coding agent modifies code under its normal approval and sandbox policies.
- `queued` feedback is **not** an automatic message to the agent. Document and represent this accurately in UI.
- Agent completion is **not** visual correctness. Require human review; automated screenshot comparison is advisory only.
- Attempt element recapture using stable anchors; if missing or ambiguous, display a manual retry or comparison-unavailable state. Never silently compare unrelated elements.
- Do not copy or adapt proprietary / restrictively licensed competitor source code. Implement independently, using public standards and documented APIs.

## MVP hard boundaries

Build only: element hover/select, comment, DOM metadata, durable local storage, local HTTP bridge, MCP read + submit-implementation tools, human review state machine, best-effort element snapshots, React/Vite demo, CLI/docs/tests. The first phase does **not** include: automatic agent prompt push, browser extension, universal source location mapping, hosted accounts, SaaS dashboard, teamwork, Git modification, visual AI grading, multi-step recording, or autonomous browser repair.

## Package structure

```text
apps/demo/
packages/core/
packages/react/
packages/shared/
packages/bridge/
packages/mcp/
packages/cli/             # optional in first slice; keep runnable scripts regardless
```

Use workspace references. Avoid circular package dependencies. `shared` owns common contracts; `core` does not depend on React; `mcp` depends on contracts and talks to the bridge over HTTP, not direct in-memory state.

## Agent integration contract

Tools should be implemented using the current official Model Context Protocol TypeScript SDK; verify the installed version's APIs rather than assuming examples from old releases. Tool IDs and JSON payload semantics are fixed by `docs/03-DATA-AND-PROTOCOL.md`. If the current SDK API differs, adapt the implementation without changing the external contract.

## Acceptance priority

Deliver a working demo that proves the entire annotation → agent tool fetch → implementation submitted → before/after review → accept or revise loop. A polished toolbar without this workflow is **not** done.

## Reporting

At completion of a work session, summarize implemented features, modified files, validations run with pass/fail, remaining issues, and the exact next steps. Update `tasks/SESSION-LOG.md` in-repo. Do not assume user-specific MCP configuration or credentials.
