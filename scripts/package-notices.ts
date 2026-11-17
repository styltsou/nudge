import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

/** Collect packages actually loaded by the bundler, including transitive code. */
export function packageNotices() {
  const packages = new Map<string, { root: string; license: string }>();
  const visited = new Set<string>();
  return {
    plugin: {
      name: 'bundled-license-notices',
      setup(build: Bun.PluginBuilder) {
        build.onLoad({ filter: /./ }, ({ path }) => {
          if (!path.replaceAll('\\', '/').includes('/node_modules/')) return;
          let dir = dirname(path);
          while (!visited.has(dir)) {
            visited.add(dir);
            const manifest = resolve(dir, 'package.json');
            if (existsSync(manifest)) {
              const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
              if (pkg.name && pkg.version) {
                packages.set(`${pkg.name}@${pkg.version}`, {
                  root: dir,
                  license: pkg.license ?? 'UNKNOWN',
                });
                break;
              }
            }
            const parent = dirname(dir);
            if (parent === dir || !dir.includes(sep + 'node_modules')) break;
            dir = parent;
          }
          return undefined;
        });
      },
    } satisfies Bun.BunPlugin,
    render() {
      return (
        '# Bundled third-party notices\n\nGenerated from dependencies loaded by the release bundler. These notices apply to their respective packages, independently of Nudge’s MIT license.\n\n' +
        '## shadcn/ui source components\n\nSource: https://github.com/shadcn-ui/ui\n\n' +
        readFileSync(
          resolve(import.meta.dir, '../packages/overlay/LICENSE.shadcn.md'),
          'utf8',
        ) +
        '\n\n' +
        [...packages]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, pkg]) => {
            const files = readdirSync(pkg.root).filter(
              (name) =>
                /^(licen[cs]e|copying|notice)([.-].*)?$/i.test(name) &&
                statSync(resolve(pkg.root, name)).isFile(),
            );
            // Some upstream tarballs only ship their license attribution in README.
            if (!files.length)
              files.push(
                ...readdirSync(pkg.root).filter(
                  (file) =>
                    /^readme(?:\.[^.]+)?$/i.test(file) &&
                    statSync(resolve(pkg.root, file)).isFile(),
                ),
              );
            if (!files.length)
              throw new Error(
                `Missing bundled license/attribution for ${name}. Review before packaging.`,
              );
            return (
              `## ${name}\n\nLicense: ${pkg.license}\n\n` +
              files
                .sort()
                .map(
                  (file) =>
                    `### ${file}\n\n\`\`\`text\n${readFileSync(resolve(pkg.root, file), 'utf8').trim()}\n\`\`\`\n`,
                )
                .join('\n')
            );
          })
          .join('\n')
      );
    },
  };
}
