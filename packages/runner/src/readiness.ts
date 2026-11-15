import { spawnSync } from 'node:child_process';
import {
  providers,
  type Provider,
  type Readiness,
} from '../../shared/src/runs';
import { resolveAdapter } from './adapters';
export type Probe = (
  provider: Provider,
  args: string[],
) => { status: number | null; output: string };
export type AgentStatus = {
  provider: Provider;
  installed: boolean;
  version: string | null;
  auth: 'signed-in' | 'login-required' | 'unknown';
  billing: 'subscription' | 'api' | 'unknown';
};
export function nativeProbe(root = process.cwd()): Probe {
  return (provider, args) => {
    const executable =
      Bun.which(process.platform === 'win32' ? provider + '.exe' : provider) ??
      Bun.which(provider);
    if (!executable) return { status: null, output: '' };
    try {
      const result = spawnSync(executable, args, {
        cwd: root,
        encoding: 'utf8',
        timeout: 3000,
        maxBuffer: 65536,
        windowsHide: true,
      });
      return {
        status: result.status,
        output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`,
      };
    } catch {
      return { status: null, output: '' };
    }
  };
}
export function detectAgents(probe: Probe = nativeProbe()): AgentStatus[] {
  return providers.map((provider) => {
    const version = probe(provider, ['--version']);
    const result: AgentStatus = {
      provider,
      installed: version.status !== null,
      version:
        version.status === 0
          ? (version.output.match(/\b\d+\.\d+\.\d+(?:-[\w.]+)?\b/)?.[0] ?? null)
          : null,
      auth: 'unknown',
      billing: 'unknown',
    };
    if (version.status !== 0 || provider === 'opencode') return result;
    const auth = probe(
      provider,
      provider === 'codex' ? ['login', 'status'] : ['auth', 'status'],
    );
    if (provider === 'codex') {
      if (/not logged in/i.test(auth.output)) result.auth = 'login-required';
      else if (auth.status === 0 && /logged in/i.test(auth.output)) {
        result.auth = 'signed-in';
        result.billing = /chatgpt/i.test(auth.output)
          ? 'subscription'
          : /api key/i.test(auth.output)
            ? 'api'
            : 'unknown';
      }
    } else {
      try {
        const data = JSON.parse(auth.output);
        result.auth =
          data.loggedIn === false
            ? 'login-required'
            : auth.status === 0 && data.loggedIn === true
              ? 'signed-in'
              : 'unknown';
        if (result.auth === 'signed-in')
          result.billing =
            data.authMethod === 'claude.ai'
              ? 'subscription'
              : ['api_key', 'api_key_helper', 'third_party'].includes(
                    data.authMethod,
                  )
                ? 'api'
                : 'unknown';
      } catch {
        /* Unsupported CLI status stays unknown; never relay raw output. */
      }
    }
    return result;
  });
}
export function checkReadiness(
  root: string,
  provider: Provider,
  probe = nativeProbe(root),
): Readiness {
  let adapter: Readiness['adapter'] = 'missing';
  try {
    adapter = resolveAdapter(root, provider) ? 'available' : 'missing';
  } catch {
    adapter = 'invalid';
  }
  // Probe only the selected provider; do not delay heartbeats checking unrelated agents.
  const status = detectAgents((p, args) =>
    p === provider ? probe(p, args) : { status: null, output: '' },
  ).find((s) => s.provider === provider)!;
  return {
    provider,
    adapter,
    auth: status.auth,
    billing: status.billing,
    checkedAt: new Date().toISOString(),
  };
}
