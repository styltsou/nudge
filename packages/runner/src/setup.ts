import type { Provider, SetupTask } from '../../shared/src/runs';
import { safeSignInUrl } from '../../shared/src/runs';
import { installAdapterAsync } from './adapters';
import { checkReadiness, nativeExecutable } from './readiness';

export type SetupUpdate = (event: {
  state: 'running' | 'done' | 'failed';
  message?: string;
  url?: string;
}) => Promise<unknown>;
// Fixed argument lists only; nothing from the browser reaches a command line.
export const loginCommands = {
  codex: ['login'],
  claude: ['auth', 'login'],
} as const;
const ansi = new RegExp(String.raw`\u001b\[[0-9;?]*[ -/]*[@-~]`, 'g');
/** First https URL a native CLI printed, stripped of terminal control codes. */
export function extractSignInUrl(output: string): string | undefined {
  for (const match of output
    .replace(ansi, '')
    .matchAll(/https:\/\/[^\s"'<>]+/g)) {
    const safe = safeSignInUrl(match[0].replace(/[).,;]+$/, ''));
    if (safe) return safe;
  }
}
async function login(
  root: string,
  provider: 'codex' | 'claude',
  update: SetupUpdate,
) {
  const executable = nativeExecutable(provider);
  if (!executable) {
    await update({
      state: 'failed',
      message: `The ${provider} CLI was not found. Install it, then try again.`,
    });
    return;
  }
  const child = Bun.spawn([executable, ...loginCommands[provider]], {
    cwd: root,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    timeout: 5 * 60 * 1000,
  });
  await update({
    state: 'running',
    message: 'Finish signing in in the window your agent opened.',
  });
  let output = '';
  let url: string | undefined;
  const read = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    const reader = stream.getReader();
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      output = (output + decoder.decode(chunk, { stream: true })).slice(-8000);
      const found = extractSignInUrl(output);
      if (found && found !== url) {
        url = found;
        await update({
          state: 'running',
          message: 'Open the sign-in page if it did not open on its own.',
          url,
        });
      }
    }
  };
  await Promise.all([read(child.stdout), read(child.stderr)]).catch(() => {});
  await child.exited;
  const status = checkReadiness(root, provider);
  await update(
    status.auth === 'signed-in'
      ? { state: 'done', message: 'Signed in.' }
      : {
          state: 'failed',
          message:
            'Sign-in did not complete. Try again, or run the command in a terminal.',
        },
  );
}
export async function runSetup(
  root: string,
  task: SetupTask,
  update: SetupUpdate,
) {
  try {
    if (task.kind === 'install') {
      if (task.provider === 'opencode') {
        await update({
          state: 'done',
          message:
            'OpenCode uses its own CLI. Install it and run opencode auth login in a terminal.',
        });
        return;
      }
      await update({
        state: 'running',
        message: 'Installing the agent adapter…',
      });
      await installAdapterAsync(root, task.provider as Provider);
      await update({ state: 'done', message: 'Adapter ready.' });
    } else if (task.provider === 'opencode') {
      await update({
        state: 'failed',
        message: 'Run opencode auth login in a terminal.',
      });
    } else await login(root, task.provider, update);
  } catch {
    await update({
      state: 'failed',
      message:
        task.kind === 'install'
          ? 'Adapter install failed. Check registry access and try again.'
          : 'Sign-in could not start.',
    }).catch(() => {});
  }
}
