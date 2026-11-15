import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { initProject } from '../../packages/cli/src/init';
import { spawnSync } from 'node:child_process';

for (const packaged of [false, true])
  test(`${packaged ? 'packaged' : 'source'} Vite app loads Nudge and saves a pinned request without app-code changes`, async ({
    page,
  }) => {
    const root = mkdtempSync(resolve('.nudge/installed-browser-'));
    // Isolate this app from the demo harness's fixed bridge configuration.
    const state = process.env.NUDGE_STATE_DIR;
    delete process.env.NUDGE_STATE_DIR;
    let server: Awaited<ReturnType<typeof createServer>> | undefined;
    try {
      writeFileSync(
        resolve(root, 'package.json'),
        JSON.stringify({
          type: 'module',
          scripts: { dev: 'vite' },
          // Reuse installed Vite for an offline fixture; Nudge itself comes from its tarball.
          devDependencies: {
            vite: packaged
              ? `link:${resolve('node_modules/vite').replaceAll('\\', '/')}`
              : '8.3.7',
          },
        }),
      );
      writeFileSync(
        resolve(root, 'index.html'),
        '<html><body><button id="publish">Publish</button></body></html>',
      );
      if (packaged) {
        const release = spawnSync(
          process.execPath,
          ['scripts/package-release.ts'],
          { encoding: 'utf8' },
        );
        expect(release.status, release.stderr).toBe(0);
        const install = spawnSync(
          process.execPath,
          [
            resolve('dist/usenudge/dist/cli.js'),
            'init',
            root,
            '--package-source',
            resolve('dist/usenudge.tgz'),
            '--skip-agent',
            '--integrate',
          ],
          {
            encoding: 'utf8',
            timeout: 60000,
            env: {
              ...process.env,
              BUN_INSTALL_CACHE_DIR: resolve('.nudge/package-cache'),
            },
          },
        );
        expect(install.status, install.stdout + install.stderr).toBe(0);
      } else initProject(root);
      server = await createServer({
        root,
        configFile: resolve(root, 'vite.nudge.config.ts'),
        server: { host: '127.0.0.1', port: 0 },
      });
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('No port');
      await page.goto(`http://127.0.0.1:${address.port}`);
      const overlay = page.locator('[data-nudge-host]');
      await overlay
        .getByRole('button', { name: 'Annotate UI', exact: true })
        .click();
      await page.locator('#publish').click();
      await overlay
        .getByLabel('What should the coding agent change here?')
        .fill('Increase the button padding');
      await overlay
        .getByRole('button', { name: 'Queue for agent', exact: true })
        .click();
      await expect(
        overlay.getByRole('heading', { name: 'Queued for agent', exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        overlay.getByRole('button', {
          name: 'Open comment: Increase the button padding',
          exact: true,
        }),
      ).toBeVisible();
      if (packaged) {
        await page.goto('about:blank');
        await server.close();
        writeFileSync(
          resolve(root, '.nudge/agent.json'),
          JSON.stringify({ provider: 'codex', mode: 'managed' }),
        );
        server = await createServer({
          root,
          configFile: resolve(root, 'vite.nudge.config.ts'),
          server: { host: '127.0.0.1', port: 0 },
        });
        await server.listen();
        const newAddress = server.httpServer!.address();
        if (!newAddress || typeof newAddress === 'string')
          throw new Error('No port');
        const { bridgeUrl } = JSON.parse(
          readFileSync(resolve(root, '.nudge/connection.json'), 'utf8'),
        );
        const { browserToken } = JSON.parse(
          readFileSync(resolve(root, '.nudge/credentials.json'), 'utf8'),
        );
        await expect
          .poll(
            async () =>
              (
                await (
                  await fetch(bridgeUrl + '/api/v1/managed', {
                    headers: {
                      authorization: `Bearer ${browserToken}`,
                      origin: `http://127.0.0.1:${newAddress.port}`,
                    },
                  })
                ).json()
              ).online,
          )
          .toBe(true);
      }
    } finally {
      await page.goto('about:blank');
      await server?.close();
      if (state === undefined) delete process.env.NUDGE_STATE_DIR;
      else process.env.NUDGE_STATE_DIR = state;
      rmSync(root, { recursive: true, force: true });
    }
  });
