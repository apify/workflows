export const QA_SLACK_GROUP_ID = 'S06U4RX8K4N';

const CURRENTS_PLAYWRIGHT_STAGING_RUNS_URL = 'https://app.currents.dev/projects/T3im2d';

const MEZMO_STAGING_ALL_ERRORS_VIEW = 'https://app.mezmo.com/521d8cd6fa/logs/view/d56474f17f';
const MEZMO_STAGING_ALL_VIEW = 'https://app.mezmo.com/521d8cd6fa/logs/view/d420cbaaee';
const GRAFANA_STAGING_DASHBOARD_API =
    'https://grafana.apify.dev/d/f89ad3e3-919a-420e-8f92-edb0f1c69512/mezmo-error-rate?orgId=1&from=now-6h&to=now&timezone=browser&var-environment=staging&var-app=apify-api';
const GRAFANA_STAGING_DASHBOARD_CONSOLE =
    'https://grafana.apify.dev/d/f89ad3e3-919a-420e-8f92-edb0f1c69512/mezmo-error-rate?orgId=1&from=now-6h&to=now&timezone=browser&var-environment=staging&var-app=apify-app-ui-backend';

/**
 * @typedef {{ slackId?: string; email?: string; login?: string }} ChangelogAuthor
 */

/**
 * Returns a Slack message to be sent, plus shouldStoreThreadId flag, which indicates whether we should store the new
 * message ID so that we can continue replying to it, starting a new thread.
 *
 * Tip: Use Slack Block Kit Builder to visualize messages at https://app.slack.com/block-kit-builder/.
 *
 * @param {{
 *      revision: string,
 *      buildResult: string,
 *      deployResult: string,
 *      deployEventDrivenDaemonsResult: string,
 *      integrationTestsResult: string,
 *      playwrightTestsResult: string,
 *      eventDrivenDaemonsTestsResult?: string,
 *      slackThreadId?: string,
 *      prTitle: string,
 *      prUrl: string,
 *      changelogAuthors: ChangelogAuthor[],
 *      jobs: { jobs: { name: string, conclusion?: string, url: string }[] },
 *      deployDutySlackId?: string,
 *      onCallDutySlackId?: string,
 *      qaDutySlackId?: string,
 *      currentsRunUrl?: string,
 *      doRickRoll?: boolean,
 * }} opts
 *
 * @returns {{shouldStoreThreadId: boolean, message: string}}
 */
