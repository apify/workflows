# `release-metadata` Github Action

This action uses conventional commit history to determine the recommended version for a release and generate a changelog and release notes.

## Inputs

- **release_type**: One of `auto` (default), `patch`, `minor`, `major` and `custom`. `auto` means that the version will be determined based on the commit history, `custom` will use the value of the `custom_version` input parameter, and `patch`, `minor` and `major` allow forcing the bump type.
- **custom_version**: Optional unless the `release_type` is set to `custom`.
- **cliff_config_path**: Path to a configuration file for git-cliff. If none is given, a built-in configuration will be used.

## Outputs

- **is_prerelease**: For convenience - was the action triggered with release_type = "prerelease"?
- **version_number**: Version number of the new release (no leading "v")
- **tag_name**: Tag name for the new release (with a leading "v")
- **release_notes**: Release notes for the new release
- **changelog**: The complete changelog

## Example usage

Update the changelog on each push to master so that it contains an up-to-date description of the not-yet-released changes:

```yaml
name: Pre-release

on:
  push:
    branches:
      - master

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Prepare release metadata
        id: metadata
        uses: apify/workflows/release-metadata
        with:
          release_type: prerelease
      - name: Update CHANGELOG.md
        uses: DamianReeves/write-file-action@master
        with:
          path: CHANGELOG.md
          write-mode: overwrite
          contents: ${{ steps.metadata.outputs.changelog }}
      - name: Commit changes
        uses: EndBug/add-and-commit@v9
        with:
          author_name: Foo
          author_email: foo@bar.com
          message: "chore(release): Update changelog and package version [skip ci]"
```

Manually trigger a release:

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      release_type:
        description: Release type
        required: true
        type: choice
        default: auto
        options:
          - auto
          - patch
          - minor
          - major

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Prepare release metadata
        id: metadata
        uses: apify/workflows/release-metadata
        with:
          release_type: ${{ inputs.release_type }}
      - name: Update CHANGELOG.md
        uses: DamianReeves/write-file-action@master
        with:
          path: CHANGELOG.md
          write-mode: overwrite
          contents: ${{ steps.metadata.outputs.changelog }}
      - name: Commit changes
        id: commit
        uses: EndBug/add-and-commit@v9
        with:
          author_name: Foo
          author_email: foo@bar.com
          message: "chore(release): Update changelog and package version [skip ci]"
      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.metadata.outputs.tag_name }}
          name: ${{ steps.metadata.outputs.version_number }}
          target_commitish: ${{ steps.commit.commit_long_sha || github.sha }}
          body: ${{ steps.metadata.outputs.release_notes }}
```
