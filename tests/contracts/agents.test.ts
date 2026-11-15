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
import {
  configureAgent,
  detectAgents,
  pickAgent,
} from '../../packages/cli/src/agents';

test('agent discovery reports sanitized versions and explicit authentication states', () => {
  const statuses = detectAgents((provider, args) =>
    args[0] === '--version'
      ? { status: 0, output: 'CLI 1.2.3 secret-value' }
      : {
          status: provider === 'codex' ? 0 : 1,
          output:
            provider === 'codex'
              ? 'Logged in using ChatGPT'
              : '{"loggedIn":false}',
        },
  );
  expect(statuses.map((s) => s.auth)).toEqual([
    'signed-in',
    'login-required',
    'unknown',
  ]);
  expect(JSON.stringify(statuses)).not.toContain('secret-value');
  expect(statuses[0]!.version).toBe('1.2.3');
});

test('missing CLIs, unsupported status and contradictory login responses are not ready', () => {
  expect(
    detectAgents(() => ({ status: null, output: '' })).every(
      (s) => !s.installed,
    ),
  ).toBe(true);
  const statuses = detectAgents((provider, args) => ({
    status: 0,
    output:
      args[0] === '--version'
        ? '1.0.0'
        : provider === 'codex'
          ? 'Not logged in'
          : 'unsupported',
  }));
  expect(statuses.map((s) => s.auth)).toEqual([
    'login-required',
    'unknown',
    'unknown',
  ]);
});

for (const provider of ['codex', 'claude'] as const) {
  test(`${provider} setup preserves unrelated settings, repeats safely and refuses conflicts`, () => {
    const root = mkdtempSync(resolve(tmpdir(), 'nudge-agent-'));
    try {
      mkdirSync(resolve(root, '.codex'));
      const path = resolve(
        root,
        provider === 'codex' ? '.codex/config.toml' : '.mcp.json',
      );
      writeFileSync(
        path,
        provider === 'codex'
          ? 'model = "existing-model"\n'
          : '{"mcpServers":{"other":{"command":"other"}}}',
      );
      configureAgent(root, provider);
      const first = readFileSync(path, 'utf8');
      configureAgent(root, provider);
      expect(readFileSync(path, 'utf8')).toBe(first);
      expect(first).toContain(
        provider === 'codex' ? 'existing-model' : 'other',
      );
      expect(first).not.toContain('NUDGE_MCP_TOKEN');
      if (provider === 'codex')
        expect(Bun.TOML.parse(first)).toHaveProperty('mcp_servers');
      const conflicting = first.replace(
        'NUDGE_PROJECT_ROOT',
        'ANOTHER_SETTING',
      );
      writeFileSync(path, conflicting);
      expect(() => configureAgent(root, provider)).toThrow();
      expect(readFileSync(path, 'utf8')).toBe(conflicting);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('auto-detect prefers a signed-in agent, then any installed one, else none', () => {
  const st = (c: [boolean, 'signed-in' | 'unknown'][]) =>
    (['codex', 'claude', 'opencode'] as const).map((provider, i) => ({
      provider,
      installed: c[i]![0],
      auth: c[i]![1],
      version: null,
      billing: 'unknown' as const,
    }));
  expect(
    pickAgent(
      st([
        [true, 'unknown'],
        [true, 'signed-in'],
        [false, 'unknown'],
      ]),
    ),
  ).toBe('claude');
  expect(
    pickAgent(
      st([
        [false, 'unknown'],
        [false, 'unknown'],
        [true, 'unknown'],
      ]),
    ),
  ).toBe('opencode');
  expect(
    pickAgent(
      st([
        [false, 'unknown'],
        [false, 'unknown'],
        [false, 'unknown'],
      ]),
    ),
  ).toBeUndefined();
});
