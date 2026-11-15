import { createServer } from 'node:net';

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
/**
 * First port from `start` free on both loopback families. Checking only one lets a
 * server on 127.0.0.1 and Vite on ::1 share a number, so localhost opens the wrong app.
 */
export async function findFreePort(start: number, attempts = 50) {
  for (let port = start; port < start + attempts && port <= 65535; port++)
    if ((await canListen(port, '127.0.0.1')) && (await canListen(port, '::1')))
      return port;
  throw new Error(
    `No free port found between ${start} and ${start + attempts - 1}. Pass --port.`,
  );
}
