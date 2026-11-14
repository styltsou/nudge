import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  name: string;
};
const browser = [
  '@usenudge/shared',
  '@usenudge/core',
  '@usenudge/react',
].includes(pkg.name);
const result = await Bun.build({
  entrypoints:
    pkg.name === '@usenudge/mcp'
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
