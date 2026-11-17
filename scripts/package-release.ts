import { buildOverlayStyles } from './build-overlay-styles';
import { mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { version } from '../packages/shared/src/release';
import manifest from '../package.release.json';
import { packageNotices } from './package-notices';

buildOverlayStyles();
const root = resolve(import.meta.dir, '..');
const destination = resolve(root, 'dist/usenudge');
mkdirSync(resolve(destination, 'dist'), { recursive: true });
const notices = packageNotices();
for (const [name, entry, target] of [
  ['cli', 'packages/cli/src/index.ts', 'bun'],
  ['vite', 'packages/vite/src/index.ts', 'bun'],
  ['mcp', 'packages/mcp/src/index.ts', 'bun'],
  ['runner', 'packages/runner/src/index.ts', 'bun'],
  ['client', 'packages/core/src/index.ts', 'browser'],
] as const) {
  const result = await Bun.build({
    entrypoints: [resolve(root, entry)],
    target,
    format: 'esm',
    packages: 'bundle',
    external: ['vite'],
    minify: target === 'browser',
    ...(target === 'browser'
      ? { define: { 'process.env.NODE_ENV': '"production"' } }
      : {}),
    plugins: [notices.plugin],
  });
  if (!result.success)
    throw new AggregateError(result.logs, `Unable to bundle ${name}`);
  writeFileSync(
    resolve(destination, `dist/${name}.js`),
    (name === 'cli' ? '#!/usr/bin/env bun\n' : '') +
      (await result.outputs[0]!.text()),
  );
}
chmodSync(resolve(destination, 'dist/cli.js'), 0o755);
writeFileSync(
  resolve(destination, 'dist/vite.d.ts'),
  "import type { Plugin } from 'vite';\nexport declare function nudge(): Plugin;\n",
);
writeFileSync(
  resolve(destination, 'package.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
writeFileSync(
  resolve(destination, 'README.md'),
  readFileSync(resolve(root, 'packages/cli/README.md')),
);
for (const file of ['LICENSE', 'CHANGELOG.md'])
  writeFileSync(resolve(destination, file), readFileSync(resolve(root, file)));
mkdirSync(resolve(destination, 'skills/nudge-project-setup'), {
  recursive: true,
});
writeFileSync(
  resolve(destination, 'skills/nudge-project-setup/SKILL.md'),
  readFileSync(resolve(root, 'skills/nudge-project-setup/SKILL.md')),
);
writeFileSync(resolve(destination, 'THIRD_PARTY_NOTICES.md'), notices.render());
const proc = Bun.spawn(
  [
    process.execPath,
    'pm',
    'pack',
    '--ignore-scripts',
    '--filename',
    resolve(root, 'dist/usenudge.tgz'),
  ],
  { cwd: destination, stdout: 'inherit', stderr: 'inherit' },
);
if ((await proc.exited) !== 0) throw new Error('Unable to pack release');
console.log(`Package: dist/usenudge.tgz (${version}; not published)`);
