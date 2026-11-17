import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';
import { installDom } from '../../../tests/helpers/dom';
import { mountNudge } from './index';

let restoreDom: () => void;
beforeAll(() => {
  restoreDom = installDom();
});
afterAll(() => restoreDom());

describe('overlay lifecycle and app isolation', () => {
  const options = {
    enabled: true,
    bridgeUrl: 'http://127.0.0.1:4747',
    token: 'test-browser-token',
  };
  const cleanups: (() => void)[] = [];
  let originalFetch: typeof fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    globalThis.fetch = Object.assign(
      mock((_url: string | URL | Request, init?: RequestInit) => {
        if (String(_url).endsWith('/events'))
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new Error('aborted')),
              { once: true },
            );
          });
        return Promise.resolve(new Response('[]', { status: 200 }));
      }),
      { preconnect: originalFetch.preconnect },
    );
  });
  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    document.body.replaceChildren();
    globalThis.fetch = originalFetch;
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  it('is disabled unless explicitly enabled and replaces duplicate mounts without leaking listeners', () => {
    mountNudge({ ...options, enabled: false });
    expect(document.querySelector('[data-nudge-host]')).toBeNull();
    const first = mountNudge(options);
    const second = mountNudge(options);
    cleanups.push(first.destroy, second.destroy);
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(1);
    first.destroy();
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(1);
    second.destroy();
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(0);
  });
  it('isolates app clicks only during selection and restores clicks on Escape and unmount', () => {
    const control = document.createElement('button');
    const onClick = mock();
    control.addEventListener('click', onClick);
    document.body.append(control);
    const overlay = mountNudge(options);
    cleanups.push(overlay.destroy);
    control.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    const shadow = document.querySelector('[data-nudge-host]')!.shadowRoot!;
    (shadow.querySelector('.toolbar button') as HTMLButtonElement).click();
    control.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(shadow.querySelector('textarea')).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    control.click();
    expect(onClick).toHaveBeenCalledTimes(2);
    overlay.destroy();
    control.click();
    expect(onClick).toHaveBeenCalledTimes(3);
    expect(document.querySelectorAll('[data-nudge-host]')).toHaveLength(0);
  });
  it('preserves application keyboard focus when annotation and panels are off', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const overlay = mountNudge(options);
    cleanups.push(overlay.destroy);
    input.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(document.activeElement).toBe(input);
  });
});
