import { test, expect } from 'bun:test';
import { resolve } from 'node:path';
import { AcpTurn, parseAgentReport } from './acp';
import { redact } from './redact';
import type { Job } from './provider';
import type { Provider, RunInteraction } from '../../shared/src/runs';
const job = (provider: Provider, resume: boolean): Job => ({
  run: {} as Job['run'],
  session: {
    id: 'local',
    provider,
    title: '',
    updatedAt: '',
    ...(resume ? { providerSessionId: 'selected-session' } : {}),
  },
  annotation: {
    anchor: {},
    revisions: [{ comment: 'Change padding' }],
  } as Job['annotation'],
});
for (const provider of ['codex', 'claude', 'opencode'] as const)
  for (const resume of [false, true])
    test(`ACP ${provider}: ${resume ? 'explicit reuse' : 'fresh session'}, deny, question and report`, async () => {
      const events: Record<string, unknown>[] = [];
      const agent = new AcpTurn(
        process.execPath,
        [resolve('tests/helpers/acp-fixture.ts')],
        process.cwd(),
        async (event) => {
          events.push(event);
          if (event.type === 'interaction') {
            const ask = event.interaction as RunInteraction;
            agent.answer(
              ask.kind === 'approval'
                ? { interactionId: ask.id, decision: 'decline' }
                : { interactionId: ask.id, answers: { color: 'coral' } },
            );
          }
        },
        provider,
      );
      void agent.done.catch(() => {});
      try {
        await agent.start(job(provider, resume));
        expect((await agent.done).summary).toBe(
          'Fixture implementation report',
        );
        expect(
          events.find((e) => e.providerSessionId)?.providerSessionId ===
            'selected-session',
        ).toBe(resume);
        expect(events.filter((e) => e.type === 'interaction')).toHaveLength(2);
      } finally {
        await agent.stop();
      }
    });
test('ACP cancellation closes a process waiting for approval', async () => {
  let asked!: () => void;
  const pending = new Promise<void>((r) => {
    asked = r;
  });
  const agent = new AcpTurn(
    process.execPath,
    [resolve('tests/helpers/acp-fixture.ts')],
    process.cwd(),
    async (e) => {
      if (e.type === 'interaction') asked();
    },
  );
  void agent.done.catch(() => {});
  await agent.start(job('codex', false));
  await pending;
  await agent.stop();
  await expect(agent.done).rejects.toThrow();
});
for (const flag of ['--exit', '--bad-report'])
  test(`ACP ${flag} cannot produce a successful report`, async () => {
    const agent = new AcpTurn(
      process.execPath,
      [resolve('tests/helpers/acp-fixture.ts'), flag],
      process.cwd(),
      async (e) => {
        if (e.type === 'interaction') {
          const ask = e.interaction as RunInteraction;
          agent.answer(
            ask.kind === 'approval'
              ? { interactionId: ask.id, decision: 'decline' }
              : { interactionId: ask.id, answers: { color: 'coral' } },
          );
        }
      },
    );
    void agent.done.catch(() => {});
    try {
      await agent.start(job('codex', false));
      const result = await agent.done.then(
        () => 'completed',
        () => 'failed',
      );
      expect(result).toBe('failed');
    } finally {
      await agent.stop();
    }
  });
test('report parsing and activity redaction reject invalid/secret data', () => {
  expect(() => parseAgentReport('No report')).toThrow();
  expect(() => parseAgentReport('{"summary":""}')).toThrow();
  expect(redact(`token=secret Bearer abc ${'a'.repeat(64)}`)).not.toContain(
    'secret',
  );
});
