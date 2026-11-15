import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { mkdirSync } from 'node:fs';

test('browser demo plays without a step bar or internal scrolling and supports pause and replay', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  const demo = page.locator('[data-walkthrough]');
  await expect(demo.getByRole('tablist')).toHaveCount(0);
  await demo.getByRole('button', { name: 'Play demo' }).click();
  await page.clock.fastForward(3500);
  await expect(
    demo.getByRole('region', { name: 'Request queued' }),
  ).toBeVisible();
  await page.clock.fastForward(2800);
  await expect(
    demo.getByRole('region', { name: 'Review the change' }),
  ).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(demo.getByRole('button', { name: 'Replay demo' })).toBeVisible();
  await demo
    .getByRole('button', { name: 'Open in side panel', exact: true })
    .click();
  await expect(demo).toHaveAttribute('data-comment-layout', 'sidebar');
  await demo
    .getByRole('button', { name: 'Open pinned comment', exact: true })
    .click();
  await expect(demo).toHaveAttribute('data-comment-layout', 'pinned');
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await demo.evaluate((el) =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          '.walkthrough-body, .nudge-example-pane, .sample-app',
        ),
      ).map((node) => ({
        name: node.className,
        height: node.clientHeight,
        content: node.scrollHeight,
      })),
    );
    expect(
      overflow.every((node) => node.content <= node.height + 1),
      JSON.stringify({ width, overflow }),
    ).toBe(true);
  }
  await demo.getByRole('button', { name: 'Replay demo' }).click();
  await demo.getByRole('button', { name: 'Pause demo' }).click();
  await page.clock.fastForward(15000);
  await expect(
    demo.getByRole('region', { name: 'Describe the change' }),
  ).toBeVisible();
});

test('hero install tabs support keyboard selection and copy only the selected command', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const box = page.locator('[data-install-box]');
  await box.getByRole('tab', { name: 'Bun', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    box.getByRole('tab', { name: 'npm', exact: true }),
  ).toBeFocused();
  await box.getByRole('button', { name: 'Copy npm install command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'npm install -D usenudge@preview',
  );
  await expect(box.getByRole('status')).toHaveText('Command copied.');
  await box.getByRole('tab', { name: 'pnpm', exact: true }).click();
  await box.getByRole('button', { name: 'Copy pnpm install command' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'pnpm add -D usenudge@preview',
  );
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('walkthrough queues literal text, reports a sample change, revises, accepts, and resets', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()))
      requests.push(new URL(request.url()).origin);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Show your agentwhat you mean.',
  );
  const example = page.getByRole('region', {
    name: 'Try a nudge',
  });
  await example.getByLabel('What should change?').fill('  ');
  await expect(
    example.getByRole('button', { name: 'Queue example' }),
  ).toBeDisabled();
  const comment =
    '<img src=x onerror="window.nudgeExampleXss=true"> Increase the spacing';
  await example.getByLabel('What should change?').fill(comment);
  await example.getByRole('button', { name: 'Queue example' }).click();
  await expect(
    example.getByRole('region', { name: 'Request queued' }),
  ).toBeVisible();
  await expect(example.getByText(comment, { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, 'nudgeExampleXss')),
  ).toBeUndefined();
  await example.getByRole('button', { name: 'Preview implementation' }).click();
  await expect(
    example.getByText('Ready for review', { exact: true }),
  ).toBeVisible();
  await expect(
    example.getByRole('button', { name: 'Queue another pass' }),
  ).toBeDisabled();
  await example
    .getByLabel('Need another pass?')
    .fill('More padding around the chart');
  await example.getByRole('button', { name: 'Queue another pass' }).click();
  await expect(
    example.getByText('More padding around the chart', { exact: true }),
  ).toBeVisible();
  await expect(
    example.getByRole('region', { name: 'Request queued' }),
  ).toContainText('Revision 2');
  await example.getByRole('button', { name: 'Preview implementation' }).click();
  await example.getByRole('button', { name: 'Accept example' }).click();
  await expect(example.getByText('Accepted', { exact: true })).toBeVisible();
  await example.getByRole('button', { name: 'Start over' }).click();
  await expect(
    example.getByRole('region', { name: 'Describe the change' }),
  ).toBeVisible();
  expect(new Set(requests)).toEqual(new Set(['http://localhost:4322']));
});

