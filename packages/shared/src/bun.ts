import { basename, dirname, resolve } from 'node:path';

/**
 * Path to the real `bun` executable. Under `bunx`, process.execPath can be the
 * `bunx` launcher, and spawning it with `install` or a script path would run a
 * package instead of Bun itself.
 */
export function bunExecutable(): string {
  const exec = process.execPath;
  if (/^bun(?:\.exe)?$/i.test(basename(exec))) return exec;
  const sibling = resolve(
    dirname(exec),
    process.platform === 'win32' ? 'bun.exe' : 'bun',
  );
  return Bun.file(sibling).size > 0 ? sibling : (Bun.which('bun') ?? exec);
}
