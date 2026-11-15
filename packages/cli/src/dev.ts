import { resolve } from 'node:path';
import { prepareLocalProject } from './local';
import { nudge } from '../../vite/src/index';

/** Vite and the app config come from the consumer, never from a global demo. */
export async function startDev(root: string, port?: number) {
  prepareLocalProject(root);
  const vite = (await import(
    Bun.resolveSync('vite', root)
  )) as typeof import('vite');
  const server = await vite.createServer({
    root,
    plugins: [nudge()],
    ...(port === undefined ? {} : { server: { port, strictPort: true } }),
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await server.close();
    process.stdin.off('end', onEnd);
    if (!process.stdin.isTTY) process.stdin.pause();
    process.off('SIGINT', onEnd);
    process.off('SIGTERM', onEnd);
  };
  const onEnd = () => {
    void stop();
  };
  try {
    await server.listen();
    console.log(
      `Nudge is running for ${resolve(root)}. Your app's normal dev command and source are unchanged.`,
    );
    server.printUrls();
    process.once('SIGINT', onEnd);
    process.once('SIGTERM', onEnd);
    if (!process.stdin.isTTY) {
      process.stdin.once('end', onEnd);
      process.stdin.resume();
    }
  } catch (error) {
    await stop();
    throw error;
  }
  return server;
}
