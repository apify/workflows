# Wait for Checks Action

Wait for GitHub check runs to complete successfully before continuing workflow execution.

This action polls the GitHub Checks API to monitor check run status and conclusions. It's useful for creating workflow dependencies across different workflows.

## Inputs

### `check-name`

**Optional** - Name of a specific check to wait for. If not provided along with `check-regexp`, waits for all checks (except those in `ignore-checks`).

### `check-regexp`

**Optional** - Regular expression to filter checks by name. For example, `.?-task` matches any check ending with `-task`.

### `ref`

**Required** - Git ref to check (branch, tag, or commit SHA). Usually `${{ github.ref }}` or `${{ github.sha }}`.

### `token`

**Optional** - GitHub token for authentication. Defaults to `${{ github.token }}`.

### `wait-interval`

**Optional** - Seconds to wait between polling attempts. Default: `5`.

### `running-workflow-name`

**Optional** - Name of the current workflow to ignore. Useful when waiting for all other checks except the current one.

### `allowed-conclusions`

**Optional** - Comma-separated list of allowed check conclusions. Default: `success,skipped`.

Possible values: `success`, `failure`, `neutral`, `cancelled`, `skipped`, `timed_out`, `action_required`.

### `ignore-checks`

**Optional** - Comma-separated list of check names to ignore.

### `verbose`

**Optional** - Print detailed logs. Default: `true`.

## Example Usage

### Wait for a specific check

```yaml
name: Deploy

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for tests to complete
        uses: ./wait-for-checks
        with:
          ref: ${{ github.sha }}
          check-name: 'Run tests'
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy
        run: echo 'Deploying...'
```

### Wait for all checks except current workflow

```yaml
name: Final Check

on: [push]

jobs:
  final:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for all other checks
        uses: ./wait-for-checks
        with:
          ref: ${{ github.sha }}
          running-workflow-name: 'Final Check'
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Run final validation
        run: echo 'All checks passed!'
```

### Wait for checks matching a pattern

```yaml
name: Wait for tasks

on: [push]

jobs:
  wait:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for all task checks
        uses: ./wait-for-checks
        with:
          ref: ${{ github.sha }}
          check-regexp: '.*-task$'
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Allow specific conclusions

```yaml
name: Deploy even if tests skipped

on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for tests
        uses: ./wait-for-checks
        with:
          ref: ${{ github.sha }}
          check-name: 'tests'
          allowed-conclusions: 'success,skipped,neutral'
          token: ${{ secrets.GITHUB_TOKEN }}
```

## How it works

1. Queries the GitHub Checks API for all check runs on the specified ref
2. Applies filters (`check-name`, `check-regexp`, `ignore-checks`, `running-workflow-name`)
3. Polls every `wait-interval` seconds until all filtered checks have status `completed`
4. Verifies that all check conclusions are in the `allowed-conclusions` list
5. Fails the action if any check has a disallowed conclusion

## Development

### Build

```bash
npm install
npm run build
```

### Format

```bash
npm run format
```

## Notes

- The action will fail if the specified check never runs against the ref
- Check names correspond to job names in workflows (or `jobs.<job_id>.name` if specified)
- Matrix jobs will have names like "Job name (matrix-value)"
