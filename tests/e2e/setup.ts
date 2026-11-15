import { createServer } from 'vite';
import { resolve } from 'node:path';
import { createBridge } from '../../packages/bridge/src/index';
import { loadConfig } from '../../packages/bridge/src/config';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { createConsumerProject } from '../helpers/consumer-project';

// Own both servers in the runner: no shell process tree to terminate on Windows.
export default async function setup() {
  mkdirSync(resolve('.nudge'), { recursive: true });
  const testState = mkdtempSync(resolve('.nudge/e2e-run-'));
  Object.assign(process.env, {
    NUDGE_STATE_DIR: testState,
  });
  const config = loadConfig();
  config.origins = [];
  const bridge = createBridge(config);
  const bridgeUrl = await bridge.listen({ host: '127.0.0.1', port: 0 });
  process.env.NUDGE_E2E_BRIDGE_URL = bridgeUrl;
  try {
    const root = resolve(testState, 'app');
    createConsumerProject(root);
    writeFileSync(
      resolve(root, 'app.js'),
      (await Bun.file(resolve(root, 'app.js')).text()) +
        `\nimport {mountNudge} from '/@fs/${resolve('packages/core/src/index.ts').replaceAll('\\', '/')}'; mountNudge(${JSON.stringify({ enabled: true, bridgeUrl, token: config.browserToken })});`,
    );
    const vite = await createServer({
      root,
      configFile: false,
      server: {
        host: '127.0.0.1',
        port: 0,
        fs: { allow: [process.cwd()] },
      },
    });
    await vite.listen();
    const address = vite.httpServer!.address();
    if (!address || typeof address === 'string')
      throw new Error('No consumer fixture port');
    const origin = `http://127.0.0.1:${address.port}`;
    process.env.NUDGE_E2E_ORIGIN = origin;
    config.origins.push(origin);
    return async () => {
      await vite.close();
      await bridge.close();
      rmSync(testState, { recursive: true, force: true });
    };
  } catch (error) {
    await bridge.close();
    throw error;
  }
}
