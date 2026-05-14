# `commit` Github Action

This action creates a commit from the staged files through the GitHub GraphQL API, so the commit is automatically signed by GitHub. The author of the commit will be the identity associated with the provided token (typically `github-actions[bot]` when using `${{ secrets.GITHUB_TOKEN }}`).

By default the action stages everything in the working tree (`git add .`) before committing. Pass the `path` input to scope the staging, or set it to a pathspec that matches nothing if you want to control staging yourself before calling the action.

## Usage

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v6

  - name: Make changes
    run: |
      echo "hello" > greeting.txt

  - name: Commit through API
    uses: apify/workflows/commit@v0.43.0
    with:
      commit-message: "chore: add greeting"
      github-token: ${{ secrets.YOUR_GITHUB_TOKEN_WITH_WRITE_PERMISSION }}
      path: greeting.txt
```

### Inputs

- `github-token` (required) — Token used to authenticate the GraphQL call. Must have `contents: write` permission on the target repository.
- `commit-message` (required) — The commit message.
- `repository` (optional, default `${{ github.repository }}`) — Target repository in `<owner>/<repo>` format.
- `branch` (optional, default `${{ github.head_ref || github.ref_name }}`) — Target branch name. On pull requests this resolves to the PR's source branch (`github.head_ref`); on other events it resolves to `github.ref_name`. Required when `create-branch` is `true`.
- `create-branch` (optional, default `false`) — When `true`, the action pushes `HEAD` to `branch` as a new remote branch before committing. `branch` must be passed explicitly in this case.
- `path` (optional, default `.`) — Paths passed to `git add` before committing. Defaults to `.` (everything).
- `pull` (optional, default `''`) — When non-empty, run `git pull <pull>` before staging and committing (e.g. `--rebase --autostash`). The special value `true` runs a plain `git pull` with no arguments. Defaults to an empty string (no pull).

### Outputs

- `commit-sha` — The SHA of the created commit. Empty when `committed` is `false`.
- `committed` — `'true'` when a commit was created, `'false'` when there were no changes to commit.

### Example: commit to a new branch

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v

  - name: Make changes
    run: echo "hello" > greeting.txt

  - name: Commit to a new branch
    uses: apify/workflows/commit@v0.45.0
    with:
      commit-message: "chore: add greeting"
      github-token: ${{ secrets.YOUR_GITHUB_TOKEN_WITH_WRITE_PERMISSION }}
      branch: chore/add-greeting
      create-branch: 'true'
      path: greeting.txt
```

### Example: pull before committing

When another job may push to the same branch concurrently, use `pull` to fetch the latest changes before committing.

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v6

  - name: Make changes
    run: echo "hello" > greeting.txt

  # Someone else would push to the same branch at this point.

  - name: Commit through API
    uses: apify/workflows/commit@v0.45.0
    with:
      commit-message: "chore: add greeting"
      github-token: ${{ secrets.YOUR_GITHUB_TOKEN_WITH_WRITE_PERMISSION }}
      path: greeting.txt
      pull: --rebase --autostash
```
