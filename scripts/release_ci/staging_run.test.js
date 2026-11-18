import { describe, expect, it } from 'vitest';

import { getCheckResult, jobMatchesPrefix } from './staging_run.js';

describe('jobMatchesPrefix', () => {
    it('matches the exact name and the jobs of a called workflow, but not a different job with the same beginning', () => {
        expect(jobMatchesPrefix('deploy', 'deploy')).toBe(true);
        expect(jobMatchesPrefix('deploy / get_values / get_values', 'deploy')).toBe(true);
        expect(jobMatchesPrefix('deploy_event_driven_daemons / deploy', 'deploy')).toBe(false);
    });
});

describe('getCheckResult', () => {
    it('is a failure when any matching job failed', () => {
        const jobs = [
            { name: 'build / a', conclusion: 'success' },
            { name: 'build / b', conclusion: 'failure' },
        ];
        expect(getCheckResult(jobs, 'build')).toBe('failure');
    });

    it('is cancelled when no job failed but some got cancelled', () => {
        const jobs = [
            { name: 'build / a', conclusion: 'success' },
            { name: 'build / b', conclusion: 'cancelled' },
        ];
        expect(getCheckResult(jobs, 'build')).toBe('cancelled');
    });

    it('is skipped when all matching jobs were skipped or there is none', () => {
        expect(getCheckResult([{ name: 'build', conclusion: 'skipped' }], 'build')).toBe('skipped');
        expect(getCheckResult([], 'build')).toBe('skipped');
    });

    it('is a success when the matching jobs succeeded (some of them possibly skipped)', () => {
        const jobs = [
            { name: 'build / a', conclusion: 'success' },
            { name: 'build / b', conclusion: 'skipped' },
            { name: 'deploy', conclusion: 'failure' },
        ];
        expect(getCheckResult(jobs, 'build')).toBe('success');
    });
});
