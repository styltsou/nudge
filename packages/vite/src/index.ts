import type { Plugin, ViteDevServer } from 'vite';
import { clientPath, startRuntime } from './runtime';

/** Source-checkout integration. Run Vite using Bun; production hooks are disabled. */
export function nudge(): Plugin {
  const plugin = devPlugin((server) =>
    startRuntime(server.config.root, 'document'),
  );
  return {
    ...plugin,
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: clientPath },
          injectTo: 'body',
        },
      ];
    },
  };
}

type Runtime = Awaited<ReturnType<typeof startRuntime>>;

export function devPlugin(
  start: (server: ViteDevServer) => Promise<Runtime>,
  ownsRuntime = true,
): Plugin {
  let runtime: Runtime | undefined;
  return {
    name: 'usenudge',
    apply: 'serve',
    configResolved(config) {
      if (config.plugins.filter((p) => p.name === 'usenudge').length > 1)
        throw new Error(
          'Nudge is already enabled in this config. Remove the duplicate dev integration.',
        );
    },
    async configureServer(server) {
      if (typeof Bun === 'undefined')
        throw new Error(
          'Nudge requires Bun. Start with bunx --bun usenudge dev.',
        );
      if (
        !server.httpServer ||
        server.config.server.middlewareMode ||
        server.config.server.https
      )
        throw new Error('Nudge requires a standalone local HTTP dev server.');
      const host = server.config.server.host;
      if (host && host !== 'localhost' && host !== '127.0.0.1')
        throw new Error('Nudge requires a localhost or 127.0.0.1 dev server.');
      runtime = await start(server);
      runtime.attach(server);
    },
    async closeBundle() {
      if (ownsRuntime) await runtime?.close();
    },
  };
}
