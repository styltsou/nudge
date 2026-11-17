import { test, expect, type Page } from '@playwright/test';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  createAstroConsumerProject,
  createConsumerProject,
} from '../helpers/consumer-project';
import { adapterPackages } from '../../packages/runner/src/adapters';
import { version } from '../../packages/shared/src/release';

for (const framework of ['Vite', 'Astro'] as const)
  test(`installed ${framework} app runs an ACP edit through human acceptance`, ({
    page,
  }) => installedEdit(page, framework));

async function installedEdit(page: Page, framework: 'Vite' | 'Astro') {
  test.setTimeout(90000);
  const parent = mkdtempSync(resolve('.nudge/consumer-'));
  const root = resolve(parent, 'app');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    BUN_INSTALL_CACHE_DIR: resolve('.nudge/package-cache'),
    ASTRO_TELEMETRY_DISABLED: '1',
    PATH: dirname(process.execPath),
  };
  delete env.NUDGE_STATE_DIR;
  let dev: ReturnType<typeof Bun.spawn> | undefined;
  const run = (args: string[], cwd: string) => {
    const result = spawnSync(process.execPath, args, {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 60000,
      windowsHide: true,
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    return result.stdout;
  };
  try {
    run(['scripts/package-release.ts'], process.cwd());
    // Link the installed framework for offline testing. Nudge comes from the archive.
    const astro = framework === 'Astro';
    const archive = resolve('dist/usenudge.tgz');
    (astro ? createAstroConsumerProject : createConsumerProject)(root, archive);
    run(['install', '--cwd', root], root);
    const cli = resolve(root, 'node_modules/usenudge/dist/cli.js');
    const beforeHelp = readFileSync(resolve(root, 'package.json'), 'utf8');
    expect(run(['x', '--bun', 'usenudge', '--version'], root).trim()).toBe(
      version,
    );
    expect(run([cli, '--help'], root)).toContain('usenudge init');
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(
      beforeHelp,
    );
    expect(existsSync(resolve(root, '.nudge'))).toBe(false);

    // Place a deterministic adapter in the same private runtime location as setup.
    const spec = adapterPackages.codex;
    const adapter = resolve(
      root,
      '.nudge/agents/codex/node_modules',
      spec.name,
    );
    mkdirSync(adapter, { recursive: true });
    writeFileSync(
      resolve(adapter, 'package.json'),
      JSON.stringify({
        name: spec.name,
        version: spec.version,
        bin: { [spec.bin]: './fixture.js' },
      }),
    );
    const fixture = await Bun.build({
      entrypoints: [resolve('tests/helpers/installed-agent-fixture.ts')],
      target: 'bun',
    });
    expect(fixture.success).toBe(true);
    writeFileSync(
      resolve(adapter, 'fixture.js'),
      await fixture.outputs[0]!.text(),
    );
    const configPath = resolve(
      root,
      astro ? 'astro.config.mjs' : 'vite.config.ts',
    );
    const beforeConfig = readFileSync(configPath, 'utf8');
    run([cli, 'init', '--agent', 'codex'], root);
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(
      beforeHelp,
    );
    expect(existsSync(resolve(root, 'vite.nudge.config.ts'))).toBe(false);
    let output = '';
    // Launch the published CLI entry, without changing the consumer's dev script.
    dev = Bun.spawn([process.execPath, cli, 'dev', '--project', root], {
      cwd: root,
      env: { ...env, NO_COLOR: '1' },
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const collect = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        output += new TextDecoder().decode(next.value);
      }
    };
    void collect(dev.stdout as ReadableStream<Uint8Array>);
    void collect(dev.stderr as ReadableStream<Uint8Array>);
    await expect
      .poll(
        () => output.match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/)?.[0],
        {
          timeout: 30000,
          message: 'Installed app dev server should start',
        },
      )
      .toBeTruthy();
    const origin = output.match(/http:\/\/(?:localhost|127\.0\.0\.1):\d+/)![0];
    await page.goto(astro ? `${origin}/app/` : origin);
    const overlay = page.locator('[data-nudge-host]');
    if (astro) {
      const hostile = await page.request.get(`${origin}/@nudge/client`, {
        headers: { Origin: 'http://example.test' },
      });
      expect(hostile.status()).toBe(403);
      await expect(overlay).toHaveCount(1);
      await page.evaluate(() =>
        Reflect.set(window, 'astroNavigationTest', true),
      );
      await page.getByRole('link', { name: 'Other page' }).click();
      await expect(
        page.getByRole('heading', { name: 'Other page' }),
      ).toBeVisible();
      await expect(overlay).toHaveCount(1);
      await page.getByRole('link', { name: 'Home' }).click();
      await expect(page.locator('#publish')).toBeVisible();
      await expect(overlay).toHaveCount(1);
      expect(
        await page.evaluate(() => Reflect.get(window, 'astroNavigationTest')),
      ).toBe(true);
      const connectionFile = resolve(root, '.nudge/connection.json');
      const connection = readFileSync(connectionFile, 'utf8');
      writeFileSync(
        configPath,
        beforeConfig + '\n// Trigger Astro config restart.\n',
      );
      await expect
        .poll(() => output, { timeout: 15000 })
        .toContain('server restarted');
      // Astro's restart also sends a full reload over HMR. A manual reload
      // races that navigation and can fail with net::ERR_ABORTED. Wait for
      // the old document's marker to disappear instead of starting another.
      await page.waitForFunction(
        () => Reflect.get(window, 'astroNavigationTest') === undefined,
        undefined,
        { timeout: 15000 },
      );
      await expect(overlay).toHaveCount(1);
      expect(readFileSync(connectionFile, 'utf8')).toBe(connection);
      // Compare with the user's new config later to catch any CLI edits.
    }
    await overlay
      .getByRole('button', { name: 'Agent setup', exact: true })
      .click();
    // Ready folds the checklist away; wait for it, then open the details.
    await expect(overlay.getByText(/^Ready./)).toBeVisible();
    await overlay.getByText('Connection details', { exact: true }).click();
    await expect(overlay.getByText('Installed', { exact: true })).toBeVisible();
    await overlay
      .getByRole('button', { name: 'Close setup', exact: true })
      .click();
    await overlay
      .getByRole('button', { name: 'Annotate UI', exact: true })
      .click();
    await page.locator('#publish').click();
    await overlay
      .getByLabel('What should the coding agent change here?')
      .fill('Give this button more padding and a coral accent.');
    await expect(
      overlay.getByRole('button', { name: 'Run agent', exact: true }),
    ).toBeEnabled();
    await overlay
      .getByRole('button', { name: 'Run agent', exact: true })
      .click();
    await expect(
      overlay.getByText(
        'Increased button padding and applied a coral accent.',
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#publish')).toHaveCSS('padding-top', '12px');
    await expect(page.locator('#publish')).toHaveCSS(
      'background-color',
      'rgb(224, 82, 70)',
    );
    await overlay.getByRole('button', { name: 'Accept', exact: true }).click();
    await page.reload();
    await overlay
      .getByRole('button', {
        name: 'Open comment: Give this button more padding and a coral accent.',
        exact: true,
      })
      .click();
    await expect(
      overlay.getByRole('heading', { name: 'Accepted', exact: true }),
    ).toBeVisible();
    run([cli, 'doctor'], root);
    expect(readFileSync(configPath, 'utf8')).toBe(
      astro
        ? beforeConfig + '\n// Trigger Astro config restart.\n'
        : beforeConfig,
    );
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(
      beforeHelp,
    );
    run(['run', 'build'], root);
    expect(
      readFileSync(resolve(root, 'dist/index.html'), 'utf8'),
    ).not.toContain('@nudge');
  } finally {
    await page.goto('about:blank');
    if (dev) {
      if (dev.stdin && typeof dev.stdin !== 'number') dev.stdin.end();
      const timeout = setTimeout(() => dev?.kill(), 10000);
      await dev.exited;
      clearTimeout(timeout);
      expect(existsSync(resolve(root, '.nudge/connection.json'))).toBe(false);
    }
    await rm(parent, {
      recursive: true,
      force: true,
      maxRetries: 30,
      retryDelay: 100,
    });
  }
}
