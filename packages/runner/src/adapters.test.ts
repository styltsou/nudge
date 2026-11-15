import { test, expect } from 'bun:test';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { resolveAdapter, adapterPackages, adapterDirectory } from './adapters';
for (const provider of ['codex', 'claude'] as const)
  test(`${provider} resolves its isolated ACP runtime without modifying app dependencies`, () => {
    const root = mkdtempSync(resolve(tmpdir(), 'nudge-acp-'));
    try {
      writeFileSync(resolve(root, 'package.json'), '{"name":"app"}');
      expect(resolveAdapter(root, provider, () => null)).toBeNull();
      const spec = adapterPackages[provider];
      const directory = resolve(
        adapterDirectory(root, provider),
        'node_modules',
        spec.name,
      );
      mkdirSync(resolve(directory, 'dist'), { recursive: true });
      writeFileSync(resolve(directory, 'dist/index.js'), '');
      const pkg = {
        name: spec.name,
        version: spec.version,
        bin: { [spec.bin]: 'dist/index.js' },
      };
      writeFileSync(resolve(directory, 'package.json'), JSON.stringify(pkg));
      expect(resolveAdapter(root, provider, () => null)?.args).toEqual([
        resolve(directory, 'dist/index.js'),
      ]);
      expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(
        '{"name":"app"}',
      );
      pkg.bin[spec.bin] = '../outside.js';
      writeFileSync(resolve(directory, 'package.json'), JSON.stringify(pkg));
      expect(() => resolveAdapter(root, provider, () => null)).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
