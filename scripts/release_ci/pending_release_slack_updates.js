/**
 * A single deploy or test step of the staging release, displayed in the Slack messages.
 *
 * `jobPrefix` identifies the job in the list of workflow jobs fetched from GitHub API: the job is matched when its
 * name is equal to the prefix, or starts with `<prefix> /` (which is how jobs of called reusable workflows are named).
 *
 * @typedef {{
 *      label: string,
 *      result?: string,
 *      jobPrefix: string,
 *      extraLink?: { label: string, url: string },
 * }} ReleaseCheck
 */

/**
 * @typedef {{ label: string, url: string }} ReleaseLink
 */

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
 *      deployChecks: ReleaseCheck[],
 *      testChecks?: ReleaseCheck[],
 *      slackThreadId?: string,
 *      prTitle: string,
 *      prUrl: string,
 *      changelogAuthors: ChangelogAuthor[],
 *      jobs: { jobs: { name: string, conclusion?: string, url: string }[] },
 *      deployDutySlackId?: string,
 *      onCallDutySlackId?: string,
 *      qaDutySlackId?: string,
 *      qaSlackGroupId?: string,
 *      contextLinks?: ReleaseLink[],
 *      buttons?: ReleaseLink[],
 *      doRickRoll?: boolean,
 * }} opts
 *
 * - `deployChecks` decide whether the deploy succeeded (all must be `success`); they are listed in the failure message.
 * - `testChecks` are only listed once the release is deployed.
 * - `contextLinks` are appended to the context line of the success message, `buttons` to its action buttons.
 *
 * @returns {{shouldStoreThreadId: boolean, message: string}}
 */
export function createSlackUpdate({
    deployChecks,
    testChecks = [],
    slackThreadId,
    prTitle,
    prUrl,
    changelogAuthors,
    jobs, // a list of jobs fetched using GitHub API
    deployDutySlackId,
    onCallDutySlackId,
    qaDutySlackId,
    qaSlackGroupId,
    contextLinks = [],
    buttons = [],
    doRickRoll = true,
}) {
    const isDeploySuccessful = deployChecks.every((check) => check.result === 'success');

    // Escapes a value to be embedded into a JSON string literal built by the templates below.
    /** @param {string} value */
    const esc = (value) => JSON.stringify(value).slice(1, -1);

    // Finding the job URL is tricky. For example, there is no "build" job as building is a nested workflow which
    // results in a bunch of jobs returned, such as "build / get_values / get_values". We'll find the matching job by
    // prefix, and then prefer the first failing job.
    /**
     * @param {string} workflowPrefix
     */
    function findJobUrl(workflowPrefix) {
        const matchingJobs = jobs.jobs.filter(
            (job) => job.name === workflowPrefix || job.name.startsWith(`${workflowPrefix} /`),
        );

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

    /** @param {ReleaseCheck} check */
    function getCheckLink(check) {
        const extraLink = check.extraLink ? ` (<${check.extraLink.url}|${check.extraLink.label}>)` : '';

        return `${getStatusIcon(check.result)} <${findJobUrl(check.jobPrefix)}|${check.label}>${extraLink}`;
    }

    const deployCheckLinks = deployChecks.map(getCheckLink);
    const testCheckLinks = testChecks.map(getCheckLink);

    const deployDutyTag = deployDutySlackId
        ? `<@${deployDutySlackId}> is on deploy duty :crossed_fingers:`
        : 'Who knows who is on deploy duty :shrug:';

    const onCallDutyTag = onCallDutySlackId ? `<@${onCallDutySlackId}> is on-call :pager:` : undefined;

    const qaDutyTag = qaDutySlackId ? `<@${qaDutySlackId}> is on QA duty :test_tube:` : undefined;

    const dutyTags = [deployDutyTag, onCallDutyTag].filter(Boolean).join('\\n');

    function createDeploySuccessMessage() {
        // QA duty is only relevant once the release is up for QA, so it is added to the success message only.
        const successDutyTags = [deployDutyTag, onCallDutyTag, qaDutyTag].filter(Boolean).join('\\n');

        const extraContextLinks = contextLinks.map((link) => `<${link.url}|${link.label}>`);

        // The prTitle needs to be properly escaped, and as JSON.stringify wraps the whole string in "", we need to
        // escape the whole context string.
        const context = JSON.stringify(
            [prTitle, ...testCheckLinks, ...extraContextLinks].join(' | '),
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

        // The QA team is tagged only if its Slack group is configured.
        const reviewersMention = [taggedUsers, qaSlackGroupId ? `<!subteam^${qaSlackGroupId}>` : '', ':eyes:']
            .filter(Boolean)
            .join(' ');

        const extraButtons = buttons
            .map(
                (button) => `,
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": ${JSON.stringify(button.label)}
                            },
                            "url": ${JSON.stringify(button.url)}
                        }`,
            )
            .join('');

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
                        "text": "${esc(reviewersMention)}"
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
                        }${extraButtons}
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
                        "text": " *Status*: \\n\\n ${esc(deployCheckLinks.join('\n'))}"
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
${[...deployCheckLinks, ...testCheckLinks]
    .map(
        (link) => `                        {
                            "type": "mrkdwn",
                            "text": "${esc(link)}"
                        }`,
    )
    .join(',\n')}
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
