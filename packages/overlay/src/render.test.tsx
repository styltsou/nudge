import { afterEach, expect, test } from 'bun:test';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Annotation } from '@usenudge/shared';
import type { AgentRun } from '../../shared/src/runs';
import { renderView, disposeViews } from './render';
import { ManagedRun, type ManagedProps } from './managed';

afterEach(async () => {
  disposeViews(document.body);
  await Promise.resolve();
  document.body.replaceChildren();
});

test('view updates retain local state; disposal releases effects before remount', async () => {
  let mounted = 0;
  let cleaned = 0;
  function View({ title }: { title: string }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
      mounted++;
      return () => {
        cleaned++;
      };
    }, []);
    return (
      <button onClick={() => setCount(count + 1)}>
        {title}: {count}
      </button>
    );
  }
  const host = document.createElement('div');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const node = document.createElement('div');
  shadow.append(node);
  renderView(node, <View title="First" />);
  flushSync(() => node.querySelector('button')!.click());
  renderView(node, <View title="Updated" />);
  expect(node.textContent).toBe('Updated: 1');
  expect(mounted).toBe(1);
  disposeViews(shadow);
  await Promise.resolve();
  expect(cleaned).toBe(1);
  renderView(node, <View title="Fresh" />);
  expect(node.textContent).toBe('Fresh: 0');
  disposeViews(shadow);
  await Promise.resolve();
  expect(cleaned).toBe(2);
});

test('managed dispatch keeps its idempotency key on failure and resets it after a terminal run', async () => {
  const now = new Date().toISOString();
  const annotation: Annotation = {
    id: 'annotation',
    projectId: 'project',
    status: 'queued',
    version: 1,
    createdAt: now,
    updatedAt: now,
    anchor: {
      pageUrl: 'http://localhost:5173/',
      pathname: '/',
      selector: '#button',
      tagName: 'BUTTON',
      rect: { x: 0, y: 0, width: 100, height: 40 },
      viewport: { width: 800, height: 600 },
    },
    revisions: [
      {
        id: 'revision',
        annotationId: 'annotation',
        ordinal: 1,
        comment: 'Change button',
        createdAt: now,
      },
    ],
  };
  const ids: string[] = [];
  const props: ManagedProps = {
    annotation,
    state: { enabled: true, online: true, runs: [], sessions: [] },
    canRun: true,
    hint: '',
    request: async () => {},
    refresh: async () => {},
    dispatch: async (_, id) => {
      ids.push(id);
      throw new Error('Dispatch uncertain');
    },
  };
  const node = document.createElement('div');
  document.body.append(node);
  const paint = () => renderView(node, <ManagedRun {...props} />);
  const click = async () => {
    flushSync(() =>
      node
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Run agent"],button[aria-label="Retry agent"]',
        )!
        .click(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  paint();
  await click();
  paint();
  await click();
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  const run: AgentRun = {
    id: 'run',
    annotationId: annotation.id,
    revisionId: 'revision',
    requestId: ids[0]!,
    sessionId: 'session',
    sessionMode: 'new',
    status: 'working',
    events: [],
    createdAt: now,
    updatedAt: now,
  };
  props.state = { ...props.state, runs: [run] };
  paint();
  props.state = { ...props.state, runs: [{ ...run, status: 'failed' }] };
  paint();
  await click();
  expect(ids).toHaveLength(3);
  expect(ids[2]).not.toBe(ids[0]);
  expect(node.textContent).toContain('New session');
});
