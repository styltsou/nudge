# Nudge website

Public product site and user documentation built with Astro, Tailwind CSS 4 and
Starlight. Package name: `@usenudge/website`.

From the repository root:

```sh
bun install
bun run website:dev
```

Open `http://localhost:4321`. Search is indexed at build time; use the static preview
to try the complete search experience. For a static build and preview:

```sh
bun run website:check
bun run website:build
bun run website:preview
bun run website:test
```

The browser suite expects a fresh static build so Pagefind search is available.
It owns an isolated Astro preview on port 4322 and closes it after the run. `bun run dev` at the repository root is also an alias for website development. The tool is installed into an existing user project; no demo workspace is maintained.

## Content boundaries

- `src/pages/`: the product homepage and custom 404.
- `src/content/docs/docs/`: public guides and references, served under `/docs/`.
- Repository-root `docs/`: internal product contracts and architecture for contributors/agents.
- Repository-root `tasks/`: implementation backlog and historical session results.
- `design-references/`: local design references supplied by the user. They are not copied into the built site.

The website has no bridge dependency and never loads `.nudge` credentials or state.
The homepage walkthrough uses clearly labeled sample data. The real review image
in `public/images/review.png` is copied from the existing isolated browser-test
artifact in `docs/assets/review.png`.

## Design and themes

Both themes use the same restrained typography, neutral surfaces, compact
controls and fine structural borders. The user selected the dark technical
references after rejecting the original rounded marketing treatment. The
annotation interaction is the visual subject; the example selects a button and
attaches a request rather than showing a generic dashboard. See [the design
direction](DESIGN.md).
The main canvases are `#fff` in light mode and `#000` in dark mode. Primary buttons
use coral `#e05246` with black text in light mode. Dark mode uses brighter
`#ef6b5e` for buttons, accent text and frames;
light-mode links use the darker `#a8322b` for contrast. Success green is reserved
for acceptance. The homepage and Starlight share the
`starlight-theme` preference, and Public Sans is self-hosted.

The homepage and docs use the same `Brand.astro` mark and `ThemeToggle.astro`
single sun/moon icon button. It follows the system initially and remembers an
explicit user choice across pages/reloads. The docs
retain native Starlight search/sidebar controls, with
full-height header dividers and a 24px GitHub icon. Mobile keeps these controls
visible in separate cells alongside the menu button.

Header and docs-sidebar hover/focus states use coral corner frames. The selected
sidebar link uses a persistent frame and accent text with no filled background.
Sidebar navigation frames have subtle dashed connecting edges; header frames
keep just their corners alongside the existing full-height dividers.
Shared `frames.css` styles these states, including a forced-colors focus fallback.

Code blocks use Vesper (dark) and GitHub Light (light), configured in
`ec.config.mjs`, with flat borders and native copy controls. Website builds force
a content-cache refresh so changes to highlighting cannot leave cached Markdown
pointing at removed CSS assets. Restart the dev server after changing Starlight
component overrides if its existing config has not refreshed.

Search and On this page use flat controls and raised neutral panels. The mobile
TOC override uses native details/summary and anchors with Motion 14's JavaScript
`motion/mini` API controlling pointer entry/exit. The panel stays rendered until
exit finishes and rapid reopening retargets the current animation. Keyboard,
anchor navigation and reduced-motion actions are instant. It needs no React
renderer. Shared `scrollbars.css` provides transparent tracks and thin
primary-color thumbs without arrow buttons.

Change shared colors/fonts in `src/styles/tokens.css`, homepage surfaces in
`src/styles/home.css`, and documentation overrides in `src/styles/docs.css`.
The accent choice remains easy to revise after visual review.

## Hosting configuration

The output is a static `dist/` folder. `wrangler.jsonc` deploys these assets on
Cloudflare Workers, including the custom 404 page; no Worker script or Astro
server adapter is needed. The Worker name is `nudge-website` and must match your
Cloudflare Workers project name. Change it in the configuration if your existing
Worker uses a different name.

For a Git-connected **Workers** project, configure these Workers Builds settings:

| Setting         | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Root directory  | Repository root (`/`)                                    |
| Build command   | `bun install --frozen-lockfile && bun run website:build` |
| Deploy command  | `bun run website:deploy`                                 |
| Preview command | `bun run website:deploy:preview`                         |
| Build variable  | `BUN_VERSION=1.4.4`                                      |
| Build variable  | `SKIP_DEPENDENCY_INSTALL=1`                              |

The assets directory is defined relative to `apps/website/wrangler.jsonc`, so
Wrangler picks up `apps/website/dist` regardless of the repository-root build
directory. Cloudflare's build environment needs access to the package registry
to install the lockfile dependencies. Preview deployments require Wrangler 4.135
or later. Production and preview commands publish to Cloudflare when run; do not
run them just to test configuration. To validate locally without deploying:

```sh
bun run website:build
bun run website:deploy:dry-run
```

This is the Workers Builds flow, not a Pages project: Pages has a different
deploy command and output-directory setting. Connect your repository to the
Worker and choose its production branch in Cloudflare. Add your custom domain
in the Worker's **Domains & Routes** after the Worker exists; no account ID,
route or domain is hard-coded in this repository.

When a canonical website URL is owned/configured, set
`NUDGE_WEBSITE_URL` to its absolute HTTP(S) origin before building; Astro/Starlight
then emit canonical metadata and a sitemap. Without it, sitemap generation is
skipped with a build warning rather than assuming ownership of a domain.

Astro CLI telemetry is disabled in the package scripts. The public site uses
self-hosted fonts and local Pagefind search, with no analytics or hosted backend.
