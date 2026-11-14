import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../../packages/bridge/src/config.ts';

test('credentials are durable, independent and server-owned', () => {
  mkdirSync('.nudge', { recursive: true });
  const root = mkdtempSync(resolve('.nudge/config-test-'));
  try {
    const first = loadConfig(root);
    const second = loadConfig(root);
    assert.deepEqual(first, second);
    assert.match(first.browserToken, /^[a-f0-9]{64}$/);
    assert.match(first.mcpToken, /^[a-f0-9]{64}$/);
    assert.notEqual(first.browserToken, first.mcpToken);
    assert.equal(first.stateDir, resolve(root, '.nudge'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('corrupt credentials fail closed rather than silently losing authority', () => {
  mkdirSync('.nudge', { recursive: true });
  const root = mkdtempSync(resolve('.nudge/config-test-'));
  try {
    const config = loadConfig(root);
    const file = resolve(config.stateDir, 'credentials.json');
    const saved = JSON.parse(readFileSync(file, 'utf8')) as Record<
      string,
      string
    >;
    saved.mcpToken = saved.browserToken!;
    writeFileSync(file, JSON.stringify(saved));
    assert.throws(() => loadConfig(root), /Invalid Nudge credential/);
    writeFileSync(file, 'broken-json');
    assert.throws(() => loadConfig(root), /Unable to read/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
