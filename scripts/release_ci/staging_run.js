import { assertDefined } from './common.js';

/**
 * @param {string} jobName
 * @param {string} prefix
 */
export function jobMatchesPrefix(jobName, prefix) {
    return jobName === prefix || jobName.startsWith(`${prefix} /`);
}

/**
 * Computes the result of a step of the staging release (one `jobPrefix`) from the jobs of the staging workflow run.
 * Mirrors the semantics of `needs.<job>.result` that is available when the jobs are in the same workflow run.
 *
 * @param {{ name: string, conclusion?: string | null }[]} jobs
 * @param {string} jobPrefix
 *
 * @returns {'success' | 'failure' | 'cancelled' | 'skipped'}
 */
export function getCheckResult(jobs, jobPrefix) {
    const matchingJobs = jobs.filter((job) => jobMatchesPrefix(job.name, jobPrefix));

    if (matchingJobs.some((job) => job.conclusion === 'failure' || job.conclusion === 'timed_out')) {
        return 'failure';
    }

    if (matchingJobs.some((job) => job.conclusion === 'cancelled')) {
        return 'cancelled';
    }

    if (matchingJobs.every((job) => job.conclusion === 'skipped')) {
        // Also covers the case of no matching job.
        return 'skipped';
    }

    return 'success';
}

/**
 * Waits for the staging workflow run (e.g. `release_staging.yaml`) of the given commit to finish and returns its
 * conclusion together with its jobs. The release PR workflows are separate from the staging deploy workflow, so this
 * is how we learn about the results of the deploy and tests.
 *
 * @param {{
 *      github: import('@octokit/rest').Octokit,
 *      core: import('@actions/core'),
 *      owner: string,
 *      repo: string,
 *      workflowFile: string,
 *      headSha: string,
 *      event?: string,
 *      timeoutMinutes?: number,
 *      pollSeconds?: number,
 * }} opts
 *
 * @returns {Promise<{ conclusion: string | null, runUrl: string, jobs: { name: string, conclusion?: string | null, url: string }[] }>}
 */
export async function waitForStagingRun(opts) {
    assertDefined(opts, 'github');
    assertDefined(opts, 'core');
    assertDefined(opts, 'workflowFile');
    assertDefined(opts, 'headSha');

    const {
        github,
        core,
        owner,
        repo,
        workflowFile,
        headSha,
        event = 'pull_request',
        timeoutMinutes = 90,
        pollSeconds = 30,
    } = opts;

    const deadline = Date.now() + timeoutMinutes * 60 * 1000;

    while (Date.now() < deadline) {
        const { data } = await github.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflowFile,
            head_sha: headSha,
            event,
            per_page: 20,
        });

        // The runs are sorted from the newest one; re-runs keep the same run, so the first one is the one to wait for.
        const [run] = data.workflow_runs;

        if (!run) {
            core.info(`No "${workflowFile}" run found for ${headSha} yet, waiting...`);
        } else if (run.status !== 'completed') {
            core.info(`Run ${run.html_url} is ${run.status}, waiting...`);
        } else {
            const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
                owner,
                repo,
                run_id: run.id,
                filter: 'latest',
                per_page: 100,
            });

            return {
                conclusion: run.conclusion,
                runUrl: run.html_url,
                // Keep only the fields we need, the full payload (with steps) can be huge.
                jobs: jobs.map(({ name, conclusion, html_url: url }) => ({ name, conclusion, url })),
            };
        }

        await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
    }

    throw new Error(`Timed out after ${timeoutMinutes} minutes waiting for "${workflowFile}" run of ${headSha}.`);
}
