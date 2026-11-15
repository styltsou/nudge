import { test, expect } from 'bun:test';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { initProject } from '../../packages/cli/src/init';
import { nudge } from '../../packages/vite/src/index';
import { createServer, build } from 'vite';
import {
  adapterPackages,
  adapterDirectory,
} from '../../packages/runner/src/adapters';

test('init defaults to managed setup without touching global host config or downloading a present adapter', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-init-default-'));
  try {
    writeFileSync(
      resolve(root, 'package.json'),
      JSON.stringify({
        type: 'module',
        scripts: { dev: 'vite' },
        devDependencies: { vite: '*' },
      }),
    );
    const spec = adapterPackages.codex;
    const runtime = resolve(
      adapterDirectory(root, 'codex'),
      'node_modules',
      spec.name,
    );
    mkdirSync(resolve(runtime, 'dist'), { recursive: true });
    writeFileSync(
      resolve(runtime, 'package.json'),
      JSON.stringify({
        name: spec.name,
        version: spec.version,
        bin: { [spec.bin]: 'dist/index.js' },
      }),
    );
    writeFileSync(resolve(runtime, 'dist/index.js'), '');
    const before = readFileSync(resolve(root, 'package.json'), 'utf8');
    const child = Bun.spawn(
      [
        process.execPath,
        resolve('packages/cli/src/index.ts'),
        'init',
        root,
        '--agent',
        'codex',
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(code, stdout + stderr).toBe(0);
    expect(
      JSON.parse(readFileSync(resolve(root, '.nudge/agent.json'), 'utf8')),
    ).toMatchObject({ provider: 'codex', mode: 'managed', transport: 'acp' });
    expect(existsSync(resolve(root, '.codex/config.toml'))).toBe(false);
    expect(existsSync(resolve(root, '.mcp.json'))).toBe(false);
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(before);
    expect(existsSync(resolve(root, 'vite.nudge.config.ts'))).toBe(false);
    expect(existsSync(resolve(root, '.gitignore'))).toBe(false);
    expect(readFileSync(resolve(root, '.nudge/.gitignore'), 'utf8')).toBe(
      '*\n',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30000);

test('generated wrapper starts a separate app with its original config', async () => {
  mkdirSync(resolve('.nudge'), { recursive: true });
  const root = mkdtempSync(resolve('.nudge/installed-app-'));
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  try {
    writeFileSync(
      resolve(root, 'package.json'),
      JSON.stringify({
        type: 'module',
        devDependencies: { vite: '*' },
        scripts: { dev: 'vite' },
      }),
    );
    writeFileSync(
      resolve(root, 'vite.config.ts'),
      'export default () => ({ define: { ORIGINAL_SETTING: true } });',
    );
    writeFileSync(
      resolve(root, 'index.html'),
      '<html><body>Independent app</body></html>',
    );
    initProject(root);
    server = await createServer({
      root,
      configFile: resolve(root, 'vite.nudge.config.ts'),
      server: { host: '127.0.0.1', port: 0 },
    });
    await server.listen();
    expect(server.config.define?.ORIGINAL_SETTING).toBe(true);
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('No port');
    expect(
      await (await fetch(`http://127.0.0.1:${address.port}`)).text(),
    ).toContain('/@nudge/client');
  } finally {
    await server?.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('installer preserves config and scripts and is repeatable without executing project code', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-install-'));
  try {
    writeFileSync(
      resolve(root, 'package.json'),
      JSON.stringify({
        devDependencies: { vite: '*' },
        scripts: { dev: 'vite --host localhost', build: 'vite build' },
      }),
    );
    const original = 'export default { plugins: [], server: { port: 5812 } };';
    writeFileSync(resolve(root, 'vite.config.ts'), original);
    initProject(root);
    const first = readFileSync(resolve(root, 'package.json'), 'utf8');
    initProject(root);
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(first);
    expect(readFileSync(resolve(root, 'vite.config.ts'), 'utf8')).toBe(
      original,
    );
    expect(JSON.parse(first).scripts.build).toBe('vite build');
    expect(
      readFileSync(resolve(root, '.gitignore'), 'utf8').match(/\.nudge\//g),
    ).toHaveLength(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('standalone Vite starts an authenticated bridge and injects only its browser capability', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-vite-'));
  writeFileSync(
    resolve(root, 'index.html'),
    '<html><body><button id="target">Hello</button></body></html>',
  );
  const server = await createServer({
    root,
    configFile: false,
    plugins: [nudge()],
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string')
      throw new Error('No Vite port');
    const origin = `http://127.0.0.1:${address.port}`;
    const html = await (await fetch(origin)).text();
    expect(html).toContain('/@nudge/client');
    const script = await (await fetch(origin + '/@nudge/client')).text();
    const credentials = JSON.parse(
      readFileSync(resolve(root, '.nudge/credentials.json'), 'utf8'),
    );
    expect(script).toContain(credentials.browserToken);
    expect(script).not.toContain(credentials.mcpToken);
    const connection = JSON.parse(
      readFileSync(resolve(root, '.nudge/connection.json'), 'utf8'),
    );
    const response = await fetch(connection.bridgeUrl + '/api/v1/annotations', {
      headers: {
        Origin: origin,
        Authorization: `Bearer ${credentials.browserToken}`,
      },
    });
    expect(response.status).toBe(200);
    expect(
      (
        await fetch(origin + '/@nudge/client', {
          headers: { Origin: 'https://evil.example' },
        })
      ).status,
    ).toBe(403);
    const production = await build({
      root,
      configFile: false,
      plugins: [nudge()],
      logLevel: 'silent',
      build: { write: false },
    });
    const results = Array.isArray(production) ? production : [production];
    const output = JSON.stringify(results);
    expect(output).not.toContain('/@nudge/client');
    expect(output).not.toContain(credentials.browserToken);
    expect(output).not.toContain(credentials.mcpToken);
  } finally {
    await server.close();
    rmSync(root, { recursive: true, force: true });
  }
  expect(existsSync(root)).toBe(false);
});
