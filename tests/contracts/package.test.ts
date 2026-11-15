import { test, expect } from 'bun:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

test('packaged release is allowlisted and its setup skill matches the public download', async () => {
  const release = Bun.spawn([process.execPath, 'scripts/package-release.ts'], {
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const [code, error] = await Promise.all([
    release.exited,
    new Response(release.stderr).text(),
  ]);
  expect(code, error).toBe(0);
  const check = Bun.spawn([process.execPath, 'scripts/check-release.ts'], {
    stdout: 'ignore',
    stderr: 'pipe',
  });
  const [checked, detail] = await Promise.all([
    check.exited,
    new Response(check.stderr).text(),
  ]);
  expect(checked, detail).toBe(0);
  expect(readFileSync('skills/nudge-project-setup/SKILL.md', 'utf8')).toBe(
    readFileSync(
      'apps/website/public/skills/nudge-project-setup/SKILL.md',
      'utf8',
    ),
  );
});

test('reinstalling a rebuilt local archive refreshes the package without resetting app files', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-refresh-'));
  const source = resolve(root, 'package');
  const app = resolve(root, 'app');
  const archive = resolve(root, 'preview.tgz');
  mkdirSync(source);
  mkdirSync(app);
  const run = async (args: string[], cwd: string) => {
    const child = Bun.spawn([process.execPath, ...args], {
      cwd,
      env: { ...process.env, BUN_INSTALL_CACHE_DIR: resolve(root, 'cache') },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [code, out, err] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect(code, out + err).toBe(0);
  };
  const pack = () =>
    run(['pm', 'pack', '--ignore-scripts', '--filename', archive], source);
  try {
    writeFileSync(
      resolve(source, 'package.json'),
      JSON.stringify({
        name: 'nudge-refresh-fixture',
        version: '0.1.0',
        private: true,
        files: ['value.txt'],
      }),
    );
    writeFileSync(resolve(source, 'value.txt'), 'first preview');
    writeFileSync(
      resolve(app, 'package.json'),
      JSON.stringify({
        private: true,
        devDependencies: {
          'nudge-refresh-fixture': archive.replaceAll('\\', '/'),
        },
      }),
    );
    writeFileSync(resolve(app, 'app.js'), '// My work');
    await pack();
    await run(['install'], app);
    expect(
      readFileSync(
        resolve(app, 'node_modules/nudge-refresh-fixture/value.txt'),
        'utf8',
      ),
    ).toBe('first preview');
    writeFileSync(resolve(source, 'value.txt'), 'updated preview');
    await pack();
    await run(['add', '-d', archive], app);
    expect(
      readFileSync(
        resolve(app, 'node_modules/nudge-refresh-fixture/value.txt'),
        'utf8',
      ),
    ).toBe('updated preview');
    expect(readFileSync(resolve(app, 'app.js'), 'utf8')).toBe('// My work');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
