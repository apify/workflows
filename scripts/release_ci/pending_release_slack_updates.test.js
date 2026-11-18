import { describe, expect, it } from 'vitest';

import { createSlackUpdate } from './pending_release_slack_updates.js';

const TEST_GH_JOBS = {
    jobs: [
        {
            name: 'build',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658495240',
        },
        {
            name: 'deploy',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658504473',
        },
        {
            name: 'deploy_event_driven_daemons',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658504882',
        },
        {
            name: 'integration_tests',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658511447',
        },
        {
            name: 'playwright_tests',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658511800',
        },
        {
            name: 'test_staging_event_driven_daemons',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/12345678901',
        },
        {
            name: 'send_pending_release_update_to_slack',
            url: 'https://github.com/apify/apify-core/actions/runs/11724471092/job/32658520085',
        },
    ],
};

/**
 * Base options for a successful release run; tests override only the fields they exercise.
 *
 * @param {Partial<Parameters<typeof createSlackUpdate>[0]>} [overrides]
 */
const createOpts = (overrides) => ({
    revision: '1234',
    buildResult: 'success',
    deployResult: 'success',
    deployEventDrivenDaemonsResult: 'success',
    integrationTestsResult: 'success',
    playwrightTestsResult: 'success',
    eventDrivenDaemonsTestsResult: 'success',
    prTitle: '#17873 "Release" v0.1183.0',
    prUrl: 'https://github.com/apify/apify-core/pull/17873',
    changelogAuthors: [],
    jobs: TEST_GH_JOBS,
    doRickRoll: false,
    ...overrides,
});

