import { bunExecutable } from '../../shared/src/bun';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectMcpFile, packaged } from './runtime';

export function projectFramework(root: string) {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  if (pkg.devDependencies?.astro || pkg.dependencies?.astro) return 'astro';
  if (!pkg.devDependencies?.vite && !pkg.dependencies?.vite)
    throw new Error(
      'Nudge supports Vite and Astro apps. Run this in your app root.',
    );
  if (
    ['vite.config.cjs', 'vite.config.cts'].some((name) =>
      existsSync(resolve(root, name)),
    )
  )
    throw new Error('CommonJS Vite configs are not supported by this preview.');
  return 'vite';
}

/** Local setup never edits application files, package scripts or root gitignore. */
export function prepareLocalProject(
  root: string,
  framework = projectFramework(root),
) {
  const state = resolve(root, '.nudge');
  mkdirSync(state, { recursive: true, mode: 0o700 });
  // A nested ignore file ignores itself too; no tracked project files need edits.
  writeFileSync(resolve(state, '.gitignore'), '*\n');
  const mcp = projectMcpFile(root);
  if (!packaged || existsSync(mcp))
    writeFileSync(
      resolve(state, 'mcp-config.json'),
      JSON.stringify(
        {
          mcpServers: {
            usenudge: {
              command: bunExecutable(),
              args: [mcp],
              env: { NUDGE_PROJECT_ROOT: root },
            },
          },
        },
        null,
        2,
      ) + '\n',
      { mode: 0o600 },
    );
  return framework;
}
