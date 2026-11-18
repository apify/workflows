import { assertDefined, fetchSlackIdByEmail, fetchGithubOrgUsers } from './common.js';
import { fetchSlackReleaseThreadId } from './fetch_slack_thread_id.js';
import { QA_SLACK_GROUP_ID } from './pending_release_slack_updates.js';

const REVIEW_STATE_APPROVED = 'APPROVED';

/**
 * @param {{
 *      github: import('@octokit/rest').Octokit,
 *      pullNumber: number,
 *      repo?: string,
 *      repoOwner?: string,
 * }} opts
 *
 * @return {Promise<{ users: string[], teams: string[] }>}
 */
export async function fetchPendingReviewers(opts) {
    assertDefined(opts, 'github');
    assertDefined(opts, 'pullNumber');

    const { github: octokit, pullNumber, repo = 'apify-core', repoOwner = 'apify' } = opts;

    const prFilter = {
        repo,
        owner: repoOwner,
        pull_number: pullNumber,
    };

    // 1. fetch pending reviewers and reviews which are not in 'APPROVED' state
    const [
        { data: submittedReviews },
        {
            data: { users: requestedReviewers, teams: pendingTeamReviews },
        },
    ] = await Promise.all([
        octokit.rest.pulls.listReviews(prFilter),
        octokit.rest.pulls.listRequestedReviewers(prFilter),
    ]);

    // 2. collect Github user logins
    const pendingLogins = new Set();
    for (const review of submittedReviews) {
        if (!review.user) {
            continue;
        }

        // **The reviews returned from the Github API are in chronological order.**
        // -> If the reviewer has previously submitted a non-approving review
        //    and after that they approved, they should be removed from the `pendingLogins`
        //    with the `.delete` call.
        //
        // However, if they only submitted a non-approving review, they should
        // be counted as pending.
        if (review.state !== REVIEW_STATE_APPROVED) {
            pendingLogins.add(review.user.login);
        } else {
            pendingLogins.delete(review.user.login);
        }
    }

    for (const requestedReviewer of requestedReviewers) {
        pendingLogins.add(requestedReviewer.login);
    }

    return {
        users: Array.from(pendingLogins),
        teams: pendingTeamReviews.map((team) => team.slug),
    };
}

/**
 * @param {{
 *      core: import('@actions/core'),
 *      github: import('@octokit/rest').Octokit,
 *      privilegedGithubToken: string,
 *      slackApiToken: string,
 *      pullNumber: number,
 *      repo?: string,
 *      repoOwner?: string,
 * }} opts
 *
 * @return {Promise<{ users: string[], teams: string[] }>}
 */
async function fetchPendingReviewersSlackIds(opts) {
    assertDefined(opts, 'core');
    assertDefined(opts, 'github');
    assertDefined(opts, 'privilegedGithubToken');
    assertDefined(opts, 'slackApiToken');

    assertDefined(opts, 'pullNumber');

    const {
        core,
        github: octokit,
        privilegedGithubToken,
        slackApiToken,
        pullNumber,
        repo = 'apify-core',
        repoOwner = 'apify',
    } = opts;

    const { users: pendingLogins, teams } = await fetchPendingReviewers({
        github: octokit,
        pullNumber,
        repo,
        repoOwner,
    });

    if (pendingLogins.length > 0) {
        core.info(`PR(${pullNumber}): there are pending reviews from users [${pendingLogins.join(',')}]`);
    } else {
        core.info(`PR(${pullNumber}): no pending reviews found`);

        return { users: [], teams: [] };
    }

    // 3. get @apify.com emails for the collected Github logins
    const orgUsers = await fetchGithubOrgUsers(privilegedGithubToken);

    const pendingReviewerEmails = new Set();
    for (const orgUser of orgUsers) {
        if (!pendingLogins.includes(orgUser.login)) {
            continue;
        }

        const email = orgUser.organizationVerifiedDomainEmails.at(0);
        if (!email) {
            continue;
        }

        pendingReviewerEmails.add(email);
    }

    core.info(
        `PR(${pullNumber}): resolved emails for users with pending release reviews: [${Array.from(pendingReviewerEmails).join(',')}]`,
    );

    // 4. get Slack IDs for @apify.com emails, so that we can tag them in a message
    // I would expect this to get rate limitted.
    // (If it becomes a problem, we could use the users.list API and filter by the user email in code.)

    /** @type {string[]} */
    // @ts-expect-error
    const slackUserIds = (
        await Promise.all(
            Array.from(pendingReviewerEmails).map(async (email) => fetchSlackIdByEmail(email, slackApiToken)),
        )
    ).filter(Boolean);

    /** @type {string[]} */
    const teamIds = [];

    // 5. Also tag the QA team, if there is still a pending review.
    if (teams.includes('qa')) {
        teamIds.push(QA_SLACK_GROUP_ID);
    }

    return { users: slackUserIds, teams: teamIds };
}

