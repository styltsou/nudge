import { test, expect } from './context';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Annotation } from '../../packages/shared/src/index';

test('select, queue, reload, report, revise and accept with honest unavailable evidence', async ({
  page,
  request,
}) => {
  const uniqueComment = `Make the button clearer ${Date.now()}`;
  await page.goto('/');
  const host = page.locator('[data-nudge-host]');
  await expect(host).toHaveCount(1);
  const normal = page.getByTestId('normal-control');
  await normal.click();
  await expect(normal).toHaveText('Clicked 1 times');
  await host.getByRole('button', { name: 'Annotate UI', exact: true }).click();
  await normal.hover();
  await expect(host.locator('.outline')).toBeVisible();
  await normal.click();
  await expect(normal).toHaveText('Clicked 1 times');
  await host
    .getByLabel('What should the coding agent change here?')
    .fill(`<script>window.__nudgeXss=true</script> ${uniqueComment}`);
  await host
    .getByRole('button', { name: 'Queue for agent', exact: true })
    .click();
  const comment = host.getByRole('button', {
    name: new RegExp(`Queued for agent.*${uniqueComment}`),
  });
  await expect(
    host.getByRole('heading', { name: 'Queued for agent', exact: true }),
  ).toBeVisible();
  await expect(host.locator('.panel')).toHaveClass(/pinned/);
  await normal.evaluate((element) => {
    element.style.transform = 'translateX(-40px)';
  });
  const pin = host.getByRole('button', {
    name: new RegExp(`Open comment:.*${uniqueComment}`),
  });
  await expect
    .poll(async () => {
      const target = await normal.boundingBox();
      const marker = await pin.boundingBox();
      return target && marker
        ? Math.abs(
            marker.x -
              Math.min(1280 - 32, Math.max(4, target.x + target.width - 12)),
          )
        : Infinity;
    })
    .toBeLessThan(2);
  await normal.evaluate((element) => {
    element.style.transform = '';
  });
  await host
    .getByRole('button', { name: 'Open in side panel', exact: true })
    .click();
  await expect(host.locator('.panel')).toHaveClass(/docked/);
  await host
    .getByRole('button', { name: 'Pin to element', exact: true })
    .click();
  await host
    .getByRole('button', { name: 'Close comment', exact: true })
    .click();
  await host
    .getByRole('button', {
      name: new RegExp(`Open comment:.*${uniqueComment}`),
    })
    .click();
  await expect(host.locator('.panel')).toHaveClass(/pinned/);
  await page.reload();
  await expect(
    host.getByRole('button', {
      name: new RegExp(`Open comment:.*${uniqueComment}`),
    }),
  ).toBeVisible();
  await host.getByRole('button', { name: /Feedback \(/ }).click();
  await expect(comment).toBeVisible();
  const saved = JSON.parse(
    readFileSync(
      resolve(process.env.NUDGE_STATE_DIR ?? '.nudge/e2e', 'credentials.json'),
      'utf8',
    ),
  ) as { mcpToken: string };
  const headers = { Authorization: `Bearer ${saved.mcpToken}` };
  const base = process.env.NUDGE_E2E_BRIDGE_URL + '/api/v1';
  const all = await request.get(`${base}/annotations`, { headers });
  expect(all.ok()).toBe(true);
  const annotation = ((await all.json()) as Annotation[]).find((a) =>
    a.revisions[0]!.comment.includes(uniqueComment),
  )!;
  const report = await request.post(
    `${base}/annotations/${annotation.id}/implementation`,
    {
      headers,
      data: {
        expectedVersion: annotation.version,
        summary: 'Updated the button spacing',
      },
    },
  );
  expect(report.ok()).toBe(true);
  await expect(
    host.getByRole('button', {
      name: new RegExp(`Ready for review.*${uniqueComment}`),
    }),
  ).toBeVisible();
  await host
    .getByRole('button', {
      name: new RegExp(`Ready for review.*${uniqueComment}`),
    })
    .click();
  await expect(
    host.getByText('Comparison unavailable', { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.locator('script').filter({ hasText: 'window.__nudgeXss=true' }),
  ).toHaveCount(0);
  await host.getByLabel('Follow-up request').fill('Add more breathing room');
  await host
    .getByRole('button', { name: 'Request changes', exact: true })
    .click();
  await expect(
    host.getByRole('heading', { name: 'Queued for agent', exact: true }),
  ).toBeVisible();
  await expect(
    host.getByRole('heading', { name: 'Revision history' }),
  ).toBeVisible();
  const latestResponse = await request.get(
    `${base}/annotations/${annotation.id}`,
    { headers },
  );
  const latest = (await latestResponse.json()) as Annotation;
  expect(latest.revisions).toHaveLength(2);
  expect(
    (
      await request.post(`${base}/annotations/${latest.id}/implementation`, {
        headers,
        data: {
          expectedVersion: latest.version,
          summary: 'Added breathing room',
        },
      })
    ).ok(),
  ).toBe(true);
  await expect(
    host.getByRole('heading', { name: 'Ready for review', exact: true }),
  ).toBeVisible();
  await host.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(
    host.getByRole('heading', { name: 'Accepted', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await normal.click();
  await expect(normal).toHaveText('Clicked 1 times');
});

test('keyboard cancellation and narrow viewport preserve app controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const host = page.locator('[data-nudge-host]');
  await expect(host).toHaveCount(1);
  await page.keyboard.press('Alt+Shift+A');
  await expect(
    host.getByRole('button', { name: 'Exit annotation' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('normal-control').click();
  await expect(host.getByRole('textbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(host.getByRole('textbox')).toHaveCount(0);
  await page.getByTestId('normal-control').click();
  await expect(page.getByTestId('normal-control')).toHaveText(
    'Clicked 1 times',
  );
});
