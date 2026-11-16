# Website brand assets

These files identify supported tools and frameworks. Brand assets remain the
property of their respective owners; they are not Nudge artwork and do not imply
endorsement or partnership. Retrieved from first-party sources on 2026-11-16 and
stored locally in `public/images/brands/` (Claude is an inline component), without runtime CDN requests.

| Files                                     | Official source                                                                                                                                                                                                    | Presentation                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `opencode-light.svg`, `opencode-dark.svg` | [OpenCode brand guidelines](https://opencode.ai/brand), [light wordmark](https://opencode.ai/brand/files/opencode-wordmark-light.svg), [dark wordmark](https://opencode.ai/brand/files/opencode-wordmark-dark.svg) | Unmodified wordmark; correct theme variant.                                                                              |
| `src/components/ClaudeMark.astro`         | Original Claude spark path from [claude.com](https://claude.com/)                                                                                                                                                  | Original orange spark path and proportions; Claude Code is rendered as product-name text.                                |
| `openai-light.svg`, `openai-dark.svg`     | [OpenAI brand guidelines](https://openai.com/brand/), [official logo archive](https://cdn.openai.com/brand/openai-logos.zip), `OAI_OpenAI-Blossom_Black.svg` / `OAI_OpenAI-Blossom_White.svg`                      | Unmodified OpenAI Blossom beside the Codex name. This is the OpenAI mark, not a separately verified Codex-specific logo. |
| `vite.svg`                                | [Vite website icon](https://vite.dev/logo-without-border.svg)                                                                                                                                                      | Original colors and proportions.                                                                                         |
| `react.svg`                               | [React brand logo](https://react.dev/images/brand/logo_light.svg)                                                                                                                                                  | Original colors and proportions.                                                                                         |
| `astro-light.svg`, `astro-dark.svg`       | [Astro black icon](https://astro.build/assets/press/astro-icon-dark.svg), [Astro white icon](https://astro.build/assets/press/astro-icon-light.svg)                                                                | Original files; named here by the background they appear on.                                                             |
| `nextjs.ico`                              | [Next.js website icon](https://nextjs.org/favicon.ico)                                                                                                                                                             | Original icon; paired with a Coming soon label, not a working setup link.                                                |

Vue and Svelte marks were added from their official repositories:

- `vue.svg`: [vuejs/art logo.svg](https://github.com/vuejs/art/blob/master/logo.svg), downloaded from `raw.githubusercontent.com/vuejs/art/master/logo.svg`.
- `svelte.svg`: [sveltejs/branding svelte-logo.svg](https://github.com/sveltejs/branding/blob/master/svelte-logo.svg), downloaded from `raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg`.

Both retain their original vector geometry and colors. OpenCode wordmarks display
at 117 × 21px, the brand guide's minimum wordmark size, to balance the other agent
logos without distorting them.

OpenAI marks belong to OpenAI. Claude marks belong to Anthropic. OpenCode marks
belong to Anomaly. Framework marks belong to their respective owners. Refer to
the official sources for their current usage guidance. The previous LobeHub
vectors and their now-unused attribution file were removed in this revision.

## Codex mark verification and spacing

The [official OpenAI Codex IDE extension](https://marketplace.visualstudio.com/items?itemName=openai.chatgpt)
currently publishes an OpenAI Blossom icon. Its current icon asset was checked
on 2026-11-16 at
`https://openai.gallerycdn.vsassets.io/extensions/openai/chatgpt/26.51111.21308/1794532255365/Microsoft.VisualStudio.Services.Icons.Default`.
This verifies Codex usage of the Blossom; it does not mean the mark is unique to
Codex or identical to every past Codex app icon. The website continues to use the
local official monochrome SVG variants from the OpenAI brand archive.

Those SVG exports include clear space. A 24px layout box positions the unchanged
48px export around its visible artwork, so the internal whitespace does not add
to the logo-to-name gap. The Codex and Claude Code lockups use matching 5px gaps. Their selector includes
the agent-list class so it correctly overrides the generic 12px link gap.

## Claude Code naming

The agent row uses **Claude Code**, matching [Anthropic's coding-agent product](https://claude.com/product/claude-code).
It retains the original orange Claude spark beside a plain product-name label;
this is not presented as a separately supplied official Claude Code wordmark.
The row and other homepage agent mentions use the full product name. Technical
provider identifiers and CLI commands remain `claude`.
