import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const packaged = existsSync(
  fileURLToPath(new URL('./vite.js', import.meta.url)),
);
export function runtimeFile(kind: 'vite' | 'mcp') {
  return fileURLToPath(
    new URL(
      packaged ? `./${kind}.js` : `../../${kind}/src/index.ts`,
      import.meta.url,
    ),
  );
}
export function projectMcpFile(root: string) {
  return packaged
    ? resolve(root, 'node_modules/usenudge/dist/mcp.js')
    : runtimeFile('mcp');
}
