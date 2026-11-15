import { resolve } from 'node:path';

export default async function setup() {
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  // Resolve the website's own Astro version from its workspace.
  const entry = Bun.resolveSync('astro', resolve('apps/website'));
  const { preview } = (await import(entry)) as {
    preview(config: {
      root: string;
      server: { host: string; port: number };
    }): Promise<{ stop(): Promise<void> }>;
  };
  const server = await preview({
    root: resolve('apps/website'),
    server: { host: 'localhost', port: 4322 },
  });
  return async () => {
    await server.stop();
  };
}
