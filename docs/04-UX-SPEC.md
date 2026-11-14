# 04 — Browser UX specification

## Core experience and UI regions

1. **Compact floating toggle** at bottom-right, draggable/position-preserving only if simple. Show annotation count.
2. **Hover outline** and minimal tooltip (tag, accessible name/test ID when safe).
3. **Selection composer** anchored near clicked element; comment text area, cancel, queue button, privacy notice for optional screenshots.
4. **Review tray** for pending/in-progress/ready/accepted annotations on current page.
5. **Review detail**: original request, agent summary, changed files, before/after images if available, accept / request changes actions.

Use Shadow DOM style isolation. Respect dark/light preference and keyboard focus. Default overlay disabled so the app works normally.

## Interaction rules

- Toggle via button and a documented keyboard shortcut (e.g. `Alt+Shift+A`) with collision handling; focus remains accessible.
- While annotation mode is active, pointer click selects an element rather than invoking its click handler; outside annotation mode app interactions remain untouched.
- Overlays must not intercept typing inside app input fields if annotation mode is off.
- Escape closes composer / exits selection; Shift+Tab and Tab navigate controls.
- Selection outline updates on scroll and resize without full-page reflow.
- Self-targeting must be impossible: ignore Nudge's own host, dialogs and overlays.
- Composer requires non-empty trimmed comment with max length (2,000 characters).
- Helpful errors for bridge unreachable, unauthorized, snapshot failed, stale annotation, ambiguous anchor.
- Queue action should not be blocked by screenshot failure.

## Status labels (must be truthful)

| Internal state     | Human label      | Meaning                                                          |
| ------------------ | ---------------- | ---------------------------------------------------------------- |
| `queued`           | Queued for agent | Local bridge saved request; agent has not necessarily seen it    |
| `in_progress`      | Agent working    | An MCP client claimed task; not a guarantee of ongoing execution |
| `ready_for_review` | Ready for review | Agent reported completion; developer must inspect result         |
| `accepted`         | Accepted         | Developer accepted reported change                               |

Never label `queued` “Sent to Codex” unless a future verified adapter actually submits to a live session.

## Screenshot review presentation

- Side-by-side images or a simple before/after toggle.
- Show timestamps and exact capture confidence / failure state.
- If either image is unavailable: retain summary and manual review controls, display **Comparison unavailable**, and allow retry capture when feasible.
- No fake heatmap or fabricated diff percentages.
- Highlight changed files as plain text; an IDE navigation integration is later.
- On request changes, collect an explicit follow-up message and create next revision.

## Visual style

Quiet developer-tool aesthetic; compact toolbar, neutral surfaces, restrained accent for selection, readable typography, 4/8px rhythm, shadows and outlines that work over different app backgrounds. Not a full-screen dashboard. Use simple accessible primitives; demo may use shadcn/ui but injected overlay must stay framework-neutral.

## Important edge cases

- Element removed after HMR → stale anchor, manual reselect.
- Element moved → recompute highlight; persist updated rect only if re-anchoring is confident.
- Multiple matching selectors → ask developer to choose; don't silently recapture wrong node.
- `iframe` / closed shadow root → MVP unsupported; explain rather than crash.
- Canvas/WebGL element → can anchor wrapper but may not generate correct image; graceful failure.
- Comment input / password field → redact value, never include input value in payload.
- Cross-origin images / fonts → screenshot library may fail; fall back gracefully.
- Bridge stops → show disconnected, keep composer text until retry.
- Duplicate hot reload mounts → exactly one active toolbar.

## Example demo copy

- Toggle tooltip: “Annotate UI”
- Empty composer: “What should the coding agent change here?”
- Queue success: “Saved locally. Ask your coding agent to read Nudge annotations.”
- Agent completion: “Agent reported a change. Review the result before accepting.”
- Missing capture: “This element could not be captured. You can still review the code and accept or iterate.”
