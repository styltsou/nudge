import { loadConfig } from '@usenudge/bridge/config';
import { lstatSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const command = process.argv[2] ?? 'doctor';
if (command === 'clean') {
  if (!process.argv.includes('--confirm'))
    throw new Error(
      'Stop Nudge first. This deletes local annotations, credentials and snapshots. Run bun run state:clean --confirm to proceed.',
    );
  if (process.env.NUDGE_STATE_DIR)
    throw new Error('Custom state directory configured; clean it manually.');
  const root = resolve(process.cwd());
  const target = resolve(root, '.nudge');
  if (target !== `${root}${process.platform === 'win32' ? '\\' : '/'}.nudge`)
    throw new Error('Invalid local state directory');
  try {
    if (lstatSync(target).isSymbolicLink())
      throw new Error('Refusing to remove linked state directory');
    rmSync(target, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  console.log(
    'Local Nudge state removed. The next dev session will provision new credentials.',
  );
} else if (command === 'doctor') {
  try {
    const config = loadConfig();
    const url = `http://127.0.0.1:${config.port}`;
    const health = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await fetch(`${url}/api/v1/annotations`, {
      headers: { Authorization: `Bearer ${config.mcpToken}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!health.ok || !data.ok) throw new Error();
    console.log(
      'Nudge healthy: bridge reachable; MCP auth and SQLite reads working.',
    );
  } catch {
    console.error(
      'Nudge health check failed. Start bun run dev from the same project and check local credentials/configuration.',
    );
    process.exitCode = 1;
  }
} else
  throw new Error(
    'Usage: bun run bridge:doctor or bun run state:clean --confirm',
  );
