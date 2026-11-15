import { createInterface } from 'node:readline';
import { writeSync } from 'node:fs';
const send = (value: unknown) => writeSync(1, JSON.stringify(value) + '\n');
let session = crypto.randomUUID();
let prompt: number;
createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line);
  if (m.method === 'initialize')
    send({
      id: m.id,
      result: { protocolVersion: 1, agentCapabilities: { loadSession: true } },
    });
  if (m.method === 'session/new' || m.method === 'session/load') {
    session = m.params.sessionId ?? session;
    send({ id: m.id, result: { sessionId: session } });
  }
  if (m.method === 'session/prompt') {
    if (process.argv.includes('--exit')) process.exit(1);
    prompt = m.id;
    send({
      method: 'session/update',
      params: {
        sessionId: session,
        update: { sessionUpdate: 'tool_call', kind: 'execute' },
      },
    });
    send({
      id: 'approve',
      method: 'session/request_permission',
      params: {
        sessionId: session,
        toolCall: { title: 'Fixture command', rawInput: { command: 'test' } },
        options: [
          { optionId: 'once', kind: 'allow_once' },
          { optionId: 'reject', kind: 'reject_once' },
        ],
      },
    });
  }
  if (m.id === 'approve' && m.result)
    send({
      id: 'question',
      method: 'elicitation/create',
      params: {
        sessionId: session,
        mode: 'form',
        message: 'Choose color',
        requestedSchema: {
          type: 'object',
          properties: { color: { type: 'string', title: 'Which color?' } },
          required: ['color'],
        },
      },
    });
  if (m.id === 'question' && m.result) {
    send({
      method: 'session/update',
      params: {
        sessionId: session,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: {
            type: 'text',
            text: process.argv.includes('--bad-report')
              ? 'No report'
              : JSON.stringify({
                  summary: 'Fixture implementation report',
                  changedFiles: ['app.ts'],
                }),
          },
        },
      },
    });
    send({ id: prompt, result: { stopReason: 'end_turn' } });
  }
  if (m.method === 'session/cancel') process.exit(0);
});
