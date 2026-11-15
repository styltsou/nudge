import { annotationSchema } from '@usenudge/shared';
import type { Annotation, SnapshotUpload } from '@usenudge/shared';

export class BridgeClient {
  readonly url: string;
  constructor(
    url: string,
    private token: string,
    private lifetime: AbortSignal,
  ) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== '/'
    )
      throw new Error('Configure a local HTTP bridge URL');
    this.url = parsed.origin;
  }
  async request(path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/api/v1${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.any([this.lifetime, AbortSignal.timeout(5000)]),
        credentials: 'omit',
        redirect: 'error',
      });
    } catch {
      throw new Error(
        'Bridge unreachable. Start bun run dev, then retry. Your comment is still here.',
      );
    }
    if (!response.ok) {
      if (response.status === 409) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { code?: string; message?: string };
        } | null;
        if (
          ['RUN_CONFLICT', 'MANAGED_RUN_ACTIVE'].includes(
            payload?.error?.code ?? '',
          ) &&
          payload?.error?.message
        )
          throw new Error(payload.error.message);
      }
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'Bridge unauthorized. Check the trusted dev origin and local browser credentials.'
          : response.status === 409
            ? 'Annotation changed. Refresh the tray and retry.'
            : 'Bridge could not save this request. Retry shortly.',
      );
    }
    return response.json();
  }
  async list(): Promise<Annotation[]> {
    return annotationSchema.array().parse(await this.request('/annotations'));
  }
  async mutate(path: string, body: unknown): Promise<Annotation> {
    return annotationSchema.parse(await this.request(path, body));
  }
  async upload(id: string, input: SnapshotUpload): Promise<Annotation> {
    return this.mutate(`/annotations/${id}/snapshots`, input);
  }
  async snapshot(id: string): Promise<Blob> {
    const response = await fetch(
      `${this.url}/api/v1/snapshots/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        signal: AbortSignal.any([this.lifetime, AbortSignal.timeout(5000)]),
        credentials: 'omit',
        redirect: 'error',
      },
    );
    if (!response.ok || response.headers.get('content-type') !== 'image/png')
      throw new Error('Comparison unavailable: snapshot could not be loaded.');
    return response.blob();
  }
  async events(
    reconcile: () => Promise<void>,
    connected: (value: boolean) => void,
  ): Promise<void> {
    let backoff = 500;
    while (!this.lifetime.aborted) {
      try {
        const response = await fetch(`${this.url}/api/v1/events`, {
          headers: { Authorization: `Bearer ${this.token}` },
          signal: this.lifetime,
          credentials: 'omit',
          redirect: 'error',
        });
        if (!response.ok || !response.body) throw new Error();
        connected(true);
        await reconcile();
        backoff = 500;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (!this.lifetime.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let boundary: number;
            while ((boundary = buffer.indexOf('\n\n')) >= 0) {
              const event = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              if (event.startsWith('event: annotation.')) await reconcile();
            }
            if (buffer.length > 16384) throw new Error();
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      } catch {
        /* Connection errors are shown without exposing request headers or tokens. */
      }
      connected(false);
      if (this.lifetime.aborted) return;
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          this.lifetime.removeEventListener('abort', finish);
          resolve();
        };
        const timer = setTimeout(finish, backoff);
        this.lifetime.addEventListener('abort', finish, { once: true });
      });
      backoff = Math.min(backoff * 2, 10000);
    }
  }
}
