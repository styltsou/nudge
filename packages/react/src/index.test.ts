import { test, expect } from 'bun:test';
import { StrictMode, createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { installDom } from '../../../tests/helpers/dom';
import { Nudge } from './index';

test('React StrictMode mounts one overlay and cleans it up; disabled mounts nothing', async () => {
  const restore = installDom();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const originalFetch = globalThis.fetch;
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const originalAct = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = Object.assign(
    (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).endsWith('/events'))
        return new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          ),
        );
      return Promise.resolve(
        new Response(
          JSON.stringify(
            String(input).endsWith('/managed')
              ? { enabled: false, online: false, runs: [], sessions: [] }
              : [],
          ),
        ),
      );
    },
    { preconnect: originalFetch.preconnect },
  );
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = (enabled: boolean) =>
    createElement(
      StrictMode,
      null,
      createElement(Nudge, {
        enabled,
        bridgeUrl: 'http://127.0.0.1:4747',
        token: 'fixture',
      }),
    );
  try {
    await act(async () => root.render(render(false)));
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(0);
    await act(async () => root.render(render(true)));
    // The wrapper deliberately loads core after commit; await that module rather
    // than a timer inside the render batch (before effects have run).
    await act(async () => {
      await import('@usenudge/core');
    });
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(1);
    await act(async () => root.render(render(false)));
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    if (originalAct === undefined) delete globals.IS_REACT_ACT_ENVIRONMENT;
    else globals.IS_REACT_ACT_ENVIRONMENT = originalAct;
    await new Promise((resolve) => setTimeout(resolve, 10));
    restore();
  }
});
