export type RpcMessage = {
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: unknown;
};
/** Bounded JSONL over Bun's native pipes; raw provider output stays private. */
export class JsonRpcProcess {
  private child: Bun.Subprocess<'pipe', 'pipe', 'ignore'>;
  private pending = new Map<
    number,
    {
      resolve(value: Record<string, unknown>): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private next = 0;
  private chain = Promise.resolve();
  private closed = false;
  constructor(
    executable: string,
    args: string[],
    root: string,
    onMessage: (message: RpcMessage) => Promise<void>,
    private onFailure: () => void,
  ) {
    this.child = Bun.spawn([executable, ...args], {
      cwd: root,
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'ignore',
      windowsHide: true,
    });
    void this.child.exited.then(() => {
      setTimeout(() => this.close(), 0);
    });
    void this.read(onMessage).catch(() => this.close());
  }
  private async read(onMessage: (message: RpcMessage) => Promise<void>) {
    const reader = this.child.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (!this.closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.length > 2 * 1024 * 1024)
          throw new Error('Provider frame too large');
        let boundary: number;
        while ((boundary = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 1);
          if (!line.trim()) continue;
          const message = JSON.parse(line) as RpcMessage;
          const pending =
            typeof message.id === 'number' && !message.method
              ? this.pending.get(message.id)
              : undefined;
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(message.id as number);
            if (message.error)
              pending.reject(new Error('Provider protocol request failed'));
            else pending.resolve(message.result ?? {});
          } else
            this.chain = this.chain
              .then(() => onMessage(message))
              .catch(() => this.close());
        }
      }
      await this.chain;
    } finally {
      reader.releaseLock();
      this.close();
    }
  }
  send(message: RpcMessage) {
    if (!this.closed) {
      this.child.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n',
      );
      this.child.stdin.flush();
    }
  }
  rpc(method: string, params: Record<string, unknown>, timeout = 30000) {
    if (this.closed) return Promise.reject(new Error('Provider disconnected'));
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Provider request timed out'));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.send({ id, method, params });
    });
  }
  drain() {
    return this.chain;
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('Provider disconnected'));
    }
    this.pending.clear();
    this.child.stdin.end();
    this.child.kill();
    this.onFailure();
  }
  async stop() {
    this.close();
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      this.child.exited,
      new Promise<void>((r) => {
        timer = setTimeout(() => {
          this.child.kill('SIGKILL');
          r();
        }, 3000);
      }),
    ]);
    clearTimeout(timer);
  }
}
