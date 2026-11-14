import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => {
  // Never read or embed development credentials during production builds.
  let browserConfig: { bridgeUrl: string; token: string } | null = null;
  if (command === 'serve') {
    const root = fileURLToPath(new URL('../..', import.meta.url));
    const credentials = JSON.parse(
      readFileSync(
        resolve(
          root,
          process.env.NUDGE_STATE_DIR ?? '.nudge',
          'credentials.json',
        ),
        'utf8',
      ),
    ) as { browserToken: string };
    browserConfig = {
      bridgeUrl: `http://127.0.0.1:${process.env.NUDGE_PORT ?? 4747}`,
      token: credentials.browserToken,
    };
  }
  return {
    plugins: [react()],
    define: { __NUDGE_CONFIG__: JSON.stringify(browserConfig) },
  };
});
