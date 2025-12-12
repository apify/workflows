// ----------------------------------------------------------------------------
// Wait for Checks Action - Main task code
// ----------------------------------------------------------------------------

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as PackageJSON from '../package.json';

type CheckRun = {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
};

type CheckRunsResponse = {
    data: {
        check_runs: CheckRun[];
    };
};

type Commit = {
    sha: string;
    commit: {
        message: string;
    };
    parents: Array<{ sha: string }>;
};

// Skip CI patterns that GitHub recognizes
const SKIP_CI_PATTERNS = ['[skip ci]', '[ci skip]', '[no ci]', '[skip actions]', '[actions skip]'];

const MAX_PARENT_TRAVERSAL = 100;

/**
 * Check if a commit message contains any skip CI pattern
 */
function hasSkipCI(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return SKIP_CI_PATTERNS.some((pattern) => lowerMessage.includes(pattern.toLowerCase()));
}

/**
 * Resolve a ref (branch/tag/commit) to a commit SHA
 */
async function resolveRefToSHA(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    ref: string,
): Promise<string> {
    try {
        const { data } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: ref.replace(/^refs\//, ''), // Strip 'refs/' prefix if present
        });
        // For refs, we get back an object with a sha
        return data.object.sha;
    } catch {
        // If getRef fails, assume it's already a commit SHA
        return ref;
    }
}

/**
 * Get commit information including parents
 */
async function getCommit(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    sha: string,
): Promise<Commit> {
    const { data } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
    });
    return data as Commit;
}

/**
 * Walk up parent commits until we find one without [skip ci]
 */
async function findCommitWithoutSkipCI(
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    initialSHA: string,
    verbose: boolean,
): Promise<string> {
    let currentSHA = initialSHA;
    let depth = 0;

    while (depth < MAX_PARENT_TRAVERSAL) {
        const commit = await getCommit(octokit, owner, repo, currentSHA);

        if (verbose) {
            core.info(`🔍 Checking commit ${currentSHA.substring(0, 7)}: ${commit.commit.message.split('\n')[0]}`);
        }

        // Check if this commit has [skip ci]
        if (!hasSkipCI(commit.commit.message)) {
            if (currentSHA !== initialSHA) {
                core.info(`✅ Found commit without [skip ci]: ${currentSHA.substring(0, 7)}`);
            }
            return currentSHA;
        }

        // Has [skip ci], check if it's a merge commit
        if (commit.parents.length > 1) {
            throw new Error(
                `Commit ${currentSHA.substring(0, 7)} is a merge commit with [skip ci]. Cannot determine which parent to follow.`,
            );
        }

        // Has [skip ci] and not a merge commit
        if (commit.parents.length === 0) {
            throw new Error(
                `Reached root commit ${currentSHA.substring(0, 7)} which has [skip ci]. No commits without [skip ci] found.`,
            );
        }

        // Move to parent
        const parentSHA = commit.parents[0].sha;
        core.info(`⚠️  Commit ${currentSHA.substring(0, 7)} has [skip ci], checking parent ${parentSHA.substring(0, 7)}...`);
        currentSHA = parentSHA;
        depth++;
    }

    throw new Error(
        `Traversed ${MAX_PARENT_TRAVERSAL} commits without finding one without [skip ci]. Giving up.`,
    );
}

