import { loadConfig } from '@usenudge/bridge/config';
import {
  lstatSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { initProject } from './init';
import { guideAgent, detectAgents } from './agents';
import { projectMcpFile } from './runtime';
import { version } from '../../shared/src/release';
import { prepareLocalProject } from './local';

try {
  const command = process.argv[2] ?? 'help';
  if (['--version', '-v', 'version'].includes(command)) console.log(version);
  else if (
    ['help', '--help', '-h'].includes(command) ||
    process.argv.includes('--help')
  )
    console.log(`Nudge ${version} — request UI changes and review them in your browser.

  usenudge init [project]                  Configure local Nudge state for a Vite app
    --agent codex|claude|opencode          Choose an agent (managed ACP by default)
    --external                            Connect an external MCP host instead
    --skip-agent                          Configure the overlay; preserve agent settings
    --package-source /path/usenudge.tgz    Use an unpublished local archive
    --integrate                           Opt in to changing the app's dev script/config
  usenudge dev [--project path] [--port N] Start the app with Nudge; no source/config edits
  usenudge agents --agent codex --managed  Configure browser-launched agent runs
  usenudge agents --status                 Inspect native CLI sign-in hints
  usenudge doctor [project]                Check the running local bridge
  usenudge clean --confirm                 Delete this project's .nudge state
  usenudge --version                       Print the installed preview version

After local setup, run usenudge dev and open Agent setup in Nudge.
Agents keep their own authentication and billing. Native subscription login
and API-key billing are different choices. Stop does not undo existing edits.`);
  else if (command === 'init') {
    const root = resolve(
      process.argv[3]?.startsWith('--')
        ? process.cwd()
        : (process.argv[3] ?? process.cwd()),
    );
    const sourceIndex = process.argv.indexOf('--package-source');
    if (process.argv.includes('--integrate'))
      initProject(
        root,
        sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined,
      );
    else {
      prepareLocalProject(root);
      if (
        process.argv.includes('--external') &&
        !existsSync(projectMcpFile(root))
      )
        throw new Error(
          'Install usenudge as an app dev dependency before configuring external MCP, so its executable path stays available.',
        );
      console.log(
        'Local Nudge setup ready. Start bunx --bun usenudge dev. App source, config and scripts were not changed.',
      );
    }
    const agentIndex = process.argv.indexOf('--agent');
    if (!process.argv.includes('--skip-agent'))
      await guideAgent(
        root,
        agentIndex >= 0 ? process.argv[agentIndex + 1] : undefined,
        !process.argv.includes('--external'),
      );
  } else if (command === 'dev') {
    const rootIndex = process.argv.indexOf('--project');
    const portIndex = process.argv.indexOf('--port');
    const port =
      portIndex >= 0 ? Number(process.argv[portIndex + 1]) : undefined;
    if (
      port !== undefined &&
      (!Number.isInteger(port) || port < 1 || port > 65535)
    )
      throw new Error('Choose a --port between 1 and 65535.');
    const { startDev } = await import('./dev');
    await startDev(
      resolve(
        rootIndex >= 0
          ? (process.argv[rootIndex + 1] ?? process.cwd())
          : process.cwd(),
      ),
      port,
    );
  } else if (command === 'agents') {
    const agentIndex = process.argv.indexOf('--agent');
    const rootIndex = process.argv.indexOf('--project');
    if (process.argv.includes('--status'))
      console.log(JSON.stringify(detectAgents(), null, 2));
    else
      await guideAgent(
        resolve(
          rootIndex >= 0
            ? (process.argv[rootIndex + 1] ?? process.cwd())
            : process.cwd(),
        ),
        agentIndex >= 0 ? process.argv[agentIndex + 1] : undefined,
        process.argv.includes('--managed'),
      );
  } else if (command === 'clean') {
    if (!process.argv.includes('--confirm'))
      throw new Error(
        'Stop Nudge first. This deletes local annotations, credentials and snapshots. Run usenudge clean --confirm to proceed.',
      );
    if (process.env.NUDGE_STATE_DIR)
      throw new Error('Custom state directory configured; clean it manually.');
    const root = resolve(process.cwd());
    const target = resolve(root, '.nudge');
    if (target !== `${root}${process.platform === 'win32' ? '\\' : '/'}.nudge`)
      throw new Error('Invalid local state directory');
    try {
      if (lstatSync(target).isSymbolicLink())
        throw new Error('Refusing to remove linked state directory');
      rmSync(target, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    console.log(
      'Local Nudge state removed. The next dev session will provision new credentials.',
    );
  } else if (command === 'setup') {
    const root = resolve(process.cwd());
    const config = loadConfig(root);
    const mcpPath = projectMcpFile(root);
    const bunPath = process.execPath;
    const configPath = resolve(root, '.mcp.json');
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(await Bun.file(configPath).text()) as Record<
        string,
        unknown
      >;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new Error(
          'Existing .mcp.json is invalid JSON; fix it before running setup.',
        );
    }
    const servers =
      typeof existing.mcpServers === 'object' && existing.mcpServers !== null
        ? (existing.mcpServers as Record<string, unknown>)
        : {};
    const server = {
      command: bunPath,
      args: [mcpPath],
      env: {
        NUDGE_PROJECT_ROOT: root,
        NUDGE_BRIDGE_URL: `http://127.0.0.1:${config.port}`,
      },
    };
    mkdirSync(root, { recursive: true });
    writeFileSync(
      configPath,
      `${JSON.stringify({ ...existing, mcpServers: { ...servers, usenudge: server } }, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(
      'Nudge project setup complete: .nudge credentials are ready and .mcp.json registers the local MCP server.',
    );
    console.log(
      'Next: bun run dev. Restart your coding agent to load its project MCP configuration.',
    );
  } else if (command === 'doctor') {
    try {
      const config = loadConfig(resolve(process.argv[3] ?? process.cwd()));
      let url = `http://127.0.0.1:${config.port}`;
      try {
        url = JSON.parse(
          readFileSync(resolve(config.stateDir, 'connection.json'), 'utf8'),
        ).bridgeUrl;
      } catch {
        /* Legacy fixed-port setup. */
      }
      const destination = new URL(url);
      if (
        destination.protocol !== 'http:' ||
        destination.hostname !== '127.0.0.1' ||
        destination.username ||
        destination.password
      )
        throw new Error('Invalid local bridge URL');
      const health = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await fetch(`${url}/api/v1/annotations`, {
        headers: { Authorization: `Bearer ${config.mcpToken}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!health.ok || !data.ok) throw new Error();
      console.log(
        'Nudge healthy: bridge reachable; MCP auth and SQLite reads working.',
      );
    } catch {
      console.error(
        'Nudge health check failed. Start bun run dev from the same project and check local credentials/configuration.',
      );
      process.exitCode = 1;
    }
  } else
    throw new Error(
      'Usage: usenudge init [project] [--agent codex|claude|opencode|skip] [--external|--skip-agent] | agents [--status] [--agent codex|claude|opencode] [--managed] [--project path] | doctor [project] | clean --confirm',
    );
} catch (error) {
  console.error(
    `Nudge setup: ${error instanceof Error ? error.message : 'Unable to finish. Check setup and retry.'}`,
  );
  process.exitCode = 1;
}
