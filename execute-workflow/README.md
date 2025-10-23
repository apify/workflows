# Execute Workflow Action

A TypeScript-based GitHub Action for executing workflows using the `workflow_dispatch` event.

## Development

```bash
# Install dependencies
npm install

# Build the action
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Usage

```yaml
- name: Execute workflow
  uses: ./execute-workflow
  with:
    workflow: my-workflow.yaml
    inputs: '{ "key": "value" }'
```

## Inputs

- `workflow` (required): Name, filename or ID of workflow to run
- `token` (optional): GitHub token with repo write access
- `inputs` (optional): Inputs to pass to the workflow as JSON string
- `ref` (optional): Branch, tag, or commit SHA
- `repo` (optional): Repo owner & name (format: `owner/repo`)