test('light and dark canvases are white and black and theme preference follows navigation into docs', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Docs', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await page
    .locator('header')
    .getByRole('button', { name: 'Switch to light theme' })
    .click();
  await expect(page.locator('body')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('system theme follows the OS until the user saves a preference on either entry point', async ({
  page,
}) => {
  for (const path of ['/', '/docs/']) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(path);
    await page.evaluate(() => localStorage.removeItem('starlight-theme'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(
      await page.evaluate(() => localStorage.getItem('starlight-theme')),
    ).toBeNull();
    const toggle = page
      .locator('header')
      .getByRole('button', { name: 'Switch to dark theme' });
    await expect(toggle.locator('svg:visible')).toHaveCount(1);
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.goto(path === '/' ? '/docs/' : '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  }
});

test('header and sidebar frame hover/focus and keep sidebar selection unfilled', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const docsLink = page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Docs', exact: true });
    await docsLink.hover();
    await expect(docsLink).not.toHaveCSS('background-image', 'none');
    await docsLink.focus();
    await page.mouse.move(0, 100);
    await expect(docsLink).toBeFocused();
    await expect(docsLink).not.toHaveCSS('background-image', 'none');
    await docsLink.click();
    const selected = page.locator('.sidebar-content a[aria-current="page"]');
    await expect(selected).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(selected).not.toHaveCSS('background-image', 'none');
    const accent = await selected.evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--nudge-accent)';
      el.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    await expect(selected).toHaveCSS('color', accent);
    const nextLink = page
      .locator('.sidebar-content')
      .getByRole('link', { name: 'Snapshots', exact: true });
    await nextLink.hover();
    await expect(nextLink).toHaveCSS('color', accent);
    await expect(nextLink).not.toHaveCSS('background-image', 'none');
    await nextLink.click();
    await expect(page).toHaveURL(/\/docs\/snapshots\/$/);
    await expect(
      page.locator('.sidebar-content a[aria-current="page"]'),
    ).toHaveText('Snapshots');
    await expect(
      page.locator('.sidebar-content a[aria-current="page"]'),
    ).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const nextPage = page.locator('.pagination-links a[rel="next"]');
    await nextPage.hover();
    await expect(nextPage).toHaveCSS('color', accent);
    await expect(nextPage.locator('.link-title')).toHaveCSS('color', accent);
  }
});

test('code blocks follow the theme and copy intact JSON without decorative terminal chrome', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/docs/mcp-setup/');
  const block = page.locator('.expressive-code').first();
  const code = block.locator('pre');
  const original = JSON.parse(await code.innerText());
  await expect(block.locator('.is-terminal')).toHaveCount(0);
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page
        .locator('header')
        .getByRole('button', { name: 'Switch to light theme' })
        .click();
    const codeStyle = await code.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        background: style.backgroundColor,
        codeBackground: style.getPropertyValue('--ec-codeBg'),
        editorBackground: style.getPropertyValue('--ec-frm-edBg'),
        frameBackground: style.getPropertyValue('--code-background'),
      };
    });
    expect(codeStyle.background, JSON.stringify(codeStyle)).toBe(
      theme === 'dark' ? 'rgb(16, 16, 16)' : 'rgb(250, 250, 250)',
    );
    await block.hover();
    await block.getByRole('button', { name: 'Copy to clipboard' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(copied)).toEqual(original);
  }
});

