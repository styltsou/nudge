# Website direction

The initial blended design was rejected. The user chose the two dark technical
references as the direction for this revision. Keep a complete light theme.

## Tokens

- Canvas: `#000000` / `#ffffff`.
- Surface: `#0a0a0a` / `#fafafa`.
- Primary text: `#ededed` / `#181818`.
- Secondary text: `#939393` / `#656565`.
- Structural line: `#242424` / `#e5e5e5`.
- Brand: coral `#e05246`, chosen from the user's four replacement candidates.
  Use it with black text for light-mode primary buttons. Dark mode uses the
  slightly brighter `#ef6b5e` for buttons, accent text and frames.
  Use darker `#a8322b` for small light-mode accent text.
  Supporting tints/shades live in the shared accent scale; success stays green.
- Public Sans, regular display weight; system monospace for actual element IDs,
  tool names and commands. No new font dependency.

## Layout

Use a centered 1160px working area with continuous vertical rails, a compact
header, a left-aligned introduction and a selection example on the right.

Header cells use full-height dividers after the logo, between navigation links
and before the theme toggle. Align their borders with the header edges; keep
contents vertically centered and use cell padding instead of gaps/inset rules.

Apply the header language to `/docs/` too: use the shared framed-n Brand and
shared single-icon ThemeToggle rather than Starlight's theme dropdown. The user
preferred the original single sun/moon icon and rejected the two-icon track.
Show the icon for the action (sun in dark mode, moon in light mode), with an
accessible action label. Default to the system until an explicit light/dark
choice is made, then persist it across pages and reloads. Keep switching immediate.
Keep the
native search and sidebar controls. The GitHub icon is 24px in its own full-height
cell, with a divider before the theme cell. On mobile keep both controls visible
and reserve a separate square cell for the native menu button.

Header links/controls and docs sidebar entries use coral corner strokes and
accent text on hover and keyboard focus. Selected sidebar links keep that frame
and text color without a filled accent background. The four corners repeat the
selection-frame mark; the full-height neutral dividers remain. No decorative
animation. Preserve visible focus in forced-colors mode.

Connect the sidebar frame corners with subtle dashed edges on hover, focus and
current-page selection. Keep these connectors in the sidebar navigation only;
the header already has continuous dividers, so its interactive frames stay as
corner strokes. The dashed edge sits beneath the stronger solid corner marks
and does not add padding, move the text or intercept clicks.

Search uses a flat outlined trigger with vertically centered label/icon/shortcut.
The shortcut has no divider and is smaller and more muted than the label; hide
it in the mobile icon-only control. Search results and the On this page panel
use the same square geometry and thin borders. Floating panels sit on #f4f4f4
in light mode and #101010 in dark mode so they separate from the page canvas.

The On this page dropdown can use restrained pointer motion: 150ms entering,
125ms leaving, opacity plus 4px entry / 2px exit movement, with the shared strong
ease-out curve. Motion's small JavaScript API controls presence: retain the panel
until exit completes, make closing content inert immediately, and retarget from
its current appearance when reopened. This serves spatial consistency without
bounce or list stagger. Keyboard, anchor navigation and reduced-motion actions
stay instant. Search shortcuts and hover frames stay instant. This follows the
invoked Emil design-engineering/animate guidance. The Starlight mobile TOC override
retains native details/summary and anchors, Escape/outside dismissal and current
heading tracking; no React renderer is needed.

Code blocks use Vesper in dark mode and GitHub Light in light mode. Keep their
edges square, border thin, spacing consistent and copy control functional. Remove
the decorative terminal traffic-light/header chrome. Scrollbars use transparent
tracks, thin coral thumbs and no arrow buttons; match surrounding backgrounds.
Secondary links and Previous/Next controls use accent text/icons/borders on hover
and keyboard focus, with neutral backgrounds.

The website mark is a monochrome selection frame: four thin square corners
surrounding a geometric lowercase “n” with a slightly heavier stroke and a
chamfered shoulder. Keep clear space between letter and frame. Use the same SVG
geometry in the homepage/footer, docs title and theme-aware favicon. It should
remain clear at 20–24px beside the restrained Nudge wordmark.

```text
| Nudge                         Docs    GitHub    Theme |
|------------------------------------------------------|
| Show your agent        | Select / Queue / Review      |
| what you mean.         |                              |
| explanation           |       [Publish update]        |
| Get started / Source   |          selection cursor     |
|                       | request + queue               |
|------------------------------------------------------|
| Browser context       MCP handoff       Human review  |
|------------------------------------------------------|
| Review the actual change.    | real review screenshot |
| workflow, limits, doc links  |                        |
|------------------------------------------------------|
| Run it locally.             | source setup commands   |
|------------------------------------------------------|
| Nudge                     Docs / Privacy / Source     |
```

Selection is the visual subject: bounding-box handles, one cursor, the actual
element anchor, and an attached request. A faint construction grid belongs only
to the example canvas. Avoid decorative status dots, fake window controls,
marketing feature cards, repeated taglines, oversized pills and shadows.

The review screenshot remains honest product evidence. The example is labeled as
sample data and preserves its keyboard controls. Queuing does not push an agent
message. The docs use the same neutral surfaces, restrained accent and compact
geometry while preserving native Starlight behavior.

## Review against the brief

The browser mockup shows a sample workspace dashboard, with its Publish update
button selected and a Nudge request alongside it. There is no visible step bar.
It plays through request, queue and review once when visible, with pause/replay
controls and pauses for editing. Reduced motion disables autoplay. Keep the
browser frame and its panels free of internal scrolling; stack on small screens.
The hero's Connect your agent action is an outlined secondary button.

The homepage hero now centers the headline, supporting copy and a compact square
install box above the interactive walkthrough. Bun is the default tab; npm and
pnpm show equivalent `usenudge init` commands. Per user direction, omit proposed
and coming-soon labels from this hero presentation. Preserve the coral
active-tab underline, neutral surface and fine borders in both themes. The lower
source-demo section retains runnable clone/setup instructions.

A generic dashboard/chart was the weakest part of the first design. Replace it
with the annotation interaction itself. The decorative three-feature strip and
three-column process repeated the same information; replace both with one
connected, compact workflow rail. Use border rails to align the real example,
evidence and setup rather than putting each item in another rounded card.

## Agent and framework compatibility

The primary Get started action comes first (left on desktop); Connect your agent
is secondary and links to the primary agent setup guide. The former open-source /
agent-setup hero footnote is removed. All three hero install tabs display and copy
untagged `usenudge` commands, per user direction.

Below the hero, show original agent brand assets with setup links: OpenCode's
official theme-specific wordmarks, Claude's official wordmark (preserving the
orange spark while its text follows the theme), and the official OpenAI Blossom
beside the Codex name. Keep files local, preserve their proportions and document
first-party sources in BRAND-ASSETS.md. This is compatibility presentation, not a
partnership lockup; no separate official Codex mark was verified.

Built for your stack uses four restrained logo tiles, four across on desktop and
two across on mobile: Vite, React + Vite, Astro, and a dashed Next.js tile labeled
Coming soon. Supported tiles link to getting started; the Next.js tile has no
setup link. Keep framework marks in their supplied colors and theme variants.
