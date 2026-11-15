import { connect, createServer } from 'node:net';

function canListen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', (error: NodeJS.ErrnoException) =>
      // No IPv6 stack (or address) means nothing else can hold it there either.
      resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT'),
    );
    server.listen({ port, host, exclusive: true }, () =>
      server.close(() => resolve(true)),
    );
  });
}
/** True when something accepts connections on host:port. */
export function answers(
  port: number,
  host: string,
  timeoutMs = 300,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}
/**
 * A port is free only if both loopback families can bind it and nothing
 * answers there. The connect check catches servers bound to all interfaces
 * (0.0.0.0 / ::, e.g. `vite --host`): Windows still lets a later program bind
 * 127.0.0.1 on that port and take over localhost. Probing by listening on all
 * interfaces instead would trigger a Windows Firewall prompt.
 */
async function isFree(port: number) {
  const [v4, v6] = await Promise.all([
    canListen(port, '127.0.0.1'),
    canListen(port, '::1'),
  ]);
  if (!v4 || !v6) return false;
  const [a4, a6] = await Promise.all([
    answers(port, '127.0.0.1'),
    answers(port, '::1'),
  ]);
  return !a4 && !a6;
}
/** First free port from `start`, so Nudge never shares one with another app. */
export async function findFreePort(start: number, attempts = 50) {
  for (let port = start; port < start + attempts && port <= 65535; port++)
    if (await isFree(port)) return port;
  throw new Error(
    `No free port found between ${start} and ${start + attempts - 1}. Pass --port.`,
  );
}
