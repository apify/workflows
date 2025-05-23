# workflows

This repository contains reusable github workflows used in Apify projects.

## Docs

Each of the workflows present in `.github/workflows` directory, unless prefixed by `local_`, is meant to be used by [caller workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows#example-caller-workflow)

## How to release new version

1. Create a PR. **IMPORTANT: Avoid using the ‘chore:’ prefix, as it doesn’t work with RELEASE-PLEASE. Use ‘feat:’ or ‘fix:’ instead.**
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
