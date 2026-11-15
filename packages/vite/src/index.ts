import type { Plugin, ResolvedConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { loadConfig } from '../../bridge/src/config';
import { createBridge } from '../../bridge/src/index';
import { launchRunner } from '../../runner/src/launch';

/** Source-checkout integration. Run Vite using Bun; production hooks are disabled. */
export function nudge(): Plugin {
  let vite: ResolvedConfig;
  let bridge: ReturnType<typeof createBridge> | undefined;
  let browserConfig: { bridgeUrl: string; token: string };
  let bundle = '';
  let cleanup: (() => Promise<void>) | undefined;
  const moduleId = '/@nudge/client';
  return {
    name: 'usenudge',
    apply: 'serve',
    configResolved(config) {
      if (config.plugins.filter((p) => p.name === 'usenudge').length > 1)
        throw new Error(
          'Nudge is already enabled in this Vite config. Use the existing dev command instead of injecting it twice.',
        );
      vite = config;
    },
    async configureServer(server) {
      if (typeof Bun === 'undefined')
        throw new Error('Nudge requires Bun. Start Vite with bun --bun vite.');
      if (server.config.server.middlewareMode || server.config.server.https)
        throw new Error(
          'Nudge currently supports standalone local HTTP Vite servers.',
        );
      const host = server.config.server.host;
      if (host && host !== 'localhost' && host !== '127.0.0.1')
        throw new Error('Nudge requires a localhost or 127.0.0.1 dev server.');
      const config = loadConfig(vite.root);
      config.origins = [];
      const clientFile = fileURLToPath(new URL('./client.js', import.meta.url));
      config.setupCommand = existsSync(clientFile)
        ? 'bunx --bun usenudge'
        : `bun ${JSON.stringify(fileURLToPath(new URL('../../cli/src/index.ts', import.meta.url)).replaceAll('\\', '/'))}`;
      if (existsSync(clientFile)) bundle = readFileSync(clientFile, 'utf8');
      else {
        const result = await Bun.build({
          entrypoints: [
            fileURLToPath(new URL('../../core/src/index.ts', import.meta.url)),
          ],
          target: 'browser',
          format: 'esm',
          minify: true,
        });
        if (!result.success)
          throw new Error('Unable to build the Nudge browser integration.');
        bundle = await result.outputs[0]!.text();
      }
      bridge = createBridge(config);
      await bridge.listen({ host: '127.0.0.1', port: 0 });
      const address = bridge.server.address();
      if (!address || typeof address === 'string')
        throw new Error('Nudge bridge did not bind a local port.');
      browserConfig = {
        bridgeUrl: `http://127.0.0.1:${address.port}`,
        token: config.browserToken,
      };
      const connectionFile = resolve(config.stateDir, 'connection.json');
      writeFileSync(
        connectionFile,
        JSON.stringify({ bridgeUrl: browserConfig.bridgeUrl }),
        { mode: 0o600 },
      );
      // Always start the idle runner: it reports agent status and runs in-browser setup.
      const stopRunner = launchRunner(vite.root);
      server.httpServer?.once('listening', () => {
        const address = server.httpServer!.address();
        if (address && typeof address !== 'string') {
          config.origins.push(
            `http://localhost:${address.port}`,
            `http://127.0.0.1:${address.port}`,
          );
        }
      });
      cleanup = async () => {
        await stopRunner?.();
        rmSync(connectionFile, { force: true });
        await bridge?.close();
        bridge = undefined;
      };
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== moduleId && path !== '/@nudge/core') return next();
        const expectedHosts = config.origins.map(
          (origin) => new URL(origin).host,
        );
        if (
          !expectedHosts.includes(req.headers.host ?? '') ||
          (req.headers.origin && !config.origins.includes(req.headers.origin))
        ) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        res.setHeader('Content-Type', 'text/javascript');
        res.setHeader('Cache-Control', 'no-store');
        res.end(
          path === '/@nudge/core'
            ? bundle
            : `import { mountNudge } from '/@nudge/core'; const handle = mountNudge(${JSON.stringify({ enabled: true, ...browserConfig })}); if(import.meta.hot) import.meta.hot.dispose(() => handle.destroy());`,
        );
      });
    },
    async closeBundle() {
      await cleanup?.();
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: moduleId },
          injectTo: 'body',
        },
      ];
    },
  };
}