export function createSlackUpdate({
    buildResult,
    deployResult,
    deployEventDrivenDaemonsResult,
    integrationTestsResult,
    playwrightTestsResult,
    eventDrivenDaemonsTestsResult,
    slackThreadId,
    prTitle,
    prUrl,
    changelogAuthors,
    jobs, // a list of jobs fetched using GitHub API
    deployDutySlackId,
    onCallDutySlackId,
    qaDutySlackId,
    currentsRunUrl,
    doRickRoll = true,
}) {
    const isDeploySuccessful =
        buildResult === 'success' && deployResult === 'success' && deployEventDrivenDaemonsResult === 'success';

    // Finding the job URL is tricky. For example, there is no "build" job as building is a nested workflow which
    // results in a bunch of jobs returned, such as "build / get_values / get_values". We'll find the matching job by
    // prefix, and then prefer the first failing job.
    /**
     * @param {string} workflowPrefix
     */
    function findJobUrl(workflowPrefix) {
        const matchingJobs = jobs.jobs.filter((job) => job.name.startsWith(workflowPrefix));

        if (doRickRoll && (matchingJobs.length === 0 || Math.random() < 0.02)) {
            return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        }

        const maybeFailingJob = matchingJobs.find((job) => job.conclusion === 'failure') || matchingJobs[0];
        return maybeFailingJob.url;
    }

    /**
     * @param {string|undefined} status
     * @return {string}
     */
    function getStatusIcon(status) {
        switch (status) {
            case 'success':
                return ':large_green_circle:';
            case 'failure':
                return ':red_circle:';
            default:
                return ':black_circle:';
        }
    }

    const buildStatusLink = `${getStatusIcon(buildResult)} <${findJobUrl('build')}|Build>`;
    const deployStatusLink = `${getStatusIcon(deployResult)} <${findJobUrl('deploy')}|Deploy>`;
    const deployEventDrivenDaemonsStatusLink = `${getStatusIcon(deployEventDrivenDaemonsResult)} <${findJobUrl('deploy_event_driven_daemons')}|Deploy event-driven daemons>`;
    const integrationTestsStatusLink = `${getStatusIcon(integrationTestsResult)} <${findJobUrl('integration_tests')}|Integration tests>`;
    // Prefer the Playwright link scoped to this release (Currents resolves the exact run by build
    // ID), falling back to the project dashboard.
    const currentsRunLink = currentsRunUrl || CURRENTS_PLAYWRIGHT_STAGING_RUNS_URL;
    const currentsRunLabel = currentsRunUrl ? 'run' : 'runs';
    const playwrightTestsStatusLink = `${getStatusIcon(playwrightTestsResult)} <${findJobUrl('playwright_tests')}|Playwright tests> (<${currentsRunLink}|${currentsRunLabel}>)`;
    const eventDrivenDaemonsTestsStatusLink = `${getStatusIcon(eventDrivenDaemonsTestsResult)} <${findJobUrl('test_staging_event_driven_daemons')}|Event-driven daemons tests>`;

    const deployDutyTag = deployDutySlackId
        ? `<@${deployDutySlackId}> is on deploy duty :crossed_fingers:`
        : 'Who knows who is on deploy duty :shrug:';

    const onCallDutyTag = onCallDutySlackId ? `<@${onCallDutySlackId}> is on-call :pager:` : undefined;

    const qaDutyTag = qaDutySlackId ? `<@${qaDutySlackId}> is on QA duty :test_tube:` : undefined;

    const dutyTags = [deployDutyTag, onCallDutyTag].filter(Boolean).join('\\n');

    function createDeploySuccessMessage() {
        // QA duty is only relevant once the release is up for QA, so it is added to the success message only.
        const successDutyTags = [deployDutyTag, onCallDutyTag, qaDutyTag].filter(Boolean).join('\\n');

        const logsLinks = `<${MEZMO_STAGING_ALL_VIEW}|Logs> (<${MEZMO_STAGING_ALL_ERRORS_VIEW}|errors only>)`;
        const dashboardLinks = `<${GRAFANA_STAGING_DASHBOARD_API}|API error rate> | <${GRAFANA_STAGING_DASHBOARD_CONSOLE}|Console backend error rate>`;

        // The prTitle needs to be properly escaped, and as JSON.stringify wraps the whole string in "", we need to
        // escape the whole context string.
        const context = JSON.stringify(
            `${prTitle} | ${integrationTestsStatusLink} | ${playwrightTestsStatusLink} | ${eventDrivenDaemonsTestsStatusLink} | ${logsLinks} | ${dashboardLinks}`,
        );

        const { usersToTag, unmappedAuthors } = changelogAuthors.reduce(
            (acc, author) => {
                if (author.email?.includes('apify-service-account')) {
                    return acc;
                }

                // Tag the user, if `slackId` available.
                if (author.slackId) {
                    acc.usersToTag.push(author.slackId);

                    return acc;
                }

                // Mention their email, if no `slackId`.
                acc.unmappedAuthors.push(author.email ?? '<UNKNOWN>');

                return acc;
            },
            { unmappedAuthors: /** @type {string[]} */ ([]), usersToTag: /** @type {string[]} */ ([]) },
        );

        const taggedUsers = usersToTag.map((slackId) => `<@${slackId}>`).join(' ');

        // Contributors we could not map to an org member (e.g. they have no org email on their GitHub
        // account). Listed by email in a separate section so a human can reach out to them manually.
        const unmappedAuthorEmails = unmappedAuthors.join(', ');

        const unmappedAuthorsSection = unmappedAuthorEmails
            ? `,
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Could not match these contributors to an org member: ${unmappedAuthorEmails}"
                    }
                }`
            : '';

        return `{
            "unfurl_links": false,
            "unfurl_media": false,
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":rocket:  New release ready on staging  :rocket:"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "text": ${context},
                            "type": "mrkdwn"
                        }
                    ]
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Please review your changes and approve the release PR."
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "${taggedUsers} <!subteam^${QA_SLACK_GROUP_ID}> :eyes:"
                    }
                }${unmappedAuthorsSection},
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "${successDutyTags}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Open release PR"
                            },
                            "url": "${prUrl}"
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Open staging Console"
                            },
                            "url": "https://console-securitybyobscurity.apify.com"
                        }
                    ]
                }
            ]
        }`;
    }

    function createDeployFailureMessage() {
        return `{
            "unfurl_links": false,
            "unfurl_media": false,
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":warning:  Deploy to staging failed  :warning:"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "text": ${JSON.stringify(prTitle)},
                            "type": "mrkdwn"
                        }
                    ]
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": " *Status*: \\n\\n ${[buildStatusLink, deployStatusLink, deployEventDrivenDaemonsStatusLink].join('\\n')}"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "${dutyTags}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Open release PR"
                            },
                            "url": "${prUrl}"
                        }
                    ]
                }
            ]
        }`;
    }

    function createDeployUpdateMessage() {
        return `{
            "thread_ts": "${slackThreadId}",
            "text": ":gear: Deploy to staging finished",
            "unfurl_links": false,
            "unfurl_media": false,
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*:gear: Deploy to staging finished*"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "${buildStatusLink}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "${deployStatusLink}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "${deployEventDrivenDaemonsStatusLink}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "${integrationTestsStatusLink}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "${playwrightTestsStatusLink}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "${eventDrivenDaemonsTestsStatusLink}"
                        }
                    ]
                }
            ]
        }`;
    }

    // Post to an existing thread.
    if (slackThreadId) {
        return {
            message: createDeployUpdateMessage(),
            shouldStoreThreadId: false, // No need to store the ID; it is already stored.
        };
    }

    // Start a new thread.
    return {
        message: isDeploySuccessful ? createDeploySuccessMessage() : createDeployFailureMessage(),
        // If the deploy is successful, we indicate that the thread ID should be stored, so that we avoid
        // double-posting, and instead start replying with updates to the new thread.
        shouldStoreThreadId: isDeploySuccessful,
    };
}
