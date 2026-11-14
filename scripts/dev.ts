import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig } from '../packages/bridge/src/config';
import { createBridge } from '../packages/bridge/src/index';

const root = fileURLToPath(new URL('..', import.meta.url));
const config = loadConfig(root);
const demoPort = Number(process.env.NUDGE_DEMO_PORT ?? 5173);
if (!Number.isInteger(demoPort) || demoPort < 1 || demoPort > 65535)
  throw new Error('Invalid NUDGE_DEMO_PORT');
const bridge = createBridge(config);
await bridge.listen({ host: '127.0.0.1', port: config.port });
console.log(
  `Nudge bridge: http://127.0.0.1:${config.port}. MCP runs separately; see README.`,
);
const vite = resolve(
  dirname(fileURLToPath(import.meta.resolve('vite/package.json'))),
  'bin/vite.js',
);
const demo = spawn(
  process.execPath,
  [vite, '--host', 'localhost', '--port', String(demoPort), '--strictPort'],
  {
    cwd: resolve(root, 'apps/demo'),
    stdio: 'inherit',
    env: process.env,
  },
);
let stopping = false;
async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  demo.kill();
  await bridge.close();
  process.exitCode = code;
}
demo.on('error', () => {
  console.error('Unable to start Vite');
  void stop(1);
});
demo.on('exit', (code) => {
  void stop(code ?? 0);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void stop(0);
  });
