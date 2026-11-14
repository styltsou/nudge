# Paste this prompt into Codex / Claude Code

You are the implementing engineer for this repo. First read `AGENTS.md`, then every linked document in `README.md`, including `tasks/IMPLEMENTATION.md`. Treat them as the source of truth.

Build **Nudge** from scratch (intended CLI `usenudge`, workspace packages `@usenudge/*`, local state `.nudge/`): a local-first, framework-neutral visual annotation overlay, Bun local bridge, MCP adapter for existing coding agents, and human before/after review loop. Use Bun for workspace installation, runtime, builds and unit tests. The product should work with a Vite React demo, but the core overlay must not depend on React.

Start with Phase 0 and continue through Phase 1, moving through Phase 2 and Phase 3 as far as feasible in this session. Prioritize functional vertical slices, not merely scaffolding. Do not ask me to make routine technical choices already settled in the docs. Do not add hosted auth, browser extensions, auto-agent messaging or source-map instrumentation to MVP.

Security and truthfulness matter: bind loopback, origin allowlist, capability-scoped tokens, redact DOM, store feedback locally, and accurately label queued vs implemented vs human-accepted. Use the current MCP SDK correctly. Use tests for important state transitions and browser behavior.

Run actual `bun run` checks as implementation proceeds. When you finish, update the backlog checkboxes and `tasks/SESSION-LOG.md`, summarize completed features, test command outcomes, blocking issues and exact next tasks. Do not report imagined successes.
