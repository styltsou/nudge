import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createMcpServer } from './server';

let token = process.env.NUDGE_MCP_TOKEN;
if (!token) {
  const root = process.env.NUDGE_PROJECT_ROOT;
  if (!root)
    throw new Error(
      'Set NUDGE_PROJECT_ROOT or NUDGE_MCP_TOKEN. Start the bridge before MCP.',
    );
  try {
    const saved = JSON.parse(
      readFileSync(
        resolve(
          root,
          process.env.NUDGE_STATE_DIR ?? '.nudge',
          'credentials.json',
        ),
        'utf8',
      ),
    ) as { mcpToken: string };
    token = saved.mcpToken;
  } catch {
    throw new Error(
      'Unable to load local MCP credentials. Start bun run dev in the configured project.',
    );
  }
}
if (!token || !/^[a-f0-9]{64}$/.test(token))
  throw new Error('Invalid local MCP credential');
const config = {
  url: process.env.NUDGE_BRIDGE_URL ?? 'http://127.0.0.1:4747',
  token,
};
const handle = serveStdio(() => createMcpServer(config));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void handle.close();
  });