describe('createSlackUpdate', () => {
    describe('when slackThreadId is empty', () => {
        it('creates a success message', () => {
            const { message, shouldStoreThreadId } = createSlackUpdate(
                createOpts({
                    changelogAuthors: [
                        {
                            slackId: 'U01UJ9GJ8P5',
                            email: 'john.doe@apify.com',
                        },
                        {
                            email: 'jane.honda@apify.com',
                        },
                    ],
                    qaDutySlackId: 'U0QA1DUTY2',
                    currentsRunUrl: 'https://app.currents.dev/run/abc123',
                }),
            );

            expect(message).toContain('New release ready on staging');
            expect(message).toContain('<@U01UJ9GJ8P5>');
            expect(message).toContain('jane.honda@apify.com');
            expect(message).toContain('<@U0QA1DUTY2> is on QA duty');
            expect(message).toContain('https://app.currents.dev/run/abc123');
            // Resolved deep link labels the Playwright link as a single run.
            expect(message).toContain('<https://app.currents.dev/run/abc123|run>');
            expect(JSON.parse(message)).toBeDefined();

            expect(shouldStoreThreadId).toBe(true);
        });

        it('lists contributors without a Slack ID in a separate section', () => {
            const { message } = createSlackUpdate(
                createOpts({
                    changelogAuthors: [
                        { slackId: 'U01UJ9GJ8P5', email: 'john.doe@apify.com' },
                        { email: 'jane.honda@apify.com' },
                        { email: 'noreply@anthropic.com' },
                    ],
                }),
            );

            expect(message).toContain('<@U01UJ9GJ8P5>');
            expect(message).toContain(
                'Could not match these contributors to an org member: jane.honda@apify.com, noreply@anthropic.com',
            );
            expect(JSON.parse(message)).toBeDefined();
        });

        it('omits the unmatched-contributors section when every author resolved', () => {
            const { message } = createSlackUpdate(
                createOpts({ changelogAuthors: [{ slackId: 'U01UJ9GJ8P5', email: 'john.doe@apify.com' }] }),
            );

            expect(message).not.toContain('Could not match these contributors');
            expect(JSON.parse(message)).toBeDefined();
        });

        it('falls back to the project dashboards when no run link is provided', () => {
            const { message } = createSlackUpdate(createOpts());

            expect(message).toContain('https://app.currents.dev/projects/T3im2d');
            // Fallback to the project run list labels the Playwright link as runs.
            expect(message).toContain('<https://app.currents.dev/projects/T3im2d|runs>');
            expect(JSON.parse(message)).toBeDefined();
        });

        it('omits the QA duty line when no QA duty Slack ID is provided', () => {
            const { message } = createSlackUpdate(createOpts());

            expect(message).toContain('New release ready on staging');
            expect(message).not.toContain('is on QA duty');
            expect(JSON.parse(message)).toBeDefined();
        });

        it('creates a failure message', () => {
            const { message, shouldStoreThreadId } = createSlackUpdate(
                createOpts({
                    deployResult: 'false',
                    integrationTestsResult: '',
                    playwrightTestsResult: '',
                }),
            );

            expect(message).toContain('Deploy to staging failed');
            expect(JSON.parse(message)).toBeDefined();

            expect(shouldStoreThreadId).toBe(false);
        });
    });

    describe('when slackThreadId is not empty', () => {
        it('creates an update message', () => {
            const { message, shouldStoreThreadId } = createSlackUpdate(
                createOpts({ slackThreadId: '1633610657.000100' }),
            );

            expect(message).toContain('Deploy to staging finished');
            // Suppress link previews so the Currents link doesn't unfurl in the thread.
            expect(JSON.parse(message).unfurl_links).toBe(false);
            expect(JSON.parse(message).unfurl_media).toBe(false);

            expect(shouldStoreThreadId).toBe(false);
        });
    });

    // Finding job URLs is tricky. For example, there is no "build" job (unless skipped) as building is a nested
    // workflow which results in a bunch of jobs returned, such as "build / get_values / get_values".
    describe('GitHub job links', () => {
        it('extracts job links from executed workflows', () => {
            const ghJobs = {
                jobs: [
                    {
                        // No failure in "build" workflow, so picking first
                        name: 'build / get_values / get_values',
                        conclusion: 'success',
                        url: 'https://github.com/build/get_values',
                    },
                    {
                        name: 'build / build_infinite_daemons',
                        conclusion: 'success',
                        url: 'https://github.com/build/build_infinite_daemons',
                    },
                    {
                        name: 'deploy / get_values / get_values',
                        conclusion: 'success',
                        url: 'https://github.com/deploy/get_values',
                    },
                    {
                        // First failure in "deploy" workflow
                        name: 'deploy / get_cloudformation_parameters',
                        conclusion: 'failure',
                        url: 'https://github.com/deploy/get_cloudformation_parameters',
                    },
                    {
                        // First failure in "deploy_event_driven_daemons" workflow
                        name: 'deploy_event_driven_daemons / deploy member account resources / deploy',
                        conclusion: 'failure',
                        url: 'https://github.com/deploy_event_driven_daemons/deploy_member_account_resources/deploy',
                    },
                    {
                        name: 'deploy_event_driven_daemons / deploy event driven daemons',
                        conclusion: 'failure',
                        url: 'https://github.com/deploy_event_driven_daemons/deploy_event_driven_daemons',
                    },
                    {
                        // First failure in "integration_tests" workflow
                        name: 'integration_tests / get_values / get_values',
                        conclusion: 'failure',
                        url: 'https://github.com/integration_tests/get_values',
                    },
                    {
                        name: 'integration_tests / send_notification_to_slack_start / slack',
                        conclusion: 'failure',
                        url: 'https://github.com/integration_tests/send_notification_to_slack_start/slack',
                    },
                    {
                        name: 'playwright_tests / playwright-run',
                        conclusion: 'failure',
                        url: 'https://github.com/playwright_tests/playwright-run',
                    },
                    {
                        name: 'test_staging_event_driven_daemons / check',
                        conclusion: 'failure',
                        url: 'https://github.com/test_staging_event_driven_daemons/check',
                    },
                ],
            };

            const { message } = createSlackUpdate(createOpts({ slackThreadId: '1633610657.000100', jobs: ghJobs }));

            expect(message).toContain(`<https://github.com/build/get_values|Build>`);
            expect(message).toContain(`<https://github.com/deploy/get_cloudformation_parameters|Deploy>`);
            expect(message).toContain(
                `<https://github.com/deploy_event_driven_daemons/deploy_member_account_resources/deploy|Deploy event-driven daemons>`,
            );
            expect(message).toContain(`<https://github.com/integration_tests/get_values|Integration tests>`);
            expect(message).toContain(`<https://github.com/playwright_tests/playwright-run|Playwright tests>`);
            expect(message).toContain(
                `<https://github.com/test_staging_event_driven_daemons/check|Event-driven daemons tests>`,
            );
        });

        it('extracts job links from skipped workflows', () => {
            const ghJobs = {
                jobs: [
                    {
                        name: 'build',
                        conclusion: 'skipped',
                        url: 'https://github.com/build',
                    },
                    {
                        name: 'deploy',
                        conclusion: 'skipped',
                        url: 'https://github.com/deploy',
                    },
                    {
                        name: 'deploy_event_driven_daemons',
                        conclusion: 'skipped',
                        url: 'https://github.com/deploy_event_driven_daemons',
                    },
                    {
                        name: 'integration_tests',
                        conclusion: 'skipped',
                        url: 'https://github.com/integration_tests',
                    },
                    {
                        name: 'playwright_tests',
                        conclusion: 'skipped',
                        url: 'https://github.com/playwright_tests',
                    },
                    {
                        name: 'test_staging_event_driven_daemons / check',
                        conclusion: 'skipped',
                        url: 'https://github.com/test_staging_event_driven_daemons/check',
                    },
                    {
                        name: 'send_pending_release_update_to_slack',
                        conclusion: 'skipped',
                        url: 'https://github.com/send_pending_release_update_to_slack',
                    },
                ],
            };

            const { message } = createSlackUpdate(createOpts({ slackThreadId: '1633610657.000100', jobs: ghJobs }));

            expect(message).toContain(`<https://github.com/build|Build>`);
            expect(message).toContain(`<https://github.com/deploy|Deploy>`);
            expect(message).toContain(`<https://github.com/deploy_event_driven_daemons|Deploy event-driven daemons>`);
            expect(message).toContain(`<https://github.com/integration_tests|Integration tests>`);
            expect(message).toContain(`<https://github.com/playwright_tests|Playwright tests>`);
            expect(message).toContain(
                `<https://github.com/test_staging_event_driven_daemons/check|Event-driven daemons tests>`,
            );
        });
    });
});
