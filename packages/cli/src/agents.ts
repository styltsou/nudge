import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectMcpFile } from './runtime';
import { installAdapter } from '../../runner/src/adapters';

import { type Provider } from '../../shared/src/runs';
export type { Provider } from '../../shared/src/runs';
import { detectAgents, type AgentStatus } from '../../runner/src/readiness';
export { detectAgents } from '../../runner/src/readiness';
export type { AgentStatus, Probe } from '../../runner/src/readiness';
export function configureAgent(root: string, provider: Provider) {
  if (provider === 'opencode')
    throw new Error(
      'Use --managed for OpenCode. Automatic external MCP registration is not supported for OpenCode.',
    );
  const server = {
    command: process.execPath,
    args: [projectMcpFile(root)],
    env: { NUDGE_PROJECT_ROOT: root },
  };
  if (provider === 'claude') {
    const path = resolve(root, '.mcp.json');
    const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      (data.mcpServers !== undefined &&
        (!data.mcpServers ||
          typeof data.mcpServers !== 'object' ||
          Array.isArray(data.mcpServers)))
    )
      throw new Error(
        'Invalid .mcp.json. Existing configuration was preserved.',
      );
    if (
      data.mcpServers?.usenudge &&
      JSON.stringify(data.mcpServers.usenudge) !== JSON.stringify(server)
    )
      throw new Error(
        'An existing usenudge MCP entry differs. Resolve it before setup.',
      );
    writeFileSync(
      path,
      JSON.stringify(
        { ...data, mcpServers: { ...data.mcpServers, usenudge: server } },
        null,
        2,
      ) + '\n',
      { mode: 0o600 },
    );
  } else {
    const path = resolve(root, '.codex/config.toml');
    const content = existsSync(path) ? readFileSync(path, 'utf8') : '';
    const parsed = Bun.TOML.parse(content) as {
      mcp_servers?: Record<string, unknown>;
    };
    const block = `\n[mcp_servers.usenudge]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\nenv = { NUDGE_PROJECT_ROOT = ${JSON.stringify(root)} }\n`;
    if (parsed.mcp_servers?.usenudge) {
      if (!content.includes(block))
        throw new Error(
          'An existing Codex usenudge entry differs. Existing configuration was preserved.',
        );
    } else {
      mkdirSync(resolve(root, '.codex'), { recursive: true });
      writeFileSync(path, content + block, { mode: 0o600 });
    }
  }
  mkdirSync(resolve(root, '.nudge'), { recursive: true, mode: 0o700 });
  writeFileSync(
    resolve(root, '.nudge/agent.json'),
    JSON.stringify({ provider, mode: 'external-mcp' }, null, 2) + '\n',
    { mode: 0o600 },
  );
}
/** Prefer an installed, signed-in agent, then any installed one, in provider order. */
export function pickAgent(statuses: AgentStatus[]): Provider | undefined {
  return (
    statuses.find((s) => s.installed && s.auth === 'signed-in') ??
    statuses.find((s) => s.installed)
  )?.provider;
}
export async function guideAgent(
  root: string,
  selected?: string,
  managed = false,
) {
  const statuses = detectAgents();
  for (const s of statuses)
    console.log(
      `${s.provider}: ${s.installed ? `${s.version ?? 'version unavailable'} · ${s.auth === 'signed-in' ? 'Signed in' : s.auth === 'login-required' ? 'Sign in needed' : 'Sign-in not verified'}${s.billing === 'subscription' ? ' · Subscription login' : s.billing === 'api' ? ' · API billing' : ''}` : 'Native CLI not found (ACP setup can install its runtime)'}`,
    );
  if (!selected || selected === 'auto') {
    const picked = pickAgent(statuses);
    if (picked) {
      console.log(
        `Auto-selected ${picked}. Override with --agent codex|claude|opencode|skip.`,
      );
      selected = picked;
    } else selected = 'skip';
  }
  if (selected === 'skip') {
    console.log(
      'No installed agent CLI was selected. You can annotate now. To run an agent later: usenudge agents --agent codex --managed (or claude/opencode), then restart dev.',
    );
    return;
  }
  if (selected !== 'codex' && selected !== 'claude' && selected !== 'opencode')
    throw new Error('Choose codex, claude, opencode or skip.');
  const status = statuses.find((s) => s.provider === selected)!;
  if (!status.installed && !managed) {
    console.log(
      `Install ${selected}: ${selected === 'codex' ? 'https://developers.openai.com/codex/cli/' : selected === 'claude' ? 'https://code.claude.com/docs/en/setup' : 'https://opencode.ai/docs/'}. Then rerun agent setup.`,
    );
    return;
  }
  if (managed) {
    installAdapter(root, selected);
    mkdirSync(resolve(root, '.nudge'), { recursive: true, mode: 0o700 });
    writeFileSync(
      resolve(root, '.nudge/agent.json'),
      JSON.stringify({
        provider: selected,
        mode: 'managed',
        transport: 'acp',
      }) + '\n',
      { mode: 0o600 },
    );
  } else configureAgent(root, selected);
  if (status.auth !== 'signed-in')
    console.log(
      `${status.auth === 'login-required' ? 'Sign-in needed.' : 'Sign-in has not been verified.'} With the native CLI installed, use ${selected === 'codex' ? 'codex login' : selected === 'claude' ? 'claude auth login' : 'opencode auth login'}. Model access is only established by a real run.`,
    );
  console.log(
    managed
      ? `Managed runner configured. Start your app to use ${selected} directly from Nudge.`
      : `Project MCP configured for ${selected}. Start the app, then reload/trust this project in the agent. Your agent retains its normal approval policy. Cloud-backed agents may send context to their provider.`,
  );
  console.log(
    managed
      ? `Managed ${selected} enabled. Restart your dev server, then choose Run agent in Nudge. Provider sandbox/approval settings are preserved; cloud-backed models receive request context.`
      : 'External MCP connected. Use agents --agent codex --managed to enable UI-launched runs.',
  );
}
