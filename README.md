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

## Release automation 2 (work in progress)

Workflows with the `_2` suffix are the successor of `create_prod_release.yaml`. They are copied from the release
automation of `apify-core` and made configurable. The release flow is split into building blocks that a repository
combines as needed (`apify-core` can use only some of them, or add its own steps):

| Workflow | Purpose | Caller trigger |
| --- | --- | --- |
| `create_prod_release_2.yaml` | Creates the release branch; for scheduled runs it skips days with no release (Fri, weekends, Czech holidays, Christmas), and warns in Slack when the release cannot be created. | `workflow_dispatch` + `schedule` |
| `release_pr_notify_2.yaml` | Waits for the staging release of the release PR, requests reviews from the commit authors, deploy duty and QA, and sends the "release ready" message that starts the Slack thread. | `pull_request` to the base branch (`opened`, `reopened`, `synchronize`) on `release/v**` |
| `release_pr_periodic_notifications_2.yaml` | Reminds the pending reviewers in the Slack thread. | `schedule` |
| `release_pr_ready_to_merge_notification_2.yaml` | Tags the deploy duty in the thread when all reviews are in. | `pull_request_review` (`submitted`) |

They use scripts from the `scripts` directory, which the workflows check out from this repository. Pass
`workflowsRef` with the same ref that the workflow is referenced with (`@<ref>`), otherwise the scripts come from `main`.

Examples of callers: https://github.com/apify/actor-standby-controller/tree/create-prod-release-2/.github/workflows

Tests of the scripts: `cd scripts && npm install && npm test`.
