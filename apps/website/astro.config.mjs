import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

// Keep theme initialization and controls shared between development and builds.
const sharedComponents = {
  SiteTitle: './src/components/DocsSiteTitle.astro',
  ThemeSelect: './src/components/ThemeToggle.astro',
  ThemeProvider: './src/components/ThemeProvider.astro',
  MobileTableOfContents: './src/components/MobileTableOfContents.astro',
};

export default defineConfig({
  output: 'static',
  ...(process.env.NUDGE_WEBSITE_URL
    ? { site: process.env.NUDGE_WEBSITE_URL }
    : {}),
  devToolbar: { enabled: false },
  integrations: [
    starlight({
      title: 'Nudge',
      description:
        'Point at the UI. Request a change. Review the result with your existing coding agent.',
      favicon: '/favicon.svg',
      disable404Route: true,
      customCss: ['./src/styles/docs.css'],
      components: sharedComponents,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/styltsou/nudge',
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', slug: 'docs' },
            { label: 'Getting started', slug: 'docs/getting-started' },
            { label: 'Connect your agent', slug: 'docs/agents' },
          ],
        },
        {
          label: 'Using Nudge',
          items: [
            { label: 'Annotation and review', slug: 'docs/workflow' },
            { label: 'Snapshots', slug: 'docs/snapshots' },
            { label: 'Privacy and security', slug: 'docs/privacy' },
            { label: 'Troubleshooting', slug: 'docs/troubleshooting' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'External MCP integration', slug: 'docs/mcp-setup' },
            { label: 'MCP tools', slug: 'docs/reference/mcp-tools' },
            { label: 'HTTP API', slug: 'docs/reference/http-api' },
          ],
        },
        { label: 'Nudge homepage', link: '/' },
      ],
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
