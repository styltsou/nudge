import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as p from '@clack/prompts';
import type { Provider } from '../../shared/src/runs';
import { installAdapterAsync, resolveAdapter } from '../../runner/src/adapters';
import {
  detectAgentsAsync,
  type AgentStatus,
} from '../../runner/src/readiness';
import { configureAgent, pickAgent } from './agents';
import { brand } from './brand';
import { initProject } from './init';
import { initCommand, type InitArgs, type ResolvedInit } from './init-options';
import { prepareLocalProject } from './local';
import { packaged, projectMcpFile } from './runtime';

const names: Record<Provider, string> = {
  codex: 'Codex',
  claude: 'Claude',
  opencode: 'OpenCode',
};
const loginCommand: Record<Provider, string> = {
  codex: 'codex login',
  claude: 'claude auth login',
  opencode: 'opencode auth login',
};
export const commandPrefix = packaged
  ? 'bunx --bun usenudge'
  : 'bun packages/cli/src/index.ts';

/** Output for one run: clack in a terminal, plain lines for scripts and CI. */
type Reporter = {
  task(
    message: string,
    transient?: boolean,
  ): {
    done(message: string): void;
    fail(message: string): void;
  };
  info(message: string): void;
  warn(message: string): void;
};
const plain: Reporter = {
  task: () => ({
    done: (m) => m && console.log(m),
    fail: (m) => console.error(m),
  }),
  info: (m) => console.log(m),
  warn: (m) => console.warn(m),
};
const fancy: Reporter = {
  task(message, transient) {
    // Transient spinners skip the guide line so clearing leaves no trace.
    const s = p.spinner({
      styleFrame: brand.accent,
      ...(transient ? { withGuide: false } : {}),
    });
    s.start(message);
    // An empty message removes the spinner line entirely.
    return {
      done: (m) => (m ? s.stop(m) : s.clear()),
      fail: (m) => s.error(m),
    };
  },
  info: (m) => p.log.info(m),
  warn: (m) => p.log.warn(m),
};

function statusHint(s: AgentStatus) {
  if (!s.installed) return 'CLI not found';
  if (s.auth === 'signed-in')
    return s.billing === 'subscription'
      ? 'signed in · subscription'
      : s.billing === 'api'
        ? 'signed in · API billing'
        : 'signed in';
  return s.auth === 'login-required' ? 'sign-in needed' : 'installed';
}
function cancelled(): never {
  p.cancel('Setup cancelled. Nothing was changed.');
  process.exit(0);
}
async function ask<T>(prompt: Promise<T>): Promise<Exclude<T, symbol>> {
  const value = await prompt;
  if (p.isCancel(value)) cancelled();
  return value as Exclude<T, symbol>;
}

/** Fill only what flags left open, by asking. Returns the full, explicit setup. */
async function decide(
  args: InitArgs,
  statuses: AgentStatus[],
  interactive: boolean,
): Promise<ResolvedInit> {
  let agents: Provider[] | 'preserve';
  if (args.agents === 'preserve') agents = 'preserve';
  else if (Array.isArray(args.agents)) agents = args.agents;
  else if (args.agents === 'auto' || !interactive) {
    const picked = pickAgent(statuses);
    agents = picked ? [picked] : 'preserve';
  } else {
    const chosen = await ask(
      p.multiselect<Provider>({
        message: `Which agents should Nudge be able to run? ${brand.muted('(space to toggle)')}`,
        options: statuses.map((s) => ({
          value: s.provider,
          label: names[s.provider],
          hint: statusHint(s),
          disabled: s.provider === 'opencode' && !s.installed,
        })),
        // Preselect agents that look ready to use.
        initialValues: statuses
          .filter((s) => s.installed && s.auth !== 'login-required')
          .map((s) => s.provider),
        required: false,
      }),
    );
    agents = chosen.length ? chosen : 'preserve';
    if (Array.isArray(agents) && agents.length > 1) {
      const first = await ask(
        p.select<Provider>({
          message: 'Which one should run by default?',
          options: agents.map((a) => ({
            value: a,
            label: names[a],
            hint: statusHint(statuses.find((s) => s.provider === a)!),
          })),
        }),
      );
      agents = [first, ...agents.filter((a) => a !== first)];
    }
  }
  let mode = args.mode ?? 'managed';
  if (!args.mode && interactive && agents !== 'preserve')
    mode = await ask(
      p.select<'managed' | 'external'>({
        message: 'How should requests reach the agent?',
        options: [
          {
            value: 'managed',
            label: 'Run it from the browser',
            hint: 'recommended',
          },
          {
            value: 'external',
            label: 'Connect an agent I run myself (MCP)',
          },
        ],
      }),
    );
  let integrate = args.integrate ?? false;
  if (args.integrate === undefined && interactive)
    integrate = await ask(
      p.confirm({
        message: `Add Nudge to your Vite config and dev script? ${brand.muted('No keeps your files untouched; start with `usenudge dev` instead.')}`,
        initialValue: false,
      }),
    );
  return {
    ...(args.rootArg ? { rootArg: args.rootArg } : {}),
    agents,
    mode,
    integrate,
    ...(args.packageSource ? { packageSource: args.packageSource } : {}),
  };
}

