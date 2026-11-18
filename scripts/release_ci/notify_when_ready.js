import { assertDefined, getSlackThreadRecordKey } from './common.js';
import { fetchPagerDutyScheduleUser } from './fetch_pagerduty_schedule.js';
import { fetchSlackReleaseThreadId } from './fetch_slack_thread_id.js';
import { fetchPendingReviewers, sendSlackMessage } from './notify_pending_reviewers_in_release_prs.js';

/**
 * @param {{
 *      github: import('@octokit/rest').Octokit,
 *      core: import('@actions/core'),
 *      pullNumber: number,
 *      pagerDutyApiKey: string,
 *      pagerDutyScheduleId: string,
 *      slackApiToken: string,
 *      privilegedGithubToken: string,
 *      apifyApiToken: string,
 *      slackThreadsStoreId: string,
 *      slackChannelId: string,
 *      repo?: string,
 *      repoOwner?: string,
 *      slackThreadRecordKeyPrefix?: string,
 * }} opts
 */
export async function notifyWhenReadyToMerge(opts) {
    assertDefined(opts, 'github');
    assertDefined(opts, 'core');
    assertDefined(opts, 'pullNumber');
    assertDefined(opts, 'apifyApiToken');
    assertDefined(opts, 'pagerDutyApiKey');
    assertDefined(opts, 'pagerDutyScheduleId');
    assertDefined(opts, 'privilegedGithubToken');
    assertDefined(opts, 'slackApiToken');
    assertDefined(opts, 'slackThreadsStoreId');
    assertDefined(opts, 'slackChannelId');

    const {
        github,
        core,
        pullNumber,
        apifyApiToken,
        pagerDutyApiKey,
        pagerDutyScheduleId,
        privilegedGithubToken,
        slackApiToken,
        slackThreadsStoreId,
        slackChannelId,
        repo,
        repoOwner,
        slackThreadRecordKeyPrefix,
    } = opts;

    const { users, teams } = await fetchPendingReviewers({
        github,
        pullNumber,
        repo,
        repoOwner,
    });

    if (users.length > 0 || teams.length > 0) {
        core.info(
            `There are still pending reviews on the release PR "${JSON.stringify({ users, teams })}". Skipping notification.`,
        );

        return;
    }

    const [deployDuty, slackThreadId] = await Promise.all([
        fetchPagerDutyScheduleUser({
            core,
            pagerDutyApiKey,
            scheduleId: pagerDutyScheduleId,
            slackApiToken,
            githubToken: privilegedGithubToken,
        }),
        fetchSlackReleaseThreadId({
            apifyApiToken,
            apifyStoreId: slackThreadsStoreId,
            apifyRecordKey: getSlackThreadRecordKey(pullNumber, slackThreadRecordKeyPrefix),
        }),
    ]);

    if (!slackThreadId) {
        core.warning('Could not fetch release PR slack thread id. Not sending notification');

        return;
    }

    if (!deployDuty) {
        core.warning('Deploy duty not found!');
    } else {
        core.info(`Sending notification - release PR is ready to be released. Deploy duty = "${deployDuty.email}"`);
    }

    await sendSlackMessage({
        core,
        message: `Release PR ready to be merged! <@${deployDuty?.slackId ?? ''}>\n\n:warning: Do not release around the full hour - check the current load in Grafana and only merge once it drops to normal levels.`,
        slackThreadId,
        slackApiToken,
        slackChannelId,
    });
}
