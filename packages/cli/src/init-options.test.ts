import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { initCommand, parseInitArgs } from './init-options';

const cwd = resolve('/work/app');

test('every interactive choice has a flag', () => {
  expect(
    parseInitArgs(
      [
        '../other',
        '--agent',
        'claude,codex',
        '--external',
        '--integrate',
        '-y',
      ],
      cwd,
    ),
  ).toEqual({
    root: resolve(cwd, '../other'),
    rootArg: '../other',
    agents: ['claude', 'codex'],
    mode: 'external',
    integrate: true,
    yes: true,
  });
  expect(parseInitArgs(['--agent=auto', '--no-integrate'], cwd)).toMatchObject({
    agents: 'auto',
    integrate: false,
  });
  expect(parseInitArgs(['--skip-agent'], cwd).agents).toBe('preserve');
  expect(parseInitArgs(['--agent', 'skip'], cwd).agents).toBe('preserve');
  // Unset choices stay undefined so the interactive flow knows what to ask.
  expect(parseInitArgs([], cwd)).toEqual({ root: cwd, yes: false });
});

test('rejects unknown agents, flags and extra positionals', () => {
  expect(() => parseInitArgs(['--agent', 'gpt'], cwd)).toThrow('Unknown agent');
  expect(() => parseInitArgs(['--agent'], cwd)).toThrow('needs a value');
  expect(() => parseInitArgs(['--force'], cwd)).toThrow('Unexpected');
  expect(() => parseInitArgs(['a', 'b'], cwd)).toThrow('Unexpected');
});

test('prints one deterministic command that reproduces the setup', () => {
  expect(
    initCommand('bunx --bun usenudge', {
      agents: ['claude', 'codex'],
      mode: 'managed',
      integrate: false,
    }),
  ).toBe('bunx --bun usenudge init --agent claude,codex');
  expect(
    initCommand('bunx --bun usenudge', {
      rootArg: 'my app',
      agents: ['codex'],
      mode: 'external',
      integrate: true,
    }),
  ).toBe(
    'bunx --bun usenudge init "my app" --agent codex --external --integrate',
  );
  expect(
    initCommand('bunx --bun usenudge', {
      agents: 'preserve',
      mode: 'external',
      integrate: false,
    }),
  ).toBe('bunx --bun usenudge init --skip-agent');
  // Parsing the printed command gives back the same choices.
  const printed = initCommand('x', {
    agents: ['opencode', 'claude'],
    mode: 'managed',
    integrate: true,
  });
  expect(parseInitArgs(printed.split(' ').slice(2), cwd)).toMatchObject({
    agents: ['opencode', 'claude'],
    integrate: true,
  });
});
