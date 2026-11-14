import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

export type BridgeConfig = {
  stateDir: string;
  projectId: string;
  browserToken: string;
  mcpToken: string;
  origins: string[];
  port: number;
};
export function loadConfig(projectRoot = process.cwd()): BridgeConfig {
  const stateDir = resolve(
    projectRoot,
    process.env.NUDGE_STATE_DIR ?? '.nudge',
  );
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const file = resolve(stateDir, 'credentials.json');
  let saved: { projectId: string; browserToken: string; mcpToken: string };
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
  const config = {
    stateDir,
    ...saved,
    origins: (process.env.NUDGE_ALLOWED_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
    port: Number(process.env.NUDGE_PORT ?? 4747),
  };
  if (
    !/^[a-f0-9-]{36}$/.test(config.projectId) ||
    ![config.browserToken, config.mcpToken].every((v) =>
      /^[a-f0-9]{64}$/.test(v),
    ) ||
    config.browserToken === config.mcpToken
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
