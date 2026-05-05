# `pnpm-install` Github Action

This action installs dependencies using pnpm. It also caches the whole pnpm store, for faster subsequent installs.

## Usage

```yaml
steps:
  - name: Install pnpm and dependencies
    uses: apify/workflows/pnpm-install@main
```

### Inputs

- `working-directory` (optional, default `.`) — Directory containing `pnpm-lock.yaml`.
- `github-registry-token` (optional) — When set, configures `//npm.pkg.github.com/:_authToken=<token>` in `~/.npmrc` before installing, so private `@<scope>/*` packages published to the GitHub npm registry can be resolved. Pass a token with read access to those packages.

### Example: install with GitHub registry auth

```yaml
steps:
  - name: setup Node.js
    uses: actions/setup-node@v6
    with:
      node-version-file: '.nvmrc'

  - name: Install pnpm and dependencies
    uses: apify/workflows/pnpm-install@main
    with:
      github-registry-token: ${{ secrets.APIFY_SERVICE_ACCOUNT_GITHUB_REGISTRY_TOKEN }}
```
