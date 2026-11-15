// Deterministic ACP fixture for the installed-package test, never shipped to users.
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
if (!manifest.private || !manifest.devDependencies?.usenudge)
  throw new Error('Expected an isolated test app');
const sessionId = crypto.randomUUID();
const send = (message: Record<string, unknown>) =>
  writeSync(1, JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize')
    send({
      id: message.id,
      result: { protocolVersion: 1, agentCapabilities: {} },
    });
  if (message.method === 'session/new')
    send({ id: message.id, result: { sessionId } });
  if (message.method === 'session/prompt') {
    const file = resolve('styles.css');
    const css = readFileSync(file, 'utf8');
    if (!css.includes('padding:6px 10px'))
      throw new Error('Expected the test app button');
    writeFileSync(
      file,
      css
        .replace('padding:6px 10px', 'padding:12px 20px')
        .replace('background:#333', 'background:#e05246'),
    );
    send({
      method: 'session/update',
      params: {
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: {
            type: 'text',
            text: JSON.stringify({
              summary: 'Increased button padding and applied a coral accent.',
              changedFiles: ['styles.css'],
            }),
          },
        },
      },
    });
    send({ id: message.id, result: { stopReason: 'end_turn' } });
  }
});
