# `commit` Github Action

This action creates a commit from the staged files through the GitHub GraphQL API, so the commit is automatically signed by GitHub. The author of the commit will be the identity associated with the provided token (typically `github-actions[bot]` when using `${{ secrets.GITHUB_TOKEN }}`).

## Usage

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v6

  - name: Make changes and stage them
    run: |
      echo "hello" > greeting.txt
      git add greeting.txt

  - name: Commit through API
    uses: apify/workflows/commit@v0.43.0
    with:
      commit-message: "chore: add greeting"
      github-token: ${{ secrets.YOUR_GITHUB_TOKEN_WITH_WRITE_PERMISSION }}
```

### Inputs

- `github-token` (required) — Token used to authenticate the GraphQL call. Must have `contents: write` permission on the target repository.
- `commit-message` (required) — The commit message.
- `repository` (optional, default `${{ github.repository }}`) — Target repository in `<owner>/<repo>` format.
- `branch` (optional, default `${{ github.head_ref || github.ref_name }}`) — Target branch name. On pull requests this resolves to the PR's source branch (`github.head_ref`); on other events it resolves to `github.ref_name`. Required when `create-branch` is `true`.
- `create-branch` (optional, default `false`) — When `true`, the action pushes `HEAD` to `branch` as a new remote branch before committing. `branch` must be passed explicitly in this case.

### Example: commit to a new branch

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v

  - name: Make changes and stage them
    run: |
      echo "hello" > greeting.txt
      git add greeting.txt

  - name: Commit to a new branch
    uses: apify/workflows/commit@v0.43.0
    with:
      commit-message: "chore: add greeting"
      github-token: ${{ secrets.YOUR_GITHUB_TOKEN_WITH_WRITE_PERMISSION }}
      branch: chore/add-greeting
      create-branch: 'true'
```
