import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
import { createBridge } from '../../packages/bridge/src/index';

test('agent setup explains missing readiness, copies setup, preserves drafts and supports save-only requests', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const root = mkdtempSync(resolve('.nudge/onboarding-'));
  const config = {
    stateDir: root,
    projectId: randomUUID(),
    port: 4747,
    origins: [] as string[],
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    runnerToken: 'c'.repeat(64),
    managed: false,
    setupCommand: 'bun packages/cli/src/index.ts',
  };
  const bridge = createBridge(config);
  const bridgeUrl = await bridge.listen({ host: '127.0.0.1', port: 0 });
  let server: Awaited<ReturnType<typeof createServer>> | undefined;
  const runner = async (path: string, body: unknown) => {
    const response = await fetch(bridgeUrl + '/api/v1/runner' + path, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.runnerToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    expect(response.ok).toBe(true);
  };
  try {
    writeFileSync(
      resolve(root, 'index.html'),
      `<html><body><button id="target">Publish</button><script type="module">import {mountNudge} from '/@fs/${resolve('packages/core/src/index.ts').replaceAll('\\', '/')}'; mountNudge(${JSON.stringify({ enabled: true, bridgeUrl, token: config.browserToken })});</script></body></html>`,
    );
    server = await createServer({
      root,
      configFile: false,
      server: { host: '127.0.0.1', port: 0, fs: { allow: [process.cwd()] } },
    });
    await server.listen();
    const address = server.httpServer!.address();
    if (!address || typeof address === 'string') throw new Error('No port');
    const origin = `http://127.0.0.1:${address.port}`;
    config.origins.push(origin);
    await page.goto(origin);
    const host = page.locator('[data-nudge-host]');
    const setup = host.getByRole('button', {
      name: 'Agent setup',
      exact: true,
    });
    const dialog = host.getByRole('dialog', { name: 'Connect your agent' });
    await setup.click();
    await expect(
      dialog.getByText('Setup needed', { exact: true }),
    ).toBeVisible();
    await dialog.getByLabel('Choose an agent').selectOption('claude');
    await dialog.getByRole('button', { name: 'Copy setup command' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'bun packages/cli/src/index.ts agents --agent claude --managed',
    );
    await expect(dialog.getByRole('status')).toContainText('Command copied');
    await page.keyboard.press('Escape');
    await expect(setup).toBeFocused();
    await host
      .getByRole('button', { name: 'Annotate UI', exact: true })
      .click();
    await page.locator('#target').click();
    const prompt = host.getByLabel('What should the coding agent change here?');
    await prompt.fill('Keep my draft');
    await setup.click();
    await page.keyboard.press('Escape');
    await expect(prompt).toHaveValue('Keep my draft');
    config.managed = true;
    await page.reload();
    await setup.click();
    await expect(
      dialog.getByText('Restart dev or check setup', { exact: true }),
    ).toBeVisible();
    await runner('/claim', {});
    const readiness = {
      provider: 'codex',
      adapter: 'missing',
      auth: 'login-required',
      billing: 'unknown',
      checkedAt: new Date().toISOString(),
    };
    await runner('/readiness', readiness);
    await dialog.getByRole('button', { name: 'Check again' }).click();
    await expect(
      dialog.getByText('Install needed', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Sign in needed', { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Try annotation only' }).click();
    await page.locator('#target').click();
    await prompt.fill('Save this for later');
    await expect(
      host.getByRole('button', { name: 'Run agent', exact: true }),
    ).toBeDisabled();
    await host.getByRole('button', { name: 'Save without running' }).click();
    await expect(
      host.getByRole('heading', { name: 'Queued for agent', exact: true }),
    ).toBeVisible();
    await runner('/readiness', {
      ...readiness,
      adapter: 'available',
      auth: 'unknown',
      checkedAt: new Date(Date.now() - 120000).toISOString(),
    });
    await setup.click();
    await dialog.getByRole('button', { name: 'Check again' }).click();
    await expect(
      dialog.getByText('Not verified', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Try annotation only' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await runner('/readiness', {
      ...readiness,
      adapter: 'available',
      auth: 'signed-in',
      billing: 'api',
    });
    await setup.click();
    await dialog.getByRole('button', { name: 'Check again' }).click();
    await expect(
      dialog.getByText('API/provider billing detected', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Annotate your first element' }),
    ).toBeEnabled();
    expect(await dialog.innerText()).not.toContain(config.runnerToken);
    await page.screenshot({ path: '.nudge/onboarding-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: '.nudge/onboarding-mobile.png' });
  } finally {
    await page.goto('about:blank');
    await server?.close();
    await bridge.close();
    rmSync(root, { recursive: true, force: true });
  }
});
