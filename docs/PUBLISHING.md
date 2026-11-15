# Publishing usenudge with Bun — step by step

This publishes the bundled `usenudge` package (built from `package.release.json`)
under the `preview` dist-tag, using Bun only. No npm CLI is needed locally.
Commands are PowerShell (Windows); Linux/macOS equivalents are noted.

Facts this guide relies on (checked against the npm and Bun docs, November 2026):

- npm only issues **granular access tokens** (classic tokens were removed in
  November 2025). Tokens are created on the website.
- Publishing needs **two-factor authentication (2FA)** on your npm account, or a
  token with "Bypass two-factor authentication" (being phased out for direct
  publishing in January 2027 — don't rely on it).
- `bun publish` reads the token from the `NPM_CONFIG_TOKEN` environment variable
  (or `.npmrc`), and asks for your 2FA code in the browser (default) or the
  terminal (`--auth-type legacy`, or pass `--otp 123456`).
- Publishing a tarball path skips lifecycle scripts, which is what we want: the
  archive is built and checked first.

## 0. One-time account setup

1. Sign in at <https://www.npmjs.com> (or create the account you want to own
   `usenudge`).
2. Turn on 2FA: profile picture → **Account** → **Two-Factor Authentication** →
   enable it with an authenticator app. Keep the recovery codes.
3. Confirm the name is still free (a 404 / "not found" means available):

   ```powershell
   bun info usenudge
   ```

## 1. Prepare the release

1. Start from a clean, up-to-date `main`:

   ```powershell
   git switch main
   git pull
   git status   # should be clean
   ```

2. Set the version in `package.release.json` (for the first release keep
   `0.1.0-preview.1`). The CLI reads its version from this file.
3. In `CHANGELOG.md`, replace `— unreleased` with today's date and remove the
   "Not published yet" line.
4. In `README.md` and `packages/cli/README.md`, drop the "unpublished preview /
   use the release archive" wording so the registry install is the primary path.
5. Commit:

   ```powershell
   git commit -am "Release 0.1.0-preview.1"
   ```

## 2. Build and verify the exact archive

```powershell
bun install --frozen-lockfile
bun --bun playwright install chromium
bun run release:check
```

`release:check` runs typecheck, lint, all tests, builds, the browser suites, then
packs `dist/usenudge.tgz` and validates it (allowlisted files, version, notices,
no workspace or private content). Everything must pass.

Look inside the archive once:

```powershell
tar -tzf dist/usenudge.tgz
```

You should see only `package/package.json`, `package/dist/*`, `README.md`,
`LICENSE`, `CHANGELOG.md`, `THIRD_PARTY_NOTICES.md` and `skills/…`. Skim
`dist/usenudge/THIRD_PARTY_NOTICES.md` before the first public release.

## 3. Create a short-lived publish token

On npmjs.com: profile picture → **Access Tokens** → **Generate New Token**.

| Field                                 | Value                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token name                            | `usenudge first publish`                                                                                                                                          |
| Bypass two-factor authentication      | **Leave unchecked** (you'll confirm with 2FA)                                                                                                                     |
| Allowed IP ranges                     | Optional; your current IP if you want                                                                                                                             |
| Packages and scopes → Permissions     | **Read and write (publish and stage)**                                                                                                                            |
| Packages and scopes → Select packages | **All Packages** for the first publish (the package doesn't exist yet, so it can't be picked). For later manual releases, make a new token limited to `usenudge`. |
| Organizations                         | No access                                                                                                                                                         |
| Expiration                            | **Custom → tomorrow** (the shortest allowed)                                                                                                                      |

Click **Generate Token** and copy it (it's shown once). Never paste it into a
file in this repository.

## 4. Give the token to Bun for this terminal only

```powershell
$env:NPM_CONFIG_TOKEN = Read-Host "npm token"
```

Paste the token at the prompt. `Read-Host` input is not saved in your shell
history, and the variable disappears when you close this terminal.
(bash/zsh: `read -rs NPM_CONFIG_TOKEN && export NPM_CONFIG_TOKEN`.)

## 5. Dry run

```powershell
bun publish ./dist/usenudge.tgz --dry-run --access public --tag preview
```

This authenticates and shows what would be published, without publishing.
Check the name `usenudge`, the version, the `preview` tag and the file list.

## 6. Publish

```powershell
bun publish ./dist/usenudge.tgz --access public --tag preview
```

Bun opens your browser to confirm with 2FA. If you prefer the terminal:

```powershell
bun publish ./dist/usenudge.tgz --access public --tag preview --auth-type legacy
```

(it asks "Enter OTP:"), or pass the current code directly with `--otp 123456`.
A published version can't be replaced; fix forward with a new version instead.

## 7. Verify like a user

```powershell
bun info usenudge
bun info usenudge dist-tags
```

`preview` must point at the new version. Then, in a scratch Vite app:

```powershell
bun add -d usenudge@preview
bunx --bun usenudge --version
bunx --bun usenudge init
bunx --bun usenudge dev
```

Run one real request through an agent before announcing it.

## 8. Clean up the token

```powershell
Remove-Item Env:NPM_CONFIG_TOKEN
```

On npmjs.com → **Access Tokens**, delete the token (it would expire tomorrow
anyway). Then tag the release and push:

```powershell
git tag v0.1.0-preview.1
git push
git push origin v0.1.0-preview.1
```

## 9. Later releases without tokens (recommended)

Now that the package exists, switch to GitHub trusted publishing (OIDC), which
uses the existing `.github/workflows/publish.yml` and needs no stored token:

1. GitHub → `styltsou/nudge` → **Settings** → **Environments** → **New
   environment** `npm`. Optionally add yourself as a required reviewer.
2. npmjs.com → **Packages** → `usenudge` → **Settings** → **Trusted publishing**
   → **GitHub Actions**:
   - Organization or user: `styltsou`
   - Repository: `nudge`
   - Workflow filename: `publish.yml`
   - Environment name: `npm`
   - Allowed actions: allow `npm publish`

   Fields are case-sensitive and `repository.url` in `package.release.json` must
   match the repo. A new trusted publisher that isn't used within 2 days
   expires, so set it up when you're ready to release.

3. Package **Settings** → **Publishing access** → "Require two-factor
   authentication and disallow tokens" → **Update Package Settings**. From then
   on only the workflow (or you, interactively with 2FA) can publish.

Each release after that:

1. Bump `package.release.json` and `CHANGELOG.md`, commit.
2. `git tag v<version>` and `git push origin v<version>`.
3. GitHub → **Actions** → **Publish preview package** → **Run workflow**, enter
   the version without `v` (e.g. `0.1.0-preview.2`). It checks out the tag, runs
   the full checks and a dry run, then publishes the tested archive from the
   `npm` environment with provenance.

Promoting to the stable `latest` tag is a separate decision (`--tag latest` on a
non-prerelease version).
