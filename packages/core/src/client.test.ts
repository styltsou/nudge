import { afterEach, describe, expect, it, mock } from 'bun:test';
import { BridgeClient } from './client';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
describe('local bridge client', () => {
  it('keeps credentials in headers and reports errors without exposing credentials', async () => {
    const lifetime = new AbortController();
    const secret = 'local-credential-must-not-appear';
    const fetchMock = mock(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        new Response('{}', { status: 403 }),
    );
    globalThis.fetch = Object.assign(fetchMock, {
      preconnect: originalFetch.preconnect,
    });
    const client = new BridgeClient(
      'http://127.0.0.1:4747',
      secret,
      lifetime.signal,
    );
    await expect(client.request('/annotations')).rejects.toThrow(
      'Bridge unauthorized',
    );
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain(secret);
    expect(options!.headers).toEqual({ Authorization: `Bearer ${secret}` });
    globalThis.fetch = Object.assign(
      mock(async () => {
        throw new Error(secret);
      }),
      { preconnect: originalFetch.preconnect },
    );
    try {
      await client.request('/annotations');
      throw new Error('Expected failure');
    } catch (error) {
      expect((error as Error).message).toContain('Bridge unreachable');
      expect((error as Error).message).not.toContain(secret);
    }
    lifetime.abort();
  });
  it('reconciles event hints and refetches current truth after reconnecting', async () => {
    const lifetime = new AbortController();
    let connections = 0;
    let reconciliations = 0;
    const states: boolean[] = [];
    globalThis.fetch = Object.assign(
      mock(async () => {
        connections++;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  'event: annotation.updated\ndata: {}\n\n',
                ),
              );
              controller.close();
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }),
      { preconnect: originalFetch.preconnect },
    );
    const client = new BridgeClient(
      'http://127.0.0.1:4747',
      'test-capability',
      lifetime.signal,
    );
    await client.events(
      async () => {
        reconciliations++;
        if (connections === 2) lifetime.abort();
      },
      (connected) => states.push(connected),
    );
    expect(connections).toBe(2);
    expect(reconciliations).toBe(3);
    expect(states).toEqual([true, false, true, false]);
  });
  it('refuses remote bridge destinations and credential-bearing URLs', () => {
    const signal = new AbortController().signal;
    for (const url of [
      'https://example.com',
      'http://user:secret@localhost:4747',
      'http://localhost:4747?token=secret',
    ])
      expect(() => new BridgeClient(url, 'token', signal)).toThrow();
  });
});
