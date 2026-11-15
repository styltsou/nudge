import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createServer } from 'vite';
import { createBridge } from '../../packages/bridge/src/index';
import { AcpTurn } from '../../packages/runner/src/acp';
import type { AgentTurn } from '../../packages/runner/src/provider';
import type { Annotation } from '../../packages/shared/src/index';
import type {
  AgentRun,
  AgentSession,
  RunAnswer,
} from '../../packages/shared/src/runs';

for (const provider of ['codex', 'claude', 'opencode'] as const)
  test(`${provider} managed browser loop handles approval, question, refresh, review and explicit session reuse`, async ({
    page,
  }) => {
    const root = mkdtempSync(resolve('.nudge/managed-browser-'));
    const config = {
      stateDir: root,
      projectId: randomUUID(),
      port: 4747,
      origins: [] as string[],
      browserToken: 'b'.repeat(64),
      mcpToken: 'a'.repeat(64),
      runnerToken: 'c'.repeat(64),
      managed: true,
      provider,
    };
    const bridge = createBridge(config);
    const bridgeUrl = await bridge.listen({ host: '127.0.0.1', port: 0 });
    let server: Awaited<ReturnType<typeof createServer>> | undefined;
    let agent: AgentTurn | undefined;
    let ended = false;
    let worker: Promise<void> | undefined;
    const request = async (path: string, body: unknown) => {
      const response = await fetch(bridgeUrl + '/api/v1/runner' + path, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.runnerToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Runner fixture request failed');
      return response.json();
    };
    try {
      writeFileSync(
        resolve(root, 'index.html'),
        `<html><body><button id="target">Publish</button><button id="other">Cancel</button><script type="module">import {mountNudge} from '/@fs/${resolve('packages/core/src/index.ts').replaceAll('\\', '/')}'; mountNudge(${JSON.stringify({ enabled: true, bridgeUrl, token: config.browserToken })});</script></body></html>`,
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
      worker = (async () => {
        await request('/readiness', {
          provider,
          adapter: 'available',
          auth: 'unknown',
          billing: 'unknown',
          checkedAt: new Date().toISOString(),
        });
        while (!ended) {
          const job = (await request('/claim', {})) as {
            run: AgentRun;
            annotation: Annotation;
            session: AgentSession;
          } | null;
          if (job) {
            const update = (data: Record<string, unknown>) =>
              request(`/${job.run.id}/update`, {
                ...data,
                lease: job.run.lease,
              });
            const current = (agent = new AcpTurn(
              process.execPath,
              [resolve('tests/helpers/acp-fixture.ts')],
              root,
              update,
              provider,
            ));
            void current.done.catch(() => {});
            // Same forwarding as the real runner.
            current.onTitle = (title) => {
              void request(`/sessions/${job.session.id}/title`, {
                title,
              }).catch(() => {});
            };
            let complete = false;
            const heartbeat = (async () => {
              while (!complete && !ended) {
                const response = (await update({ type: 'heartbeat' })) as {
                  stop: boolean;
                  answer?: RunAnswer;
                };
                if (response.answer) current.answer(response.answer);
                if (response.stop) {
                  await current.stop();
                  break;
                }
                await new Promise((r) => setTimeout(r, 100));
              }
            })();
            try {
              await current.start(job);
              const report = await current.done;
              complete = true;
              await heartbeat;
              await update({ type: 'completed', report });
            } catch {
              complete = true;
              await heartbeat.catch(() => {});
              await update({ type: 'cancelled' }).catch(() => {});
            } finally {
              current.close();
              agent = undefined;
            }
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      })();
      void worker.catch(() => {});
      await page.goto(origin);
      const overlay = page.locator('[data-nudge-host]');
      const submit = async (
        target: string,
        comment: string,
        session?: string,
      ) => {
        await overlay
          .getByRole('button', { name: 'Annotate UI', exact: true })
          .click();
        await page.locator(target).click();
        await expect(overlay.getByLabel('Agent session')).toHaveValue('');
        if (session)
          await overlay.getByLabel('Agent session').selectOption(session);
        await overlay
          .getByLabel('What should the coding agent change here?')
          .fill(comment);
        await overlay
          .getByRole('button', { name: 'Run agent', exact: true })
          .click();
      };
      await expect
        .poll(async () => (await request('/claim', {})) === null)
        .toBe(true);
      await submit('#target', 'Increase button padding');
      await expect(
        overlay.getByRole('button', { name: 'Allow once' }),
      ).toBeVisible();
      await page.reload();
      await overlay
        .getByRole('button', {
          name: 'Open comment: Increase button padding',
          exact: true,
        })
        .click();
      await overlay.getByRole('button', { name: 'Deny', exact: true }).click();
      await overlay.getByLabel(/Which color\?/).fill('coral');
      await overlay.getByRole('button', { name: 'Send answer' }).click();
      await expect(
        overlay.getByText('Fixture implementation report', { exact: true }),
      ).toBeVisible();
      // The agent's own (sanitised) title replaces the prompt excerpt.
      await expect(
        overlay.getByLabel('Agent session').locator('option').nth(1),
      ).toHaveText(`Pad the primary button · ${provider}`);
      const session = await overlay
        .getByLabel('Agent session')
        .locator('option')
        .nth(1)
        .getAttribute('value');
      await overlay
        .getByRole('button', { name: 'Accept', exact: true })
        .click();
      await overlay
        .getByRole('button', { name: 'Close comment', exact: true })
        .click();
      await submit('#other', 'Change another element', session!);
      await expect(
        overlay.getByText(new RegExp(`Existing ${provider} session`)),
      ).toBeVisible();
      await overlay
        .getByRole('button', { name: 'Stop agent', exact: true })
        .click();
      await expect(
        overlay.getByRole('button', { name: 'Retry agent', exact: true }),
      ).toBeVisible();
      await expect(overlay.getByLabel('Agent session')).toHaveValue('');
    } finally {
      ended = true;
      await agent?.stop();
      await worker?.catch(() => {});
      await page.goto('about:blank');
      await server?.close();
      await bridge.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
