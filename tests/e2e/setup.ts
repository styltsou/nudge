import { createServer } from 'vite';
import { resolve } from 'node:path';
import { createBridge } from '../../packages/bridge/src/index';
import { loadConfig } from '../../packages/bridge/src/config';

// Own both servers in the runner: no shell process tree to terminate on Windows.
export default async function setup() {
  Object.assign(process.env, {
    NUDGE_STATE_DIR: '.nudge/e2e',
    NUDGE_PORT: '4748',
    NUDGE_DEMO_PORT: '5174',
    NUDGE_ALLOWED_ORIGINS: 'http://localhost:5174',
  });
  const bridge = createBridge(loadConfig());
  await bridge.listen({ host: '127.0.0.1', port: 4748 });
  try {
    const vite = await createServer({
      root: resolve('apps/demo'),
      server: { host: 'localhost', port: 5174, strictPort: true },
    });
    await vite.listen();
    return async () => {
      await vite.close();
      await bridge.close();
    };
  } catch (error) {
    await bridge.close();
    throw error;
  }
}
