import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  name: string;
};
const browser = [
  '@usenudge/shared',
  '@usenudge/core',
  '@usenudge/overlay',
  '@usenudge/react',
].includes(pkg.name);
if (pkg.name === '@usenudge/overlay') {
  const { buildOverlayStyles } = await import('./build-overlay-styles');
  buildOverlayStyles();
}
const result = await Bun.build({
  entrypoints:
    pkg.name === '@usenudge/overlay'
      ? ['src/index.tsx']
      : pkg.name === '@usenudge/mcp'
        ? ['src/index.ts', 'src/server.ts']
        : [
            'src/index.ts',
            ...(pkg.name === '@usenudge/bridge'
              ? ['src/main.ts', 'src/config.ts']
              : []),
          ],
  outdir: 'dist',
  packages: 'external',
  format: 'esm',
  target: browser ? 'browser' : 'bun',
  sourcemap: 'external',
});
if (!result.success)
  throw new AggregateError(result.logs, `Unable to build ${pkg.name}`);
