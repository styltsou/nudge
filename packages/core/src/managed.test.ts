import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { installDom } from '../../../tests/helpers/dom';
import { BridgeClient } from './client';
import { ManagedControls } from './managed';
import type { AgentRun } from '../../shared/src/runs';

let restore: () => void;
beforeAll(() => {
  restore = installDom();
});
afterAll(() => restore());
afterEach(() => document.body.replaceChildren());

function controls() {
  const client = new BridgeClient(
    'http://127.0.0.1:4747',
    'unused',
    new AbortController().signal,
  );
  const managed = new ManagedControls(client, async () => {});
  managed.state.provider = 'codex';
  managed.state.sessions = [
    {
      id: 'first',
      provider: 'codex',
      title: 'Adjust the header',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'busy',
      provider: 'codex',
      title: 'Change the footer',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'other',
      provider: 'claude',
      title: 'Other provider',
      updatedAt: new Date().toISOString(),
    },
  ];
  const run: AgentRun = {
    id: 'run',
    annotationId: 'annotation',
    revisionId: 'revision',
    requestId: 'request',
    sessionId: 'busy',
    sessionMode: 'new',
    status: 'working',
    events: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  managed.state.runs = [run];
  return managed;
}

test('session reuse is explicit, compatible and local to one submission', () => {
  const managed = controls();
  const first = managed.selector();
  document.body.append(first.node);
  const trigger = first.node.querySelector('button')!;
  const select = first.node.querySelector('select')!;
  expect(first.value()).toBeUndefined();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect([...select.options].map((o) => o.value)).toEqual([
    '',
    'first',
    'busy',
  ]);
  expect(select.options[2]!.disabled).toBe(true);
  expect(select.options[2]!.textContent).toContain('Busy');
  trigger.click();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  select.value = 'first';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(first.value()).toBe('first');
  expect(trigger.textContent).toContain('Continue: Adjust the header');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');

  const next = managed.selector();
  document.body.append(next.node);
  expect(next.value()).toBeUndefined();
  expect(next.node.querySelector('button')!.textContent).toContain(
    'New session',
  );
  expect(first.value()).toBe('first');
  trigger.click();
  select.value = '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(first.value()).toBeUndefined();
  expect(trigger.textContent).toContain('New session');
});

test('Escape closes the session chooser without escaping the composer or losing the choice', () => {
  const picker = controls().selector();
  document.body.append(picker.node);
  const trigger = picker.node.querySelector('button')!;
  const select = picker.node.querySelector('select')!;
  trigger.click();
  select.focus();
  const escaped: string[] = [];
  const listener = () => escaped.push('document');
  document.addEventListener('keydown', listener);
  try {
    select.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(escaped).toEqual([]);
    expect(picker.value()).toBeUndefined();
  } finally {
    document.removeEventListener('keydown', listener);
  }
});