//
// Main task function (async wrapper)
//
async function run(): Promise<void> {
    core.info(`🔍 Wait for Checks Action v${PackageJSON.version}`);
    try {
        // Get inputs
        const checkName = core.getInput('check-name');
        const checkRegexp = core.getInput('check-regexp');
        const ref = core.getInput('ref');
        const token = core.getInput('token');
        const waitInterval = parseInt(core.getInput('wait-interval'), 5);
        const runningWorkflowName = core.getInput('running-workflow-name');
        const allowedConclusionsInput = core.getInput('allowed-conclusions');
        const ignoreChecksInput = core.getInput('ignore-checks');
        const verbose = core.getInput('verbose') === 'true';

        const allowedConclusions = allowedConclusionsInput.split(',').map((c) => c.trim());
        const ignoreChecks = ignoreChecksInput
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

        const octokit = github.getOctokit(token);
        const owner = github.context.repo.owner;
        const repo = github.context.repo.repo;

        // Resolve ref to SHA and find a commit without [skip ci]
        core.info(`📍 Resolving ref: ${ref}`);
        const initialSHA = await resolveRefToSHA(octokit, owner, repo, ref);
        const targetSHA = await findCommitWithoutSkipCI(octokit, owner, repo, initialSHA, verbose);
        
        if (targetSHA !== initialSHA) {
            core.info(`🔄 Using commit ${targetSHA.substring(0, 7)} instead of ${initialSHA.substring(0, 7)}`);
        }

        // Helper function to log checks
        const logChecks = (checks: CheckRun[], message: string): void => {
            if (!verbose) return;

            core.info(message);
            const statuses = [...new Set(checks.map((c) => c.status))];
            statuses.forEach((status) => {
                const statusChecks = checks.filter((c) => c.status === status);
                core.info(`  Checks ${status}: ${statusChecks.map((c) => c.name).join(', ')}`);
            });
        };

        // Helper function to query and filter check runs
        const queryCheckStatus = async (): Promise<CheckRun[]> => {
            const response: CheckRunsResponse = await octokit.rest.checks.listForRef({
                owner,
                repo,
                ref: targetSHA,
            });

            let checks = response.data.check_runs;
            logChecks(checks, 'Checks running on ref:');

            // Apply filters
            const filtersToIgnore = [...ignoreChecks];
            if (runningWorkflowName) {
                filtersToIgnore.push(runningWorkflowName);
            }

            checks = checks.filter((check) => !filtersToIgnore.includes(check.name));
            logChecks(checks, 'Checks after ignore checks filter:');

            if (checkName) {
                checks = checks.filter((check) => check.name === checkName);
                logChecks(checks, 'Checks after check-name filter:');
            }

            if (checkRegexp) {
                const regexp = new RegExp(checkRegexp);
                checks = checks.filter((check) => regexp.test(check.name));
                logChecks(checks, 'Checks after regexp filter:');
            }

            return checks;
        };

        // Helper to check if all checks are complete
        const allChecksComplete = (checks: CheckRun[]): boolean => {
            return checks.every((check) => check.status === 'completed');
        };

        // Helper to check if conclusion is allowed
        const checkConclusionAllowed = (check: CheckRun): boolean => {
            return check.conclusion !== null && allowedConclusions.includes(check.conclusion);
        };

        // Main logic
        let checks = await queryCheckStatus();

        // Check if any filters were applied and no checks found
        const filtersPresent = checkName.length > 0 || checkRegexp.length > 0;
        if (filtersPresent && checks.length === 0) {
            throw new Error('The requested check was never run against this ref, exiting...');
        }

        // Wait for all checks to complete
        while (!allChecksComplete(checks)) {
            const plural = checks.length > 1 ? "checks aren't" : "check isn't";
            core.info(`⏳ The requested ${plural} complete yet, will check back in ${waitInterval} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, waitInterval * 1000));
            checks = await queryCheckStatus();
        }

        // Show completion message
        core.info('✅ Checks completed:');
        checks.forEach((check) => {
            core.info(`  ${check.name}: ${check.status} (${check.conclusion})`);
        });

        // Verify all conclusions are allowed
        const failedChecks = checks.filter((check) => !checkConclusionAllowed(check));
        if (failedChecks.length > 0) {
            const conclusions = failedChecks.map((c) => c.conclusion).join(', ');
            throw new Error(
                `The conclusion of one or more checks were not allowed. Found: ${conclusions}. ` +
                    `Allowed conclusions are: ${allowedConclusions.join(', ')}. ` +
                    `This can be configured with the 'allowed-conclusions' param.`,
            );
        }

        core.info('🎉 All checks passed successfully!');
    } catch (error) {
        const e = error as Error;
        core.setFailed(e.message);
    }
}

run();
