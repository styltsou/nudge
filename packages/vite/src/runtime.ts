import type { Connect, ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { loadConfig } from '../../bridge/src/config';
import { createBridge } from '../../bridge/src/index';
import { launchRunner } from '../../runner/src/launch';

export const clientPath = '/@nudge/client';

export async function startRuntime(
  root: string,
  navigation: 'document' | 'astro',
) {
  const config = loadConfig(root);
  config.origins = [];
  const clientFile = fileURLToPath(new URL('./client.js', import.meta.url));
  const packaged = existsSync(clientFile);
  config.setupCommand = packaged
    ? 'bunx --bun usenudge'
    : `bun ${JSON.stringify(fileURLToPath(new URL('../../cli/src/index.ts', import.meta.url)).replaceAll('\\', '/'))}`;
  let bundle: string;
  if (packaged) bundle = readFileSync(clientFile, 'utf8');
  else {
    const result = await Bun.build({
      entrypoints: [
        fileURLToPath(new URL('../../core/src/index.ts', import.meta.url)),
      ],
      target: 'browser',
      format: 'esm',
      minify: true,
      define: { 'process.env.NODE_ENV': '"production"' },
    });
    if (!result.success)
      throw new Error('Unable to build the Nudge browser integration.');
    bundle = await result.outputs[0]!.text();
  }

  const bridge = createBridge(config);
  const connectionFile = resolve(config.stateDir, 'connection.json');
  let stopRunner: ReturnType<typeof launchRunner> | undefined;
  let connection: string | undefined;
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      try {
        await stopRunner?.();
        if (
          connection &&
          existsSync(connectionFile) &&
          readFileSync(connectionFile, 'utf8') === connection
        )
          rmSync(connectionFile, { force: true });
      } finally {
        await bridge.close();
      }
    })());

  try {
    const bridgeUrl = await bridge.listen({ host: '127.0.0.1', port: 0 });
    const options = JSON.stringify({
      enabled: true,
      bridgeUrl,
      token: config.browserToken,
    });
    connection = JSON.stringify({ bridgeUrl });
    writeFileSync(connectionFile, connection, { mode: 0o600 });
    stopRunner = launchRunner(root);

    const corePath = '/@nudge/core';
    const client = `import { mountNudge } from '${corePath}';
let handle;
const mount = () => { handle ??= mountNudge(${options}); };
const destroy = () => { handle?.destroy(); handle = undefined; };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
${
  navigation === 'astro'
    ? `document.addEventListener('astro:after-swap', destroy);
document.addEventListener('astro:page-load', mount);`
    : ''
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  document.removeEventListener('DOMContentLoaded', mount);
  document.removeEventListener('astro:after-swap', destroy);
  document.removeEventListener('astro:page-load', mount);
  destroy();
});`;

    const middleware: Connect.NextHandleFunction = (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path !== clientPath && path !== corePath) return next();
      if (
        !config.origins.some(
          (origin) => new URL(origin).host === req.headers.host,
        ) ||
        (req.headers.origin && !config.origins.includes(req.headers.origin))
      ) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      res.setHeader('Content-Type', 'text/javascript');
      res.setHeader('Cache-Control', 'no-store');
      res.end(path === corePath ? bundle : client);
    };
    return {
      close,
      attach(server: ViteDevServer) {
        const http = server.httpServer!;
        const allowListeningPort = () => {
          const address = http.address();
          if (address && typeof address !== 'string')
            config.origins.splice(
              0,
              config.origins.length,
              `http://localhost:${address.port}`,
              `http://127.0.0.1:${address.port}`,
            );
        };
        if (http.listening) allowListeningPort();
        else http.once('listening', allowListeningPort);
        server.middlewares.use(middleware);
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
