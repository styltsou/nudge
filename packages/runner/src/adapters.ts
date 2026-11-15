import { bunExecutable } from '../../shared/src/bun';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Provider } from '../../shared/src/runs';

// Versioned adapters are installed only by trusted CLI setup, never by a run request.
export const adapterPackages = {
  codex: {
    name: '@agentclientprotocol/codex-acp',
    version: '2.6.0',
    bin: 'codex-acp',
  },
  claude: {
    name: '@agentclientprotocol/claude-agent-acp',
    version: '0.107.0',
    bin: 'claude-agent-acp',
  },
} as const;
export function adapterDirectory(root: string, provider: 'codex' | 'claude') {
  return resolve(root, '.nudge/agents', provider);
}
export function resolveAdapter(
  root: string,
  provider: Provider,
  which = Bun.which,
): { executable: string; args: string[] } | null {
  const bin =
    provider === 'opencode' ? 'opencode' : adapterPackages[provider].bin;
  const installed =
    which(process.platform === 'win32' ? bin + '.exe' : bin) ?? which(bin);
  if (installed)
    return {
      executable: installed,
      args: provider === 'opencode' ? ['acp'] : [],
    };
  if (provider === 'opencode') return null;
  const spec = adapterPackages[provider];
  const directory = resolve(
    adapterDirectory(root, provider),
    'node_modules',
    spec.name,
  );
  const manifest = resolve(directory, 'package.json');
  if (!existsSync(manifest)) return null;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
  if (pkg.name !== spec.name || pkg.version !== spec.version)
    throw new Error('Unexpected ACP adapter package. Rerun Nudge agent setup.');
  const entry = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[spec.bin];
  if (typeof entry !== 'string')
    throw new Error('ACP adapter has no executable entry.');
  const path = resolve(directory, entry);
  const rel = relative(directory, path);
  if (isAbsolute(rel) || rel.startsWith('..') || !existsSync(path))
    throw new Error('Invalid ACP adapter entry.');
  return { executable: bunExecutable(), args: [path] };
}
function prepareInstall(root: string, provider: 'codex' | 'claude') {
  const spec = adapterPackages[provider];
  const directory = adapterDirectory(root, provider);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(
    resolve(directory, 'package.json'),
    JSON.stringify(
      { private: true, dependencies: { [spec.name]: spec.version } },
      null,
      2,
    ) + '\n',
  );
  return directory;
}
const installEnv = (root: string) => ({
  ...process.env,
  BUN_INSTALL_CACHE_DIR: resolve(root, '.nudge/agents/cache'),
});
/** Non-blocking install for the runner, so heartbeats continue meanwhile. */
export async function installAdapterAsync(root: string, provider: Provider) {
  if (resolveAdapter(root, provider)) return;
  if (provider === 'opencode')
    throw new Error('Install OpenCode with ACP support, then rerun setup.');
  const directory = prepareInstall(root, provider);
  const child = Bun.spawn(
    [bunExecutable(), 'install', '--cwd', directory, '--ignore-scripts'],
    {
      cwd: root,
      stdin: 'ignore',
      stdout: 'ignore',
      stderr: 'ignore',
      windowsHide: true,
      env: installEnv(root),
      timeout: 180000,
    },
  );
  if ((await child.exited) !== 0 || !resolveAdapter(root, provider))
    throw new Error('ACP adapter installation failed.');
}
export function installAdapter(root: string, provider: Provider) {
  if (resolveAdapter(root, provider)) return;
  if (provider === 'opencode')
    throw new Error('Install OpenCode with ACP support, then rerun setup.');
  const spec = adapterPackages[provider];
  const directory = prepareInstall(root, provider);
  console.log(`Installing ${spec.bin} in Nudge's private runtime directory...`);
  const result = spawnSync(
    bunExecutable(),
    ['install', '--cwd', directory, '--ignore-scripts'],
    {
      cwd: root,
      stdio: 'inherit',
      windowsHide: true,
      timeout: 180000,
      env: installEnv(root),
    },
  );
  if (result.status !== 0 || !resolveAdapter(root, provider))
    throw new Error(
      'ACP adapter installation failed. Check registry access and rerun this setup command; the app manifest was not changed.',
    );
}
