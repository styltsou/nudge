import { resolve } from 'node:path';
import { prepareLocalProject } from './local';
import { nudge } from '../../vite/src/index';
import { findFreePort } from './port';
import { startAstro } from './astro';

/** Vite and the app config come from the consumer, never from a global demo. */
async function startVite(root: string, port?: number) {
  const vite = (await import(
    Bun.resolveSync('vite', root)
  )) as typeof import('vite');
  if (port === undefined) {
    // Respect the app's configured port (and strictPort) but never share one with
    // another server on the other loopback family.
    const resolved = await vite.resolveConfig({ root }, 'serve');
    if (!resolved.server.strictPort)
      port = await findFreePort(resolved.server.port ?? 5173);
  }
  const server = await vite.createServer({
    root,
    plugins: [nudge()],
    ...(port === undefined ? {} : { server: { port, strictPort: true } }),
  });
  try {
    await server.listen();
    server.printUrls();
    return () => server.close();
  } catch (error) {
    await server.close();
    throw error;
  }
}

export async function startDev(root: string, port?: number) {
  const framework = prepareLocalProject(root);
  const close = await (framework === 'astro'
    ? startAstro(root, port)
    : startVite(root, port));
  console.log(`Nudge is running for ${resolve(root)}.`);
  let stopping = false;
  const onEnd = () => {
    if (stopping) return;
    stopping = true;
    void close()
      .catch(() => {
        console.error('Nudge could not shut down the dev server cleanly.');
        process.exitCode = 1;
      })
      .finally(() => {
        process.stdin.off('end', onEnd);
        if (!process.stdin.isTTY) process.stdin.pause();
        process.off('SIGINT', onEnd);
        process.off('SIGTERM', onEnd);
      });
  };
  process.once('SIGINT', onEnd);
  process.once('SIGTERM', onEnd);
  if (!process.stdin.isTTY) {
    process.stdin.once('end', onEnd);
    process.stdin.resume();
  }
}
