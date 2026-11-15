import { resolve } from 'node:path';
import { providers, type Provider } from '../../shared/src/runs';

/** `preserve` leaves any existing agent choice untouched (`--skip-agent`). */
export type AgentChoice = Provider[] | 'auto' | 'preserve';
export type InitArgs = {
  root: string;
  /** The project argument exactly as typed, for the reproducible command. */
  rootArg?: string;
  agents?: AgentChoice;
  mode?: 'managed' | 'external';
  integrate?: boolean;
  packageSource?: string;
  yes: boolean;
};
export type ResolvedInit = {
  rootArg?: string;
  agents: Provider[] | 'preserve';
  mode: 'managed' | 'external';
  integrate: boolean;
  packageSource?: string;
};

const usage =
  'usenudge init [project] [--agent auto|skip|codex,claude,opencode] [--external] [--integrate|--no-integrate] [--package-source path] [--yes]';

function parseAgents(value: string | undefined): AgentChoice {
  if (!value) throw new Error(`--agent needs a value. ${usage}`);
  if (value === 'auto') return 'auto';
  if (value === 'skip') return 'preserve';
  const list = [...new Set(value.split(',').map((v) => v.trim()))].filter(
    Boolean,
  );
  for (const item of list)
    if (!providers.includes(item as Provider))
      throw new Error(
        `Unknown agent "${item}". Choose ${providers.join(', ')}, auto or skip.`,
      );
  return list as Provider[];
}

/** Parses everything after `init`. Every interactive choice has a flag. */
export function parseInitArgs(argv: string[], cwd = process.cwd()): InitArgs {
  const args: InitArgs = { root: cwd, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i]!;
    const [flag, inline] = raw.startsWith('--')
      ? (raw.split(/=(.*)/s, 2) as [string, string | undefined])
      : [raw, undefined];
    const value = () => inline ?? argv[++i];
    switch (flag) {
      case '--agent':
        args.agents = parseAgents(value());
        break;
      case '--skip-agent':
        args.agents = 'preserve';
        break;
      case '--external':
        args.mode = 'external';
        break;
      case '--managed':
        args.mode = 'managed';
        break;
      case '--integrate':
        args.integrate = true;
        break;
      case '--no-integrate':
        args.integrate = false;
        break;
      case '--package-source':
        {
          const source = value();
          if (!source) throw new Error('--package-source needs a path.');
          args.packageSource = source;
        }
        break;
      case '--yes':
      case '-y':
        args.yes = true;
        break;
      default:
        if (flag.startsWith('-') || args.rootArg !== undefined)
          throw new Error(`Unexpected argument "${raw}". ${usage}`);
        args.rootArg = raw;
        args.root = resolve(cwd, raw);
    }
  }
  return args;
}

const quote = (value: string) =>
  /^[\w@%+=:,./\\-]+$/.test(value) ? value : JSON.stringify(value);

/** The single command that reproduces a setup without any prompts. */
export function initCommand(prefix: string, init: ResolvedInit): string {
  const parts = [prefix, 'init'];
  if (init.rootArg) parts.push(quote(init.rootArg));
  parts.push(
    init.agents === 'preserve'
      ? '--skip-agent'
      : `--agent ${init.agents.join(',')}`,
  );
  if (init.agents !== 'preserve' && init.mode === 'external')
    parts.push('--external');
  if (init.integrate) parts.push('--integrate');
  if (init.packageSource)
    parts.push('--package-source', quote(init.packageSource));
  return parts.join(' ');
}
