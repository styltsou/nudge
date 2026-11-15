import { test, expect } from './context';
import type { APIRequestContext, Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Annotation } from '../../packages/shared/src/index';

const base = process.env.NUDGE_E2E_BRIDGE_URL + '/api/v1';
function auth() {
  const credentials = JSON.parse(
    readFileSync(
      resolve(process.env.NUDGE_STATE_DIR ?? '.nudge/e2e', 'credentials.json'),
      'utf8',
    ),
  ) as { mcpToken: string };
  return { Authorization: `Bearer ${credentials.mcpToken}` };
}
async function get(
  request: APIRequestContext,
  id: string,
): Promise<Annotation> {
  const response = await request.get(`${base}/annotations/${id}`, {
    headers: auth(),
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<Annotation>;
}
async function queue(page: Page, request: APIRequestContext) {
  const comment = `Give the chart room ${Date.now()}`;
  await page.goto('/');
  const host = page.locator('[data-nudge-host]');
  await host.getByRole('button', { name: 'Annotate UI', exact: true }).click();
  await page
    .getByTestId('analytics-chart')
    .click({ position: { x: 10, y: 10 } });
  await host
    .getByLabel('What should the coding agent change here?')
    .fill(comment);
  await host
    .getByLabel('Capture before and automatically capture after')
    .check();
  await host
    .getByRole('button', { name: 'Queue for agent', exact: true })
    .click();
  await expect(
    host.getByRole('heading', { name: 'Queued for agent', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  const response = await request.get(`${base}/annotations`, {
    headers: auth(),
  });
  const annotation = ((await response.json()) as Annotation[]).find(
    (a) => a.revisions[0]!.comment === comment,
  )!;
  expect(annotation).toBeDefined();
  await expect(
    host.getByRole('img', { name: 'Before snapshot', exact: true }),
  ).toHaveCount(0);
  await host
    .locator('summary')
    .filter({ hasText: 'View comparison' })
    .first()
    .click();
  return annotation;
}
async function report(request: APIRequestContext, id: string) {
  const a = await get(request, id);
  const response = await request.post(
    `${base}/annotations/${id}/implementation`,
    {
      headers: auth(),
      data: {
        expectedVersion: a.version,
        summary: 'Adjusted chart height and spacing',
        changedFiles: ['styles.css'],
      },
    },
  );
  expect(response.ok()).toBe(true);
}

test('real before/after captures survive refresh and retain immutable history across revisions', async ({
  page,
  request,
}) => {
  const externalOrigins: string[] = [];
  page.on('request', (event) => {
    const url = new URL(event.url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !['localhost', '127.0.0.1'].includes(url.hostname)
    )
      externalOrigins.push(url.origin);
  });
  const a = await queue(page, request);
  const host = page.locator('[data-nudge-host]');
  expect(a.revisions[0]!.beforeSnapshot).toBeDefined();
  await expect(
    host.getByRole('img', { name: 'Before snapshot', exact: true }),
  ).toHaveJSProperty('naturalWidth', a.revisions[0]!.beforeSnapshot!.width);
  await page.getByTestId('analytics-chart').evaluate((element) => {
    (element as HTMLElement).style.minHeight = '440px';
  });
  await report(request, a.id);
  await expect(
    host.getByRole('img', { name: 'After snapshot', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect
    .poll(
      async () =>
        (await get(request, a.id)).revisions[0]!.afterSnapshot?.height,
      { timeout: 15000 },
    )
    .toBeGreaterThan(a.revisions[0]!.beforeSnapshot!.height);
  const first = (await get(request, a.id)).revisions[0]!;
  expect(first.afterSnapshot!.integrity).toBe('captured');
  await expect(
    host.getByText('Comparison unavailable', { exact: true }),
  ).toHaveCount(0);
  // An authentic runtime artifact, using only isolated test data and no visible credentials.
  mkdirSync('.nudge/evidence', { recursive: true });
  await page.screenshot({ path: '.nudge/evidence/review.png', fullPage: true });
  const followup = `Add more spacing ${Date.now()}`;
  await host.getByLabel('Follow-up request').fill(followup);
  await host
    .getByRole('button', { name: 'Request changes', exact: true })
    .click();
  await expect(
    host.getByRole('heading', { name: 'Queued for agent', exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        Boolean((await get(request, a.id)).revisions[1]?.beforeSnapshot),
      { timeout: 15000 },
    )
    .toBe(true);
  const revised = await get(request, a.id);
  expect(revised.revisions[0]).toEqual(first);
  expect(revised.revisions[1]!.beforeSnapshot!.id).not.toBe(
    first.beforeSnapshot!.id,
  );
  await page.getByTestId('analytics-chart').evaluate((element) => {
    (element as HTMLElement).style.minHeight = '500px';
  });
  await report(request, a.id);
  await expect
    .poll(
      async () =>
        Boolean((await get(request, a.id)).revisions[1]?.afterSnapshot),
      { timeout: 15000 },
    )
    .toBe(true);
  await host.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(
    host.getByRole('heading', { name: 'Accepted', exact: true }),
  ).toBeVisible();
  await page.reload();
  await host.getByRole('button', { name: /Feedback \(/ }).click();
  await host
    .getByRole('button', { name: `Accepted · ${followup}`, exact: true })
    .click();
  await expect(
    host.getByRole('heading', { name: 'Revision history' }),
  ).toBeVisible();
  for (const summary of await host
    .locator('summary')
    .filter({ hasText: 'View comparison' })
    .all())
    await summary.click();
  await expect(
    host.getByRole('img', { name: 'After snapshot', exact: true }),
  ).toHaveCount(2);
  expect(externalOrigins).toEqual([]);
});

for (const state of ['missing', 'ambiguous'] as const) {
  test(`${state} anchor refuses automatic comparison and supports explicit recovery`, async ({
    page,
    request,
  }) => {
    const a = await queue(page, request);
    const host = page.locator('[data-nudge-host]');
    expect(a.revisions[0]!.beforeSnapshot).toBeDefined();
    await page.getByTestId('analytics-chart').evaluate((element, mode) => {
      if (mode === 'missing') element.remove();
      else {
        const copy = element.cloneNode(true) as HTMLElement;
        copy.id = 'duplicate-chart';
        element.after(copy);
      }
    }, state);
    await report(request, a.id);
    await expect(
      host.getByText(
        state === 'missing'
          ? 'Element not found. Reselect the element manually.'
          : 'Ambiguous anchor. Reselect the element manually.',
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      (await get(request, a.id)).revisions[0]!.afterSnapshot,
    ).toBeUndefined();
    await expect(
      host.getByText('Comparison unavailable', { exact: true }),
    ).toBeVisible();
    if (state === 'missing') {
      await host
        .getByRole('button', { name: 'Reselect for after', exact: true })
        .click();
      await page
        .getByTestId('revenue-card')
        .click({ position: { x: 10, y: 10 } });
    } else {
      await page
        .locator('#duplicate-chart')
        .evaluate((element) => element.remove());
      await host
        .getByRole('button', { name: 'Capture after', exact: true })
        .click();
    }
    await expect(
      host.getByRole('img', { name: 'After snapshot', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    expect(
      (await get(request, a.id)).revisions[0]!.afterSnapshot!.integrity,
    ).toBe(state === 'missing' ? 'manual' : 'captured');
    if (state === 'missing')
      await expect(
        host.locator('figcaption').filter({ hasText: 'Manual selection' }),
      ).toBeVisible();
  });
}

test('private element capture failure does not block queuing or human review', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page
    .getByTestId('analytics-chart')
    .evaluate((element) => element.setAttribute('data-nudge-private', ''));
  // queue navigates again; preserve the private marker on every navigation for this test.
  await page.addInitScript(() =>
    new MutationObserver(() =>
      document
        .querySelector('[data-testid="analytics-chart"]')
        ?.setAttribute('data-nudge-private', ''),
    ).observe(document, { childList: true, subtree: true }),
  );
  const a = await queue(page, request);
  const host = page.locator('[data-nudge-host]');
  expect(a.revisions[0]!.beforeSnapshot).toBeUndefined();
  expect(a.anchor.textPreview).toBe('');
  await report(request, a.id);
  await expect(
    host.getByRole('heading', { name: 'Ready for review', exact: true }),
  ).toBeVisible();
  await expect(
    host.getByText('Comparison unavailable', { exact: true }),
  ).toBeVisible();
  await host.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(
    host.getByRole('heading', { name: 'Accepted', exact: true }),
  ).toBeVisible();
});
