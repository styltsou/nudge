import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { detectAgents, checkReadiness } from './readiness';
test('readiness distinguishes subscription sign-in from API credentials without exposing raw auth output', () => {
  const result = detectAgents((provider, args) =>
    args[0] === '--version'
      ? { status: 0, output: '2.1.0' }
      : {
          status: 0,
          output:
            provider === 'codex'
              ? 'Logged in using ChatGPT\nprivate@email.example'
              : '{"loggedIn":true,"authMethod":"api_key","apiKey":"secret"}',
        },
  );
  expect(result[0]!.billing).toBe('subscription');
  expect(result[1]!.billing).toBe('api');
  expect(JSON.stringify(result)).not.toContain('secret');
  expect(JSON.stringify(result)).not.toContain('private@');
});
test('a signed-in CLI is not proof of an installed ACP adapter', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-readiness-'));
  try {
    const result = checkReadiness(root, 'claude', (_provider, args) =>
      args[0] === '--version'
        ? { status: 0, output: '2.1.0' }
        : { status: 0, output: '{"loggedIn":false}' },
    );
    expect(result.auth).toBe('login-required');
    expect(result.billing).toBe('unknown');
    expect(result).not.toHaveProperty('output');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