test('production documentation search finds the snapshot guide', async ({
  page,
}) => {
  await page.goto('/docs/');
  // Starlight registers the shortcut and creates Pagefind's input lazily.
  // Exercise keyboard focus after that client initialization is complete.
  await expect(page.locator('site-search [data-open-modal]')).toBeEnabled();
  await expect(page.locator('#starlight__search input')).toBeAttached();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('textbox', { name: 'Search', exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole('textbox', { name: 'Search', exact: true })
    .fill('snapshots');
  await expect(
    dialog
      .locator('.pagefind-ui__result-link')
      .filter({ hasText: 'Snapshots' })
      .first(),
  ).toBeVisible();
  await dialog
    .locator('.pagefind-ui__result-link')
    .filter({ hasText: 'Snapshots' })
    .first()
    .click();
  await expect(page).toHaveURL(/\/docs\/snapshots\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Snapshots');
});

test('public navigation and authored content links resolve without exposing internal repository files', async ({
  request,
}) => {
  const pages = [
    '/',
    '/docs/',
    '/docs/getting-started/',
    '/docs/agents/',
    '/docs/mcp-setup/',
    '/docs/workflow/',
    '/docs/snapshots/',
    '/docs/privacy/',
    '/docs/troubleshooting/',
    '/docs/reference/mcp-tools/',
    '/docs/reference/http-api/',
  ];
  const links = new Set<string>();
  for (const path of pages) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const dom = new JSDOM(await response.text());
    for (const link of dom.window.document.querySelectorAll<HTMLAnchorElement>(
      'a[href]',
    )) {
      const href = link.getAttribute('href')!;
      if (href.startsWith('/') && !href.startsWith('//'))
        links.add(href.split('#')[0]!);
    }
    // Cached rendered Markdown must not retain references to removed EC assets.
    for (const asset of dom.window.document.querySelectorAll(
      'link[rel="stylesheet"][href], script[src]',
    )) {
      const href = asset.getAttribute('href') ?? asset.getAttribute('src')!;
      if (href.startsWith('/') && !href.startsWith('//')) links.add(href);
    }
    dom.window.close();
  }
  for (const path of links)
    expect((await request.get(path)).status(), path).toBe(200);
  for (const path of [
    '/AGENTS.md',
    '/docs/01-PRODUCT.md',
    '/tasks/SESSION-LOG.md',
    '/.nudge/credentials.json',
    '/design-references/clipboard-image%20(1).png',
    '/missing-page/',
  ])
    expect((await request.get(path)).status(), path).toBe(404);
});

test('keyboard tabs, setup copy, and narrow layouts work', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const first = page.getByRole('tab', { name: 'Bun', exact: true });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: 'npm', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    page.getByRole('tab', { name: 'pnpm', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Copy setup commands' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.replaceAll('\r\n', '\n')).toBe(
    await page.locator('#setup-commands').textContent(),
  );
  await expect(
    page.getByRole('status').filter({ hasText: 'Setup commands copied.' }),
  ).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto('/docs/getting-started/');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('docs header keeps theme, search and menu controls usable on narrow screens', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/docs/getting-started/');
    const header = page.locator('header');
    await expect(
      header.getByRole('link', { name: 'Nudge home' }),
    ).toBeVisible();
    await expect(header.getByRole('link', { name: 'GitHub' })).toBeVisible();
    const previous = await page.locator('html').getAttribute('data-theme');
    await header
      .getByRole('button', { name: /Switch to (dark|light) theme/ })
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      previous === 'dark' ? 'light' : 'dark',
    );
    await header.getByRole('button', { name: /Search/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page
      .getByRole('dialog')
      .getByRole('textbox', { name: 'Search', exact: true })
      .fill('snapshots');
    await expect(
      page
        .getByRole('dialog')
        .locator('.pagefind-ui__result-link')
        .filter({ hasText: 'Snapshots' })
        .first(),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.locator('#starlight__sidebar');
    await expect(menu).toBeVisible();
    // The shared switch appears in the mobile footer too; both copies stay in sync.
    await menu
      .getByRole('button', { name: /Switch to (dark|light) theme/ })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', previous!);
    await expect(
      header.getByRole('button', {
        name:
          previous === 'light'
            ? 'Switch to dark theme'
            : 'Switch to light theme',
      }),
    ).toBeVisible();
    await menu.getByRole('link', { name: 'Snapshots', exact: true }).click();
    await expect(page).toHaveURL(/\/docs\/snapshots\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Snapshots',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('on-this-page dropdown preserves keyboard dismissal and anchor navigation', async ({
  page,
}) => {
  mkdirSync('.nudge/website-preview', { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/docs/getting-started/');
    const toc = page.locator('mobile-starlight-toc');
    const summary = toc.locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(toc.locator('details')).toHaveAttribute('open', '');
    await toc.locator('nav').screenshot({
      path: `.nudge/website-preview/toc-open-${colorScheme}.png`,
    });
    await page.keyboard.press('Escape');
    await expect(toc.locator('details')).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
    await summary.click();
    await toc
      .getByRole('link', { name: 'Install in your app', exact: true })
      .click();
    await expect(page).toHaveURL(/#install-in-your-app$/);
    await expect(toc.locator('details')).not.toHaveAttribute('open', '');
    await expect(toc.locator('.display-current')).toHaveText(
      'Install in your app',
    );
    await page.evaluate(() => scrollTo(0, 0));
    await expect(toc.locator('.display-current')).toHaveText('Overview');
  }
});

test('TOC pointer motion is interruptible while keyboard and reduced-motion actions stay instant', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/docs/getting-started/');
  const toc = page.locator('mobile-starlight-toc');
  const details = toc.locator('details');
  const summary = toc.locator('summary');
  const panel = toc.locator('.dropdown');
  await summary.click();
  await expect(details).toHaveAttribute('data-state', 'open');
  // Read the closing frame in the same task as the pointer click, before completion.
  const closing = await summary.evaluate((el) => {
    el.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
    );
    const details = el.closest('details')!;
    const panel = details.querySelector<HTMLElement>('.dropdown')!;
    return {
      state: details.dataset.state,
      retained: details.open,
      expanded: el.getAttribute('aria-expanded'),
      inert: panel.inert,
      hidden: panel.getAttribute('aria-hidden'),
    };
  });
  expect(closing).toEqual({
    state: 'closing',
    retained: true,
    expanded: 'false',
    inert: true,
    hidden: 'true',
  });
  await expect(details).toHaveAttribute('data-state', 'closed');
  await expect(details).not.toHaveAttribute('open', '');
  await summary.click();
  await expect(details).toHaveAttribute('data-state', 'open');
  // Reopen during exit; its previous completion must never hide the reopened panel.
  await summary.evaluate(async (el) => {
    const click = () =>
      el.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
      );
    click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    click();
  });
  await expect(details).toHaveAttribute('data-state', 'open');
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(panel).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape');
  await expect(details).toHaveAttribute('data-state', 'closed');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('data-state', 'open');
  expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await summary.click();
  await expect(details).toHaveAttribute('data-state', 'open');
  expect(await panel.evaluate((el) => el.getAnimations().length)).toBe(0);
  // Outside pointer dismissal stays instant for reduced motion too.
  await page.mouse.click(380, 800);
  await expect(details).toHaveAttribute('data-state', 'closed');
});

test('TOC keeps native disclosure and anchor navigation when JavaScript is disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:4322/docs/getting-started/');
    const toc = page.locator('mobile-starlight-toc');
    await toc.locator('summary').click();
    await expect(
      toc.getByRole('link', { name: 'Install in your app', exact: true }),
    ).toBeVisible();
    await toc
      .getByRole('link', { name: 'Install in your app', exact: true })
      .click();
    await expect(page).toHaveURL(/#install-in-your-app$/);
    await toc.locator('summary').click();
    await expect(toc.locator('details')).not.toHaveAttribute('open', '');
  } finally {
    await context.close();
  }
});

test('capture representative desktop and mobile design previews', async ({
  page,
}) => {
  mkdirSync('.nudge/website-preview', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of ['dark', 'light']) {
    await page.addInitScript(
      (value) => localStorage.setItem('starlight-theme', value),
      theme,
    );
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const screenshot = page.locator('.real-review-image img');
    await screenshot.scrollIntoViewIfNeeded();
    await expect(screenshot).toHaveJSProperty('naturalWidth', 1280);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `.nudge/website-preview/home-${theme}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `.nudge/website-preview/home-${theme}-viewport.png`,
    });
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Docs', exact: true })
      .hover();
    await page.locator('header').screenshot({
      path: `.nudge/website-preview/home-header-hover-${theme}.png`,
    });
    await page.goto('/docs/getting-started/');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `.nudge/website-preview/docs-${theme}.png`,
      fullPage: true,
    });
    await page
      .locator('header')
      .getByRole('button', { name: /Search/ })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', { name: 'Search', exact: true })
      .fill('snapshots');
    await expect(
      dialog.locator('.pagefind-ui__result-link').first(),
    ).toBeVisible();
    await dialog.screenshot({
      path: `.nudge/website-preview/search-${theme}.png`,
    });
    await page.keyboard.press('Escape');
    await page.locator('header').getByRole('link', { name: 'GitHub' }).hover();
    await page.locator('header').screenshot({
      path: `.nudge/website-preview/docs-header-hover-${theme}.png`,
    });
    await page
      .locator('.sidebar-content')
      .getByRole('link', { name: 'Snapshots', exact: true })
      .hover();
    await page.locator('.sidebar-content').screenshot({
      path: `.nudge/website-preview/docs-sidebar-hover-${theme}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.real-review-image img').scrollIntoViewIfNeeded();
  await expect(page.locator('.real-review-image img')).toHaveJSProperty(
    'naturalWidth',
    1280,
  );
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: '.nudge/website-preview/home-mobile.png',
    fullPage: true,
  });
  await page.goto('/docs/getting-started/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: '.nudge/website-preview/docs-mobile.png' });
});
