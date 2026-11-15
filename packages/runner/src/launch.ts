import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export function launchRunner(root: string) {
  const bundled = fileURLToPath(new URL('./runner.js', import.meta.url));
  const entry = existsSync(bundled)
    ? bundled
    : fileURLToPath(new URL('./index.ts', import.meta.url));
  const processHandle = spawn(process.execPath, [entry], {
    cwd: root,
    windowsHide: true,
    stdio: ['pipe', 'ignore', 'ignore'],
    env: { ...process.env, NUDGE_PROJECT_ROOT: root },
  });
  processHandle.on('error', () => {
    /* Bridge lease expiry exposes interruption without raw logs. */
  });
  return async () => {
    processHandle.stdin.end();
    if (processHandle.exitCode !== null || processHandle.signalCode !== null)
      return;
    await new Promise<void>((r) => {
      const timer = setTimeout(() => {
        processHandle.kill();
        r();
      }, 8000);
      processHandle.once('exit', () => {
        clearTimeout(timer);
        r();
      });
    });
  };
}
