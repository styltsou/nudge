import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Annotation } from '../../shared/src/index';
import type {
  AgentRun,
  AgentSession,
  RunAnswer,
  SetupTask,
} from '../../shared/src/runs';
import { runSetup } from './setup';
import { AcpTurn } from './acp';
import { resolveAdapter } from './adapters';
import type { AgentTurn } from './provider';
import { checkReadiness, reportAgents } from './readiness';

const root = process.env.NUDGE_PROJECT_ROOT;
if (!root) throw new Error('Runner requires a configured project root');
const state = resolve(root, process.env.NUDGE_STATE_DIR ?? '.nudge');
const { runnerToken } = JSON.parse(
  readFileSync(resolve(state, 'credentials.json'), 'utf8'),
);
const { bridgeUrl } = JSON.parse(
  readFileSync(resolve(state, 'connection.json'), 'utf8'),
);
const url = new URL(bridgeUrl);
/** Re-read each cycle: the browser can switch agents while this runner is up. */
function agentConfig():
  { provider: 'codex' | 'claude' | 'opencode'; mode?: string } | undefined {
  try {
    return JSON.parse(readFileSync(resolve(state, 'agent.json'), 'utf8'));
  } catch {
    return undefined;
  }
}
if (
  url.protocol !== 'http:' ||
  url.hostname !== '127.0.0.1' ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
)
  throw new Error('Runner requires loopback bridge');
let stopping = false;
let current: AgentTurn | undefined;
const lifetime = new AbortController();
const shutdown = () => {
  stopping = true;
  lifetime.abort();
  void current?.stop();
};
process.stdin.resume();
process.stdin.on('end', shutdown);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    stopping = true;
    lifetime.abort();
    void current?.stop();
  });
async function request(path: string, body: unknown) {
  const response = await fetch(`${url.origin}/api/v1/runner${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${runnerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(5000)]),
  });
  if (!response.ok) throw new Error('Runner request failed');
  return response.json();
}
let checkedAt = 0;
let settingUp = false;
const refreshStatus = async () => {
  const config = agentConfig();
  if (config?.mode === 'managed')
    await request('/readiness', checkReadiness(root, config.provider));
  await request('/agents', { agents: reportAgents(root) });
  checkedAt = Date.now();
};
while (!stopping) {
  try {
    const config = agentConfig();
    if (!settingUp) {
      const task = (await request('/setup/claim', {})) as SetupTask | null;
      if (task) {
        settingUp = true;
        void runSetup(root, task, (event) =>
          request('/setup/update', { id: task.id, ...event }),
        ).finally(() => {
          settingUp = false;
          checkedAt = 0;
        });
      }
    }
    const job =
      config?.mode === 'managed'
        ? ((await request('/claim', {})) as {
            run: AgentRun;
            annotation: Annotation;
            session: AgentSession;
          } | null)
        : null;
    if (!job && Date.now() - checkedAt > 30000) await refreshStatus();
    if (job) {
      const update = (event: Record<string, unknown>) =>
        request(`/${job.run.id}/update`, { ...event, lease: job.run.lease });
      const provider = job.session.provider;
      const adapter = resolveAdapter(root, provider);
      if (!adapter) {
        await update({ type: 'failed' });
        continue;
      }
      const agent = (current = new AcpTurn(
        adapter.executable,
        adapter.args,
        root,
        update,
        provider,
      ));
      void agent.done.catch(() => {});
      let cancelled = false;
      let finished = false;
      const deadline = setTimeout(
        () => {
          void agent.stop();
        },
        30 * 60 * 1000,
      );
      const heartbeat = (async () => {
        while (!finished && !stopping) {
          const result = (await update({ type: 'heartbeat' })) as {
            stop: boolean;
            answer?: RunAnswer;
          };
          if (result.stop) {
            cancelled = true;
            await agent.stop();
            break;
          }
          if (result.answer) agent.answer(result.answer);
          await new Promise((r) => setTimeout(r, 1000));
        }
      })();
      // Observe all promises immediately, including early child-process failures.
      const work = agent.start(job).then(() => agent.done);
      try {
        const report = await Promise.race([
          work,
          heartbeat.then(() => {
            if (cancelled || stopping) throw new Error('Stopped');
            return agent.done;
          }),
        ]);
        await update({ type: 'completed', report });
      } catch {
        await agent.stop();
        await update({ type: cancelled ? 'cancelled' : 'failed' }).catch(
          () => {},
        );
      } finally {
        clearTimeout(deadline);
        finished = true;
        agent.close();
        await heartbeat.catch(() => {});
        current = undefined;
      }
    }
  } catch {
    if (!stopping) {
      stopping = true;
      await current?.stop();
    }
  }
  if (!stopping) await new Promise((r) => setTimeout(r, 1000));
}
process.stdin.pause();
