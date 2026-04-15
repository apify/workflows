# `pnpm-install` Github Action

This action installs dependencies using pnpm. It also caches the whole pnpm store, for faster subsequent installs.

## Usage

```yaml
steps:
  - name: Install pnpm and dependencies
    uses: apify/workflows/pnpm-install@main
```
