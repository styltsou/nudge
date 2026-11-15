# Releasing usenudge

Only the bundled `usenudge` package is public. The root and internal workspaces
stay private. The user selected MIT. Nothing has been published yet.

## Prepare and validate

Update the version in `package.release.json` and `CHANGELOG.md`. The CLI shares
that version. Verify `usenudge` ownership/availability using the intended npm
account; the GitHub repository name does not establish registry ownership.
If unavailable, change the name consistently in the manifest, installer and docs.

```sh
bun install --frozen-lockfile
bun --bun playwright install --with-deps chromium
bun run release:check
bun publish ./dist/usenudge.tgz --dry-run --access public --tag preview
```

Bun 1.4.4 requires registry authentication even for this publish dry run. Without
sign-in it reports missing authentication; that is distinct from the offline
archive checks. A maintainer with npm installed can also inspect the same archive
using `npm publish ./dist/usenudge.tgz --dry-run --ignore-scripts --tag preview`.
CI installs Node/npm for its dry run and OIDC transport. Neither form publishes
while `--dry-run` is present.

`release:check` runs typecheck, lint, tests/builds, tool and website browser tests,
then packages/checks the exact tarball. Checks cover file allowlisting, version,
metadata, notices, executable shebang and workspace/private content. Browser
tests install the archive into temporary consumers and exercise CLI setup/dev,
the packaged runner, real CSS edits/HMR, human acceptance, health and production.
No demo app is shipped or required.

Review `dist/usenudge/THIRD_PARTY_NOTICES.md`: it retains actual bundled dependency
license files, or shipped README attributions when no separate license exists.
Review upstream terms before distributing. Complete real ACP/native sign-in/edit/
review checks on Linux and the intended platforms. Fixture success is not proof
of live model access; these gates are still open in this restricted environment.

The package includes Bun runtime entry points, Vite types, package README,
changelog, MIT license, dependency notices and setup skill. Tests, website,
credentials, state and source workspaces are excluded. Vite is a peer dependency.
No postinstall rewrites the app.

## First publication — explicit maintainer action

Step-by-step guide with Bun, npm tokens and 2FA: [PUBLISHING.md](PUBLISHING.md).

After approval and successful checks, sign in to the intended npm account,
verify ownership and publish the checked archive:

```sh
bun publish ./dist/usenudge.tgz --access public --tag preview
```

This is a real external publication. Do not run it to test release preparation.
Do not publish the private root or internal workspaces. Bun cannot generate
provenance; later CI uses npm for that transport while installs/builds use Bun.
See the [official Bun publishing reference](https://bun.com/docs/pm/cli/publish).

## Subsequent releases — manual workflow

Configure npm trusted publishing for `styltsou/nudge`, workflow `publish.yml`,
environment `npm`, allowing `npm publish`. Create that GitHub environment with a
required reviewer if desired. These are owner-controlled remote settings; local
scripts do not configure them. npm requires CLI 11.5.1+ and Node 22.14+; the workflow
uses Node 24. See [npm's setup instructions](https://docs.npmjs.com/trusted-publishers/).

Commit the reviewed version, create/push `v<version>`, then manually dispatch
**Publish preview package** with the version without `v`. It checks out that tag,
runs full checks and a dry run, and uploads the tested archive. A separate `npm`
environment job downloads the same artifact and publishes using OIDC and the
`preview` tag. `RELEASE_VERSION` must match the archive. No push automatically
publishes, no tags are auto-created, and no long-lived npm token is stored in repo.
Public-repository OIDC publishes receive npm's provenance when requirements are met.

Once published, users run in their own Vite app:

```sh
bun add -d usenudge@preview
bunx --bun usenudge init --agent codex
bunx --bun usenudge dev
```

Verify the installed registry version and a real request before announcing it.
Stable `latest` promotion is a separate release decision. Remote settings and
the first authenticated publication have not been exercised by local tests.
