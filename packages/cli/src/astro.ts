import { sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { devPlugin } from '../../vite/src/index';
import { clientPath, startRuntime } from '../../vite/src/runtime';

function astroIntegration(plugin: ReturnType<typeof devPlugin>) {
  return {
    name: 'usenudge',
    hooks: {
      'astro:config:setup': ({
        command,
        updateConfig,
        injectScript,
      }: {
        command: string;
        updateConfig: (config: {
          vite: { plugins: (typeof plugin)[] };
        }) => void;
        injectScript: (stage: 'page', script: string) => void;
      }) => {
        if (command !== 'dev') return;
        updateConfig({ vite: { plugins: [plugin] } });
        // A nonliteral import leaves this URL for the dev middleware to serve.
        injectScript(
          'page',
          `{ const url = ${JSON.stringify(clientPath)}; import(/* @vite-ignore */ url); }`,
        );
      },
    },
  };
}

// Use the consumer's Astro JS API so it loads its normal config and integrations.
type AstroDev = (config: {
  root: URL;
  integrations: ReturnType<typeof astroIntegration>[];
  server?: { port: number };
  vite?: { server: { strictPort: boolean } };
}) => Promise<{ stop(): Promise<void> }>;

export async function startAstro(root: string, port?: number) {
  const astro = (await import(Bun.resolveSync('astro', root))) as {
    dev: AstroDev;
  };
  // Retain one bridge and runner across Astro/Vite config restarts.
  let runtime: ReturnType<typeof startRuntime> | undefined;
  let closePartialServer: (() => Promise<void>) | undefined;
  const closeRuntime = async () => {
    await (await runtime?.catch(() => undefined))?.close();
  };
  const integration = astroIntegration({
    ...devPlugin((server) => {
      closePartialServer = () => server.close();
      return (runtime ??= startRuntime(root, 'astro'));
    }, false),
    // Vite may exit directly on SIGTERM or stdin EOF. Close before it exits,
    // but keep active runs alive when Astro recreates the dev server.
    async closeServer({ reason }) {
      if (reason !== 'restart') await closeRuntime();
    },
  });

  try {
    const server = await astro.dev({
      root: pathToFileURL(root + sep),
      integrations: [integration],
      ...(port === undefined
        ? {}
        : { server: { port }, vite: { server: { strictPort: true } } }),
    });
    return async () => {
      try {
        await server.stop();
      } finally {
        await closeRuntime();
      }
    };
  } catch (error) {
    try {
      await closePartialServer?.();
    } finally {
      await closeRuntime();
    }
    throw error;
  }
}
