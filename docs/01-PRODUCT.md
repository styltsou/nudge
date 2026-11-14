# 01 — Product requirements

## One-liner

**Nudge** is a local-first visual feedback and verification layer for coding agents: inspect live frontend elements, describe desired changes, let a coding agent implement them, and review the evidence in place.

## Why it exists

Text-only prompts force developers to describe visual elements imprecisely. Ordinary visual annotation systems can attach context to a comment, but stop at handoff. Nudge closes the interaction: comments are structured, their implementation is tracked, and users can review before/after evidence and iterate.

## Primary user and environment

Solo frontend developer using VS Code/Codex/Claude Code/other MCP-capable coding agents, running a local dev server (initially a Vite React project). Secondary persona: developer reviewing an AI-made UI change. No enterprise workflow in MVP.

## Jobs to be done

- **Locate** a visual issue by pointing, rather than verbally describing a selector.
- **Explain** an intended UI change with anchored context and a comment.
- **Hand off** actionable structured information to an agent the developer already uses.
- **Review** what was implemented against the original request, with visual evidence and summary.
- **Iterate** on the same annotation without losing history.

## Canonical experience

1. Developer opens demo app with a small floating Nudge toggle.
2. Developer enables annotation mode: hovered element gets a non-invasive outline.
3. On click, freeze anchor and show a composer attached near selected region.
4. Developer enters comment, optionally captures element snapshot, clicks **Queue for agent**.
5. UI shows **Queued — ask your coding agent to read pending annotations**. No false claim of automatic message delivery.
6. MCP agent lists queued annotations, fetches structured context, edits code using its existing tooling.
7. Agent calls `submit_implementation` with annotation ID, result summary, optional changed files and commit ID; annotation enters **Ready for review**.
8. Browser can capture a fresh screenshot of the anchored region (on demand and, when safely possible, automatically when agent report arrives).
9. User sees before/after and agent summary, clicks **Accept** or **Request changes** (with follow-up instructions).
10. For requested changes, the same annotation returns to `queued` with revision history. Agent can repeat the loop.

## MVP capabilities (must-have)

- Development-only overlay install, vanilla core + React wrapper.
- Hover highlight with correct scroll/resize behavior and keyboard cancellation.
- Single-element selection and accessible comment popover.
- Stable-ish DOM anchor with metadata: URL path, tag, textual snippet (limited/redacted), test ID if present, reasonable CSS selector, bounding box, viewport and timestamp.
- Best-effort element-region before snapshot with capture failure communicated clearly.
- Local bridge with CRUD/read and state transitions and durable SQLite persistence.
- MCP tools for listing/getting feedback and submitting implementation.
- User-controlled accept / request changes and follow-up history.
- Live state updates in browser via SSE or polling (choose SSE by default).
- Before/after UI that refuses to claim verification if after capture is unavailable.
- End-to-end demo and full setup instructions.

## Explicit non-goals in MVP

- Browser extension and zero-install proxy
- Auto-send into active agent conversation
- React Fiber introspection, precise source file/line detection, framework-specific compiler plugins
- Multi-element/multi-step annotations and bug reproduction traces
- AI visual scoring or autonomous repair
- Multi-user sync, hosted product, analytics, billing
- Multi-browser cross-device screenshot orchestration
- Production end-user feedback collection

## Success metrics (development signals, not unsupported market claims)

- New user can go from install to first queued annotation using the README alone.
- End-to-end local flow works on the sample app with no manual DB editing.
- After page refresh, annotations and statuses remain intact.
- Review can distinguish valid after snapshots from missing/stale ones.
- Annotating does not disable app interactions when annotation mode is off.
- No production overlay JS shipped by the documented React integration when gated correctly.

## Product principles

1. **Agent agnostic** — avoid coupling to a single LLM vendor or IDE.
2. **Local first** — zero cloud account; keep project data local.
3. **Accurate states** — never say sent, fixed or verified when only queued or reported.
4. **Explicit user control** — agent proposes, developer reviews and accepts.
5. **Safe default** — no unexpected capture, egress or shell execution.
6. **Small composable core** — vanilla SDK; framework adapters are optional.

## Demo narrative (for GitHub README)

Use a dashboard page with a card and chart. Annotate chart height, queue it, let a running MCP-capable agent adjust CSS/component, submit implementation, see before/after card and approve. Record an authentic GIF after implementation, not a mock.
