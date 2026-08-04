# workflows

This repository contains reusable github workflows used in Apify projects.

## Docs

Each of the workflows present in `.github/workflows` directory, unless prefixed by `local_`, is meant to be used by [caller workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows#example-caller-workflow)

## How to release new version

1. Create a PR. **IMPORTANT: Avoid using the `chore:` prefix, as it doesn't work with RELEASE-PLEASE. Use `feat:` or `fix:` instead.**
2. Merge PR into the main branch after approval. This triggers an automated workflow that generates a new PR for the release using the RELEASE-PLEASE action.
3. Navigate to the PR and merge it into the main branch. This will publish the release with an updated changelog.

## Examples

Build container image and push it to AWS ECR.

> NOTE: AWS ECR repository needs to be already created.

```yml
name: build and push

on:
  workflow_dispatch:

  push:
    branches:
      - main

jobs:
  get_values:
    uses: apify/workflows/.github/workflows/get_values.yaml@main

  build:
    needs: get_values
    uses: apify/workflows/.github/workflows/build_docker_image_and_push_to_ecr.yaml@main
    secrets:
      awsAccessKeyId: ${{ secrets.AWS_ACCESS_KEY_ID }}
      awsSecretAccessKey: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      slackToken: ${{ secrets.SLACK_BOT_USER_OAUTH_ACCESS_TOKEN }}
    with:
      imageTag: ${{ needs.get_values.outputs.short_commit_sha }}
      repository: <REPOSITORY_NAME>
      registry: <AWS_ACCOUNT_ID_OR_ALIAS>.dkr.ecr.<AWS_REGION>.amazonaws.com
      slackChannelId: <SLACK_CHANNEL_ID>
      actorOverride: ${{ needs.get_values.outputs.commit_author }}
```

Proofread the public-facing copy changed in a pull request. The rules come from a skill in
[`apify/agent-skills-internal`](https://github.com/apify/agent-skills-internal), so callers do not vendor a
copy of them. The caller owns the trigger; label-driven keeps the review an explicit, re-requestable
action instead of something that runs on every push.

> NOTE: `agentSkillsToken` needs read access to `apify/agent-skills-internal`. `APIFY_SERVICE_ACCOUNT_GITHUB_TOKEN` works.

```yml
name: copy proofread review

on:
  pull_request:
    types: [labeled]

jobs:
  proofread:
    if: github.event.label.name == 'copy-review'
    uses: apify/workflows/.github/workflows/copy_proofread_review.yaml@main
    secrets:
      anthropicApiKey: ${{ secrets.ANTHROPIC_API_KEY }}
      agentSkillsToken: ${{ secrets.APIFY_SERVICE_ACCOUNT_GITHUB_TOKEN }}
    with:
      paths: |
        - `src/packages/intl/src/en/`
        - `src/packages/errors/src/errors/`
      # Optional — only for conventions the model cannot infer from the code itself.
      repoInstructions: |
        - errors `*.ts`: copy is ONLY the 2nd argument of `newMeteorishError(code, message, status)`.
          The kebab-case error code and the numeric HTTP status are code.
```

Both secrets must be passed explicitly. `secrets: inherit` does not work here, because the names the workflow
declares are its own, not the caller's.