/**
 * @param {{
 *      core: import('@actions/core'),
 *      slackApiToken: string,
 *      slackChannelId: string,
 *      slackThreadId: string,
 *      message: string,
 * }} opts
 */
export async function sendSlackMessage(opts) {
    assertDefined(opts, 'core');
    assertDefined(opts, 'message');
    assertDefined(opts, 'slackApiToken');
    assertDefined(opts, 'slackChannelId');
    assertDefined(opts, 'slackThreadId');

    const { core, message, slackApiToken, slackChannelId, slackThreadId } = opts;

    try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${slackApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: slackChannelId,
                thread_ts: slackThreadId,
                text: message,
            }),
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        return await response.json();
    } catch (e) {
        core.error(`Failed to send Slack message: ${String(e)}`);
    }

    return null;
}

/**
 * @param {{
 *      github: import('@octokit/rest').Octokit,
 *      core: import('@actions/core'),
 *      privilegedGithubToken: string,
 *      slackApiToken: string,
 *      slackChannelId: string,
 *      apifyApiToken: string,
 *      apifyStoreId: string,
 *      repoOwner?: string,
 *      repo?: string,
 * }} opts
 */
export async function notifyPendingReviewersInReleasePRs(opts) {
    assertDefined(opts, 'github');
    assertDefined(opts, 'core');
    assertDefined(opts, 'privilegedGithubToken');
    assertDefined(opts, 'slackApiToken');
    assertDefined(opts, 'slackChannelId');

    assertDefined(opts, 'apifyApiToken');
    assertDefined(opts, 'apifyStoreId');

    const {
        github: octokit,
        core,
        privilegedGithubToken,
        slackApiToken,
        slackChannelId,
        apifyApiToken,
        apifyStoreId,
        repoOwner = 'apify',
        repo = 'apify-core',
    } = opts;

    // Search for currently opened release PRs.
    const { data: releasePRCandidates } = await octokit.rest.pulls.list({
        owner: repoOwner,
        repo,
        state: 'open', // only those, that are currently open
        base: 'master', // PRs to `master` branch
    });

    // Expect the branch name for releases to follow the format of:
    //  `release/v0.1234.5`
    const releasePRs = releasePRCandidates.filter((pr) => {
        const targetBranchPrefix = pr.head.ref.split('/').at(0);

        return targetBranchPrefix === 'release';
    });

    if (releasePRs.length === 0) {
        core.info('No release PRs found, skipping notifications.');

        return;
    }

    for (const release of releasePRs) {
        const { users, teams } = await fetchPendingReviewersSlackIds({
            core,
            github: octokit,
            repo,
            repoOwner,
            privilegedGithubToken,
            slackApiToken,
            pullNumber: release.number,
        });

        core.info(`Slack IDs of users reviewers of PR "${release.title}": [${users.join(',')}]`);
        if (users.length === 0 && teams.length === 0) {
            core.info(`Release PR "${release.title}" has no pending reviews. Skipping notification.`);

            continue;
        }

        const threadId = await fetchSlackReleaseThreadId({
            apifyApiToken,
            apifyStoreId,
            apifyRecordKey: String(release.number),
        });

        if (!threadId) {
            core.info(
                `Slack thread for release "${release.title}" not found. (Wasn't created yet?) Skipping notification.`,
            );

            continue;
        }

        const userTags = users.map((id) => `<@${id}>`);

        // https://docs.slack.dev/messaging/formatting-message-text/#mentioning-groups
        const teamTags = teams.map((id) => `<!subteam^${id}>`);

        let message = `Waiting for your review :)\n${userTags.join(' ')} ${teamTags.join(' ')}`;

        // We notify at 11:00, 13:00, 15:00, 16:00 Prague time (CET/CEST).
        // If it's 15:00 or later, we can add a note to revert changes to not block the release.
        // The check for 13:00 UTC corresponds to 14:00 CET or 15:00 CEST, so it works out for the current schedule.
        const now = new Date();
        if (now.getUTCHours() >= 13) {
            message +=
                "\n\nIf you think you won't make it in time, please consider reverting your changes to avoid blocking the release.";
        }

        core.info(
            JSON.stringify({
                message,
                slackChannelId,
                threadId,
            }),
        );

        void sendSlackMessage({
            core,
            message,
            slackApiToken,
            slackChannelId,
            slackThreadId: threadId,
        });
    }
}
