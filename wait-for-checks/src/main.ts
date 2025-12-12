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
        const waitInterval = parseInt(core.getInput('wait-interval'), 10);
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
                ref,
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
