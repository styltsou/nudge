import { test, expect } from 'bun:test';
import { createServer } from 'node:net';
import { findFreePort } from './port';

test('skips a port already taken on IPv4 loopback', async () => {
  const start = await findFreePort(41000 + Math.floor(Math.random() * 1000));
  const blocker = createServer();
  await new Promise<void>((r) => blocker.listen(start, '127.0.0.1', r));
  try {
    expect(await findFreePort(start)).toBeGreaterThan(start);
  } finally {
    await new Promise((r) => blocker.close(r));
  }
});
