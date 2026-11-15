import { test, expect } from 'bun:test';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareLocalProject } from '../../packages/cli/src/local';

test('local setup leaves tracked files alone and ignores its state without root gitignore changes', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-local-'));
  try {
    const git = (args: string[]) => {
      const result = spawnSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        windowsHide: true,
      });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    git(['init', '-q']);
    const pkg =
      '{"type":"module","scripts":{"dev":"vite","build":"vite build"},"devDependencies":{"vite":"8.3.7"}}';
    const config = 'throw new Error("setup must not evaluate config")';
    writeFileSync(resolve(root, 'package.json'), pkg);
    writeFileSync(resolve(root, 'vite.config.ts'), config);
    const before = git(['status', '--porcelain', '--untracked-files=all']);
    prepareLocalProject(root);
    prepareLocalProject(root);
    expect(git(['status', '--porcelain', '--untracked-files=all'])).toBe(
      before,
    );
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(pkg);
    expect(readFileSync(resolve(root, 'vite.config.ts'), 'utf8')).toBe(config);
    expect(existsSync(resolve(root, '.gitignore'))).toBe(false);
    expect(existsSync(resolve(root, 'vite.nudge.config.ts'))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
