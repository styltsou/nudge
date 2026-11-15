import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { providers, type Provider } from '../../shared/src/runs';

export type BridgeConfig = {
  stateDir: string;
  projectId: string;
  browserToken: string;
  mcpToken: string;
  runnerToken?: string;
  managed?: boolean;
  provider?: Provider;
  setupCommand?: string;
  origins: string[];
  port: number;
};
export function loadConfig(projectRoot = process.cwd()): BridgeConfig {
  const stateDir = resolve(
    projectRoot,
    process.env.NUDGE_STATE_DIR ?? '.nudge',
  );
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  // Keep state out of Git even without edits to a consumer's root .gitignore.
  writeFileSync(resolve(stateDir, '.gitignore'), '*\n');
  const file = resolve(stateDir, 'credentials.json');
  let saved: {
    projectId: string;
    browserToken: string;
    mcpToken: string;
    runnerToken?: string;
  };
  try {
    saved = JSON.parse(readFileSync(file, 'utf8')) as typeof saved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      throw new Error('Unable to read Nudge credentials');
    saved = {
      projectId: randomUUID(),
      browserToken: randomBytes(32).toString('hex'),
      mcpToken: randomBytes(32).toString('hex'),
    };
    writeFileSync(file, JSON.stringify(saved), { flag: 'wx', mode: 0o600 });
  }
  if (!saved.runnerToken) {
    saved.runnerToken = randomBytes(32).toString('hex');
    writeFileSync(file, JSON.stringify(saved), { mode: 0o600 });
  }
  let managed = false;
  let provider: Provider = 'codex';
  try {
    const agent = JSON.parse(
      readFileSync(resolve(stateDir, 'agent.json'), 'utf8'),
    );
    if (providers.includes(agent.provider)) {
      provider = agent.provider;
      managed = agent.mode === 'managed';
    }
  } catch {
    /* external mode until explicitly configured */
  }
  const config = {
    stateDir,
    ...saved,
    managed,
    provider,
    setupCommand: 'bunx --bun usenudge',
    origins: (process.env.NUDGE_ALLOWED_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
    port: Number(process.env.NUDGE_PORT ?? 4747),
  };
  if (
    !/^[a-f0-9-]{36}$/.test(config.projectId) ||
    ![config.browserToken, config.mcpToken, config.runnerToken].every(
      (v) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v),
    ) ||
    new Set([config.browserToken, config.mcpToken, config.runnerToken]).size !==
      3
  )
    throw new Error('Invalid Nudge credential file');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw new Error('Invalid NUDGE_PORT');
  for (const origin of config.origins) {
    const url = new URL(origin);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== origin
    )
      throw new Error('Origins must be exact local HTTP origins');
  }
  return config;
}
