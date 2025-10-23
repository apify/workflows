// ----------------------------------------------------------------------------
// Execute Workflow Action - Main task code
// ----------------------------------------------------------------------------

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as PackageJSON from '../package.json'

type Workflow = {
    id: number
    name: string
    path: string
}

type WorkflowRun = {
    id: number
    status: string
    conclusion: string | null
    html_url: string
}

//
// Main task function (async wrapper)
//
async function run(): Promise<void> {
    core.info(`🏃 Execute Workflow Action v${PackageJSON.version}`)
    try {
        const workflowFileName = core.getInput('workflow')

        const inputsJson = core.getInput('inputs')
        const inputs = inputsJson ? JSON.parse(inputsJson) : {}

        const octokit = github.getOctokit('')

        const owner = github.context.repo.owner
        const repo = github.context.repo.repo
        const ref = github.context.ref

        const workflows: Workflow[] = await octokit.paginate(
            octokit.rest.actions.listRepoWorkflows.endpoint.merge({
                owner,
                repo,
            }),
        )

        const workflowPath = `.github/workflows/${workflowFileName}`
        const foundWorkflow = workflows.find((workflow) => workflow.path === workflowPath)

        if (!foundWorkflow) throw new Error(`Unable to find workflow '${workflowPath}' in ${owner}/${repo} 😥`)

        console.log(
            `🔎 Found workflow, id: ${foundWorkflow.id}, name: ${foundWorkflow.name}, path: ${foundWorkflow.path}`,
        )

        // Get current workflow runs before dispatching
        const runsBefore = await octokit.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: foundWorkflow.id,
            per_page: 5,
        })

        // Call workflow_dispatch API
        console.log('🚀 Calling GitHub API to dispatch workflow...')
        await octokit.request(`POST /repos/${owner}/${repo}/actions/workflows/${foundWorkflow.id}/dispatches`, {
            ref,
            inputs,
        })

        // Wait for the new run to appear
        core.info('⏳ Waiting for workflow run to start...')
        let workflowRun: WorkflowRun | undefined
        const maxWaitTime = 60000 // 60 seconds
        const pollInterval = 1000 // 1 second
        const startTime = Date.now()

        while (!workflowRun && Date.now() - startTime < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval))

            const runsAfter = await octokit.rest.actions.listWorkflowRuns({
                owner,
                repo,
                workflow_id: foundWorkflow.id,
                per_page: 5,
            })

            // Find the new run (one that wasn't in the before list)
            const newRun = runsAfter.data.workflow_runs.find(
                (run) => !runsBefore.data.workflow_runs.some((oldRun) => oldRun.id === run.id),
            )

            if (newRun) {
                workflowRun = newRun as WorkflowRun
            }
        }

        if (!workflowRun) {
            throw new Error('Timeout waiting for workflow run to start')
        }

        core.info(`✅ Workflow run started: ${workflowRun.html_url}`)
        core.setOutput('workflowRunId', workflowRun.id)

        // Poll until the workflow completes
        core.info('⏳ Waiting for workflow run to complete...')
        while (workflowRun.status !== 'completed') {
            await new Promise((resolve) => setTimeout(resolve, pollInterval))

            const runStatus = await octokit.rest.actions.getWorkflowRun({
                owner,
                repo,
                run_id: workflowRun.id,
            })

            workflowRun = runStatus.data as WorkflowRun
            core.info(`📊 Status: ${workflowRun.status}`)
        }

        core.info(`🏁 Workflow run completed with conclusion: ${workflowRun.conclusion}`)
        core.setOutput('conclusion', workflowRun.conclusion)

        if (workflowRun.conclusion !== 'success') {
            throw new Error(`Workflow run failed with conclusion: ${workflowRun.conclusion}`)
        }
    } catch (error) {
        const e = error as Error

        if (e.message.endsWith('a disabled workflow')) {
            core.warning('Workflow is disabled, no action was taken')
            return
        }

        core.setFailed(e.message)
    }
}

run()
