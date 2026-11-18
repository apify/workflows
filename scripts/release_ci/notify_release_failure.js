import { assertDefined } from './common.js';
import { fetchPagerDutyScheduleUser } from './fetch_pagerduty_schedule.js';
import { fetchSlackReleaseThreadId } from './fetch_slack_thread_id.js';
import { sendSlackMessage } from './notify_pending_reviewers_in_release_prs.js';

/**
 * Sends a notification to the release thread when a release workflow step fails.
 *
 * @param {{
 *      core: import('@actions/core'),
 *      pullNumber: number,
 *      pagerDutyApiKey: string,
 *      pagerDutyScheduleId: string,
 *      slackApiToken: string,
 *      privilegedGithubToken: string,
 *      apifyApiToken: string,
 *      slackThreadsStoreId: string,
 *      slackChannelId: string,
 *      workflowRunUrl?: string,
 *      failureType?: string,
 *      actionMessage?: string,
 * }} opts
 */
export async function notifyReleaseFailure(opts) {
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
        core,
        pullNumber,
        apifyApiToken,
        pagerDutyApiKey,
        pagerDutyScheduleId,
        privilegedGithubToken,
        slackApiToken,
        slackThreadsStoreId,
        slackChannelId,
        workflowRunUrl,
        failureType = 'Release workflow step',
        actionMessage = 'Please check the workflow and resolve the failure.',
    } = opts;

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
            apifyRecordKey: String(pullNumber),
        }),
    ]);

    if (!slackThreadId) {
        core.warning('Could not fetch release PR slack thread id. Not sending failure notification');

        return;
    }

    if (!deployDuty) {
        core.warning('Deploy duty not found!');
    } else {
        core.info(`Sending ${failureType} failure notification. Deploy duty = "${deployDuty.email}"`);
    }

    const deployDutyMention = deployDuty?.slackId ? ` <@${deployDuty.slackId}>` : '';
    const workflowLink = workflowRunUrl ? `\nWorkflow run: ${workflowRunUrl}` : '';
    const message = `:warning: ${failureType} failed!${deployDutyMention}\n\n${actionMessage}${workflowLink}`;

    await sendSlackMessage({
        core,
        message,
        slackThreadId,
        slackApiToken,
        slackChannelId,
    });
}