function writeAgent(root: string, provider: Provider) {
  mkdirSync(resolve(root, '.nudge'), { recursive: true, mode: 0o700 });
  writeFileSync(
    resolve(root, '.nudge/agent.json'),
    JSON.stringify({ provider, mode: 'managed', transport: 'acp' }) + '\n',
    { mode: 0o600 },
  );
}

export async function runInit(args: InitArgs, interactive: boolean) {
  const ui = interactive ? fancy : plain;
  if (interactive)
    p.intro(
      `${brand.badge('nudge')} ${brand.muted('Set up visual requests for this app')}`,
    );
  const needStatus =
    args.agents !== 'preserve' &&
    !(Array.isArray(args.agents) && args.mode === 'external');
  let statuses: AgentStatus[] = [];
  if (needStatus) {
    const check = ui.task('Checking coding agents on this machine', true);
    statuses = await detectAgentsAsync(args.root);
    // The agent question shows each status, so no summary line here.
    check.done('');
  }
  const init = await decide(args, statuses, interactive);
  const command = initCommand(commandPrefix, init);
  if (interactive) p.note(brand.accent(command), 'Same setup without prompts');

  // 1. Project files: untouched by default, opt-in integration otherwise.
  if (init.integrate) initProject(args.root, init.packageSource);
  else {
    prepareLocalProject(args.root);
    ui.info('Local state ready in .nudge/ (git-ignored). App files unchanged.');
  }

  // 2. Agents.
  if (init.agents === 'preserve') {
    ui.info(
      `No agent changed. Choose one later in ${brand.bold('Agent setup')} in the browser.`,
    );
  } else if (init.mode === 'external') {
    if (!existsSync(projectMcpFile(args.root)))
      throw new Error(
        'Install usenudge as an app dev dependency before configuring external MCP, so its executable path stays available.',
      );
    // Configure in reverse so the first (default) agent is recorded last.
    for (const agent of [...init.agents].reverse()) {
      if (agent === 'opencode') {
        ui.warn('OpenCode connects from the browser only; skipped for MCP.');
        continue;
      }
      configureAgent(args.root, agent);
      ui.info(
        `${names[agent]} MCP configured. Reload the project in ${names[agent]}.`,
      );
    }
  } else {
    for (const agent of init.agents) {
      if (resolveAdapter(args.root, agent)) continue;
      if (agent === 'opencode') {
        ui.warn(
          'OpenCode needs its CLI with ACP support; install it, then rerun.',
        );
        continue;
      }
      const task = ui.task(`Installing the ${names[agent]} adapter`);
      try {
        await installAdapterAsync(args.root, agent);
        task.done(`${names[agent]} adapter ready`);
      } catch {
        task.fail(
          `${names[agent]} adapter install failed. Check your network and rerun.`,
        );
        throw new Error('Agent adapter installation failed.');
      }
    }
    writeAgent(args.root, init.agents[0]!);
    ui.info(
      `${names[init.agents[0]!]} runs by default${init.agents.length > 1 ? `; switch any time in ${brand.bold('Agent setup')}` : ''}.`,
    );
    for (const agent of init.agents) {
      const s = statuses.find((x) => x.provider === agent);
      if (s && s.auth !== 'signed-in')
        ui.warn(
          `${names[agent]} isn't signed in yet. Use ${brand.bold('Agent setup')} in the browser, or run ${brand.accent(loginCommand[agent])}.`,
        );
    }
  }

  const next = init.integrate
    ? 'Start your usual dev script'
    : `Start with ${brand.accent(`${commandPrefix} dev`)}`;
  if (interactive) p.outro(`${next}, then open your app.`);
  else {
    console.log(`${next}.`);
    console.log(`Setup command: ${command}`);
  }
}
