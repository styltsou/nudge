import { loadConfig } from './config';
import { createBridge } from './index';

const config = loadConfig();
const app = createBridge(config);
await app.listen({ host: '127.0.0.1', port: config.port });
console.log(
  `Nudge bridge listening at http://127.0.0.1:${config.port}. Credentials are stored in the gitignored local state directory.`,
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close();
  });
