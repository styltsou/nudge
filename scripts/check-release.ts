import { resolve } from 'node:path';
import manifest from '../package.release.json';

const root = resolve(import.meta.dir, '..');
const archive = new Bun.Archive(
  await Bun.file(resolve(root, 'dist/usenudge.tgz')).arrayBuffer(),
);
const entries = await archive.files();
const expected = new Set(
  [
    'package.json',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'THIRD_PARTY_NOTICES.md',
    'skills/nudge-project-setup/SKILL.md',
    ...[
      'cli.js',
      'vite.js',
      'mcp.js',
      'runner.js',
      'client.js',
      'vite.d.ts',
    ].map((name) => `dist/${name}`),
  ].map((name) => `package/${name}`),
);
for (const path of entries.keys()) {
  if (!expected.delete(path))
    throw new Error(`Unexpected release file: ${path}`);
}
if (expected.size)
  throw new Error(`Missing release files: ${[...expected].join(', ')}`);
const text = (path: string) => entries.get(`package/${path}`)!.text();
const packed = JSON.parse(await text('package.json'));
if (JSON.stringify(packed) !== JSON.stringify(manifest))
  throw new Error(
    'Archive metadata differs from package.release.json. Rebuild it.',
  );
if (
  'private' in packed ||
  packed.license !== 'MIT' ||
  packed.publishConfig.tag !== 'preview'
)
  throw new Error('Invalid release publication metadata.');
if (
  process.env.RELEASE_VERSION &&
  process.env.RELEASE_VERSION !== packed.version
)
  throw new Error(
    'Selected release tag/version differs from the archive metadata.',
  );
if (!(await text('dist/cli.js')).startsWith('#!/usr/bin/env bun\n'))
  throw new Error('CLI shebang missing.');
for (const path of entries.keys()) {
  const content = await entries.get(path)!.text();
  if (
    /workspace:\*|C:[/\\]Users[/\\]|(?:browserToken|mcpToken|runnerToken)["']?\s*:\s*["'][a-f0-9]{64}["']/.test(
      content,
    )
  )
    throw new Error(`Private/workspace content in ${path}`);
}
if (!(await text('THIRD_PARTY_NOTICES.md')).includes('## fastify@'))
  throw new Error('Bundled dependency notices missing.');
console.log(
  `Release archive verified: ${manifest.name}@${manifest.version}, ${entries.size} allowlisted files. No publication performed.`,
);
