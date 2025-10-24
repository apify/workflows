# Execute Workflow Action

A GitHub Action for triggering workflows via `workflow_dispatch`, waiting for them to complete, and reporting their results.

- Triggers workflows using the `workflow_dispatch` event
- Waits for the workflow run to start (up to 60 seconds)
- Polls the workflow run status until completion
- Outputs the workflow run ID and conclusion
- Fails the action if the triggered workflow doesn't succeed

## Usage

```yaml
- name: Execute workflow
  uses: ./execute-workflow
  with:
      workflow: my-workflow.yaml
      inputs: '{ "key": "value" }'
```

## Inputs

- `workflow` (required): Workflow filename relative to `.github/workflows` (e.g., `my-workflow.yaml`)
- `inputs` (optional): Inputs to pass to the workflow as a JSON string
- `token` (optional): GitHub token for authentication (defaults to `${{ github.token }}`)

## Outputs

- `workflowRunId`: The ID of the triggered workflow run
- `conclusion`: The conclusion of the workflow run (`success`, `failure`, `cancelled`, etc.)
